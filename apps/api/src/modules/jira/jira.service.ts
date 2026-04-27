/* eslint-disable prettier/prettier */
import axios from "axios";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../core/database/database.service";

@Injectable()
export class JiraService {
    constructor(private db: DatabaseService) { }

    async exchange(code: string) {
        const res = await axios.post("https://auth.atlassian.com/oauth/token", {
            grant_type: "authorization_code",
            client_id: process.env.ATLASSIAN_CLIENT_ID,
            client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
            code,
            redirect_uri: process.env.ATLASSIAN_REDIRECT_URI,
        });

        const accessToken = res.data.access_token;
        if (!accessToken) throw new Error("Jira OAuth failed — no access token returned");

        const cloud = await axios.get(
            "https://api.atlassian.com/oauth/token/accessible-resources",
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        const cloudId = cloud.data?.[0]?.id;
        if (!cloudId) throw new Error("Jira OAuth failed — could not retrieve cloud ID");

        let accountName = null;
        let accountEmail = null;
        let avatarUrl = null;
        try {
            const me = await axios.get(
                `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            accountName = me.data.displayName ?? null;
            accountEmail = me.data.emailAddress ?? null;
            avatarUrl = me.data.avatarUrls?.["48x48"] ?? null;
        } catch (_) { /* non-fatal */ }

        const existing = await this.db.get(
            `SELECT id FROM connections WHERE provider = 'jira' AND cloud_id = ?`,
            [cloudId],
        );

        if (existing) {
            await this.db.run(
                `UPDATE connections SET
                    keychain_ref  = ?,
                    account_name  = ?,
                    account_email = ?,
                    avatar_url    = ?
                 WHERE provider = 'jira' AND cloud_id = ?`,
                [accessToken, accountName, accountEmail, avatarUrl, cloudId],
            );
        } else {
            await this.db.run(
                `INSERT INTO connections
                    (provider, keychain_ref, cloud_id, account_name, account_email, avatar_url)
                 VALUES ('jira', ?, ?, ?, ?, ?)`,
                [accessToken, cloudId, accountName, accountEmail, avatarUrl],
            );
        }
    }

    async getAccounts() {
        return this.db.all(
            `SELECT id, cloud_id, account_name, account_email, avatar_url, created_at
             FROM connections WHERE provider = ? ORDER BY created_at ASC`,
            ["jira"],
        );
    }

    async disconnectAccount(id: number) {
        await this.db.run(
            `DELETE FROM connections WHERE provider = ? AND id = ?`,
            ["jira", id],
        );
    }

    async getConnection(accountId?: number) {
        const row = accountId
            ? await this.db.get(
                `SELECT * FROM connections WHERE provider = ? AND id = ?`,
                ["jira", accountId],
            )
            : await this.db.get(
                `SELECT * FROM connections WHERE provider = ? ORDER BY created_at ASC LIMIT 1`,
                ["jira"],
            );
        if (!row) throw new Error("Jira not connected");
        return row;
    }

    async get(path: string, accountId?: number) {
        const conn = await this.getConnection(accountId);
        const url = `https://api.atlassian.com/ex/jira/${conn.cloud_id}${path}`;
        try {
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${conn.keychain_ref}` },
            });
            return res.data;
        } catch (err: any) {
            if (err?.response?.status === 401) {
                await this.db.run(
                    `DELETE FROM connections WHERE provider = ? AND id = ?`,
                    ["jira", conn.id],
                );
                throw new Error("Jira token expired. Please reconnect this account.");
            }
            throw err;
        }
    }

    /**
     * Fetch paginated stories for a board.
     * Optional status / priority filters are injected into the JQL.
     */
    async stories(
        accountId?: number,
        startAt = 0,
        maxResults = 20,
        board?: string,
        status?: string,   // exact Jira status name, e.g. "In Progress"
        priority?: string,   // exact Jira priority name, e.g. "High"
    ) {
        const clauses: string[] = ["assignee = currentUser()"];

        if (board) clauses.push(`project = "${board}"`);
        if (status) clauses.push(`status = "${status}"`);
        if (priority) clauses.push(`priority = "${priority}"`);

        const jql = clauses.join(" AND ") + " ORDER BY updated DESC";

        const params = new URLSearchParams({
            jql,
            fields: "summary,status,priority,assignee,description",
            startAt: String(startAt),
            maxResults: String(maxResults),
        });
        return this.get(`/rest/api/3/search/jql?${params}`, accountId);
    }

    async story(key: string, accountId?: number) {
        return this.get(
            `/rest/api/3/issue/${key}?fields=summary,status,priority,assignee,description`,
            accountId,
        );
    }

    /**
     * Dashboard metrics — counts by status and priority for a board.
     */
    async metrics(board: string, accountId?: number) {
        const params = new URLSearchParams({
            jql: `project = "${board}" AND assignee = currentUser() ORDER BY updated DESC`,
            fields: "summary,status,priority",
            startAt: "0",
            maxResults: "200",
        });

        const data = await this.get(`/rest/api/3/search/jql?${params}`, accountId);
        const issues: any[] = data.issues ?? [];

        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};

        for (const issue of issues) {
            const s = issue.fields?.status?.name ?? "Unknown";
            const p = issue.fields?.priority?.name ?? "None";
            byStatus[s] = (byStatus[s] ?? 0) + 1;
            byPriority[p] = (byPriority[p] ?? 0) + 1;
        }

        return { total: issues.length, byStatus, byPriority };
    }

    async status() {
        const rows = await this.db.all(
            `SELECT id FROM connections WHERE provider = ?`, ["jira"]
        );
        return { connected: rows.length > 0, count: rows.length };
    }

    async boardsFromStories(accountId?: number) {
        const data = await this.stories(accountId, 0, 100);
        const boards = [...new Set(
            (data.issues ?? []).map((i: any) => i.key.split("-")[0])
        )];
        return { boards };
    }
}
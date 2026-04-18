/* eslint-disable prettier/prettier */
import axios               from "axios";
import { Injectable }      from "@nestjs/common";
import { DatabaseService } from "../../core/database/database.service";

@Injectable()
export class JiraService {
    constructor(private db: DatabaseService) {}

    async exchange(code: string) {
        const res = await axios.post("https://auth.atlassian.com/oauth/token", {
            grant_type:    "authorization_code",
            client_id:     process.env.ATLASSIAN_CLIENT_ID,
            client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
            code,
            redirect_uri:  process.env.ATLASSIAN_REDIRECT_URI,
        });

        const accessToken = res.data.access_token;

        // Get accessible cloud resources
        const cloud = await axios.get(
            "https://api.atlassian.com/oauth/token/accessible-resources",
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const cloudId = cloud.data[0].id;

        // Fetch the user's profile to store display info
        let accountName  = null;
        let accountEmail = null;
        let avatarUrl    = null;
        try {
            const me = await axios.get(
                `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            accountName  = me.data.displayName  ?? null;
            accountEmail = me.data.emailAddress ?? null;
            avatarUrl    = me.data.avatarUrls?.["48x48"] ?? null;
        } catch (_) { /* non-fatal */ }

        // Upsert by (provider, cloud_id) — allows multiple accounts
        await this.db.run(
            `INSERT INTO connections (provider, keychain_ref, cloud_id, account_name, account_email, avatar_url)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(provider, cloud_id) DO UPDATE SET
                 keychain_ref  = excluded.keychain_ref,
                 account_name  = excluded.account_name,
                 account_email = excluded.account_email,
                 avatar_url    = excluded.avatar_url`,
            ["jira", accessToken, cloudId, accountName, accountEmail, avatarUrl],
        );
    }

    /** Return all connected Jira accounts */
    async getAccounts() {
        return this.db.all(
            `SELECT id, cloud_id, account_name, account_email, avatar_url, created_at
             FROM connections WHERE provider = ? ORDER BY created_at ASC`,
            ["jira"],
        );
    }

    /** Disconnect a specific account by its DB row id */
    async disconnectAccount(id: number) {
        await this.db.run(
            `DELETE FROM connections WHERE provider = ? AND id = ?`,
            ["jira", id],
        );
    }

    /** Get a single connection row — by id (specific account) or the first one */
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
        const url  = `https://api.atlassian.com/ex/jira/${conn.cloud_id}${path}`;
        try {
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${conn.keychain_ref}` },
            });
            return res.data;
        } catch (err: any) {
            if (err?.response?.status === 401) {
                // Token expired — remove this specific connection
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
     * Fetch paginated stories for a given account.
     * @param accountId  DB row id of the connection (optional — defaults to first)
     * @param startAt    0-based offset for Jira pagination
     * @param maxResults page size (max 50 recommended)
     */
    async stories(accountId?: number, startAt = 0, maxResults = 20) {
        const params = new URLSearchParams({
            jql:        "assignee=currentUser() ORDER BY updated DESC",
            fields:     "summary,status,priority,assignee,description",
            startAt:    String(startAt),
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

    async status() {
        const rows = await this.db.all(
            `SELECT id FROM connections WHERE provider = ?`, ["jira"]
        );
        return { connected: rows.length > 0, count: rows.length };
    }

    // Get all boards for an account — used in workspace creation step 1
    async boards(accountId?: number) {
        // Jira agile API returns all boards the user has access to
        return this.get(
            `/rest/agile/1.0/board?maxResults=50`,
            accountId,
        );
    }

    // Get unique board keys from stories already loaded
    // This is a fallback if agile scope is not available
    async boardsFromStories(accountId?: number) {
        const data = await this.stories(accountId, 0, 100);
        const boards = [...new Set(
            (data.issues ?? []).map((i: any) => i.key.split("-")[0])
        )];
        return { boards };
    }
}
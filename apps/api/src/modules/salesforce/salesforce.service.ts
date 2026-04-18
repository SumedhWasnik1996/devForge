/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import axios from "axios";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../core/database/database.service";
import { generatePkce, salesforceAuthUrl, PkceChallenge } from "./salesforce.oauth";

const SF_API_VERSION = "v59.0";

@Injectable()
export class SalesforceService {
    constructor(private db: DatabaseService) { }

    // In-memory store: state → { verifier, sandbox }
    // Keyed by a random state param so concurrent auth attempts don't collide
    private pendingPkce = new Map<string, { verifier: string; sandbox: boolean }>();

    // ── OAuth start — generate PKCE and return the redirect URL ─────────────

    startAuth(sandbox = false): { url: string; state: string } {
        const pkce = generatePkce();
        const state = pkce.verifier.slice(0, 16); // use part of verifier as state

        this.pendingPkce.set(state, { verifier: pkce.verifier, sandbox });

        // Clean up stale entries after 10 minutes
        setTimeout(() => this.pendingPkce.delete(state), 10 * 60 * 1000);

        const url = salesforceAuthUrl(
            process.env.SALESFORCE_CLIENT_ID!,
            process.env.SALESFORCE_REDIRECT_URI!,
            pkce.challenge,
            sandbox,
        );

        return { url, state };
    }

    // ── OAuth callback — exchange code using stored verifier ─────────────────

    async exchange(code: string, state: string) {
        const pending = this.pendingPkce.get(state);
        if (!pending) throw new Error("Invalid or expired OAuth state. Please try connecting again.");

        this.pendingPkce.delete(state);

        const base = pending.sandbox
            ? "https://test.salesforce.com"
            : "https://login.salesforce.com";

        const tokenRes = await axios.post(
            `${base}/services/oauth2/token`,
            new URLSearchParams({
                grant_type: "authorization_code",
                client_id: process.env.SALESFORCE_CLIENT_ID!,
                client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
                redirect_uri: process.env.SALESFORCE_REDIRECT_URI!,
                code,
                code_verifier: pending.verifier,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
        );

        const { access_token, refresh_token, instance_url, id: identityUrl } = tokenRes.data;

        // Fetch user identity
        let accountName = null;
        let accountEmail = null;
        let avatarUrl = null;
        let orgId = null;

        try {
            const identityRes = await axios.get(identityUrl, {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            accountName = identityRes.data.display_name ?? null;
            accountEmail = identityRes.data.email ?? null;
            avatarUrl = identityRes.data.photos?.thumbnail ?? null;
            orgId = identityRes.data.organization_id ?? null;
        } catch (_) { /* non-fatal */ }

        await this.db.run(
            `INSERT INTO connections
                (provider, keychain_ref, refresh_token, cloud_id, instance_url,
                 account_name, account_email, avatar_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(provider, cloud_id) DO UPDATE SET
                 keychain_ref  = excluded.keychain_ref,
                 refresh_token = excluded.refresh_token,
                 instance_url  = excluded.instance_url,
                 account_name  = excluded.account_name,
                 account_email = excluded.account_email,
                 avatar_url    = excluded.avatar_url`,
            ["salesforce", access_token, refresh_token ?? null, orgId,
                instance_url, accountName, accountEmail, avatarUrl],
        );
    }

    // ── Token refresh ─────────────────────────────────────────────────────────

    private async refreshToken(conn: any): Promise<string> {
        if (!conn.refresh_token) throw new Error("No refresh token stored");

        const isSandbox = conn.instance_url?.includes("sandbox") ||
            conn.instance_url?.includes("test.");
        const base = isSandbox
            ? "https://test.salesforce.com"
            : "https://login.salesforce.com";

        const res = await axios.post(
            `${base}/services/oauth2/token`,
            new URLSearchParams({
                grant_type: "refresh_token",
                client_id: process.env.SALESFORCE_CLIENT_ID!,
                client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
                refresh_token: conn.refresh_token,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
        );

        const newToken = res.data.access_token;
        await this.db.run(
            `UPDATE connections SET keychain_ref = ? WHERE id = ?`,
            [newToken, conn.id],
        );
        return newToken;
    }

    // ── Connection helpers ────────────────────────────────────────────────────

    async getAccounts() {
        return this.db.all(
            `SELECT id, cloud_id, instance_url, account_name, account_email, avatar_url, created_at
             FROM connections WHERE provider = ? ORDER BY created_at ASC`,
            ["salesforce"],
        );
    }

    async disconnectAccount(id: number) {
        await this.db.run(
            `DELETE FROM connections WHERE provider = ? AND id = ?`,
            ["salesforce", id],
        );
    }

    async getConnection(accountId?: number) {
        const row = accountId
            ? await this.db.get(
                `SELECT * FROM connections WHERE provider = ? AND id = ?`,
                ["salesforce", accountId],
            )
            : await this.db.get(
                `SELECT * FROM connections WHERE provider = ? ORDER BY created_at ASC LIMIT 1`,
                ["salesforce"],
            );
        if (!row) throw new Error("Salesforce not connected");
        return row;
    }

    // ── Authenticated HTTP — auto-refreshes on 401 ────────────────────────────

    async get(path: string, accountId?: number) {
        const conn = await this.getConnection(accountId);
        const url = `${conn.instance_url}${path}`;
        let token = conn.keychain_ref;

        try {
            return (await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })).data;
        } catch (err: any) {
            if (err?.response?.status === 401) {
                try {
                    token = await this.refreshToken(conn);
                    return (await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })).data;
                } catch {
                    await this.db.run(`DELETE FROM connections WHERE provider = ? AND id = ?`, ["salesforce", conn.id]);
                    throw new Error("Salesforce session expired. Please reconnect.");
                }
            }
            throw err;
        }
    }

    async post(path: string, body: any, accountId?: number) {
        const conn = await this.getConnection(accountId);
        const url = `${conn.instance_url}${path}`;
        let token = conn.keychain_ref;
        const headers = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

        try {
            return (await axios.post(url, body, { headers: headers(token) })).data;
        } catch (err: any) {
            if (err?.response?.status === 401) {
                try {
                    token = await this.refreshToken(conn);
                    return (await axios.post(url, body, { headers: headers(token) })).data;
                } catch {
                    await this.db.run(`DELETE FROM connections WHERE provider = ? AND id = ?`, ["salesforce", conn.id]);
                    throw new Error("Salesforce session expired. Please reconnect.");
                }
            }
            throw err;
        }
    }

    // ── Metadata helpers ──────────────────────────────────────────────────────

    sobjects(accountId?: number) {
        return this.get(`/services/data/${SF_API_VERSION}/sobjects`, accountId);
    }

    query(soql: string, accountId?: number) {
        return this.get(`/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`, accountId);
    }

    toolingQuery(soql: string, accountId?: number) {
        return this.get(`/services/data/${SF_API_VERSION}/tooling/query?q=${encodeURIComponent(soql)}`, accountId);
    }

    apexClasses(accountId?: number) {
        return this.toolingQuery("SELECT Id, Name, Status, LastModifiedDate FROM ApexClass ORDER BY Name", accountId);
    }

    customObjects(accountId?: number) {
        return this.toolingQuery("SELECT Id, DeveloperName, Label FROM CustomObject ORDER BY DeveloperName", accountId);
    }

    flows(accountId?: number) {
        return this.toolingQuery("SELECT Id, DeveloperName, Label, Status FROM Flow ORDER BY DeveloperName", accountId);
    }

    async status() {
        const rows = await this.db.all(`SELECT id FROM connections WHERE provider = ?`, ["salesforce"]);
        return { connected: rows.length > 0, count: rows.length };
    }
}
/* eslint-disable prettier/prettier */
import axios               from "axios";
import { Injectable }      from "@nestjs/common";
import { DatabaseService } from "../../core/database/database.service";

@Injectable()
export class GithubService {
    constructor(private db: DatabaseService) { }

    async exchange(code: string) {
        // 1. Exchange code for access token
        const tokenRes = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_REDIRECT_URI,
            },
            { headers: { Accept: "application/json" } },
        );

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error("GitHub OAuth failed — no access token returned");

        // 2. Fetch user profile
        const userRes = await axios.get("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
        });

        const { login, name, email, avatar_url, id: githubUserId } = userRes.data;

        // 3. Upsert by github user id (cloud_id reused as github_user_id)
        await this.db.run(
            `INSERT INTO connections
                (provider, keychain_ref, cloud_id, account_name, account_email, avatar_url)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(provider, cloud_id) DO UPDATE SET
                 keychain_ref  = excluded.keychain_ref,
                 account_name  = excluded.account_name,
                 account_email = excluded.account_email,
                 avatar_url    = excluded.avatar_url`,
            [
                "github",
                accessToken,
                String(githubUserId),
                name || login,
                email,
                avatar_url,
            ],
        );

        return { login };
    }

    async getAccounts() {
        return this.db.all(
            `SELECT id, cloud_id, account_name, account_email, avatar_url, created_at
             FROM connections WHERE provider = ? ORDER BY created_at ASC`,
            ["github"],
        );
    }

    async disconnectAccount(id: number) {
        await this.db.run(
            `DELETE FROM connections WHERE provider = ? AND id = ?`,
            ["github", id],
        );
    }

    async getConnection(accountId?: number) {
        const row = accountId
            ? await this.db.get(
                `SELECT * FROM connections WHERE provider = ? AND id = ?`,
                ["github", accountId],
            )
            : await this.db.get(
                `SELECT * FROM connections WHERE provider = ? ORDER BY created_at ASC LIMIT 1`,
                ["github"],
            );
        if (!row) throw new Error("GitHub not connected");
        return row;
    }

    /** Make an authenticated GET to the GitHub API */
    async get(path: string, accountId?: number) {
        const conn = await this.getConnection(accountId);
        const url = path.startsWith("https://") ? path : `https://api.github.com${path}`;
        try {
            const res = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${conn.keychain_ref}`,
                    Accept: "application/vnd.github+json",
                },
            });
            return res.data;
        } catch (err: any) {
            if (err?.response?.status === 401) {
                await this.db.run(
                    `DELETE FROM connections WHERE provider = ? AND id = ?`,
                    ["github", conn.id],
                );
                throw new Error("GitHub token expired. Please reconnect this account.");
            }
            throw err;
        }
    }

    async repos(accountId?: number, page = 1, perPage = 30) {
        return this.get(
            `/user/repos?affiliation=owner,collaborator&sort=pushed&per_page=${perPage}&page=${page}`,
            accountId,
        );
    }

    async status() {
        const rows = await this.db.all(
            `SELECT id FROM connections WHERE provider = ?`, ["github"]
        );
        return { connected: rows.length > 0, count: rows.length };
    }
}
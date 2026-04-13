import axios from "axios";
import { Injectable } from "@nestjs/common";
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

        const expires = Date.now() + res.data.expires_in * 1000;

        const cloud = await axios.get(
            "https://api.atlassian.com/oauth/token/accessible-resources",
            { headers: { Authorization: `Bearer ${res.data.access_token}` } },
        );

        await this.db.run(`DELETE FROM connections WHERE provider = ?`, ["jira"]);
        await this.db.run(
            `INSERT INTO connections (provider, keychain_ref, cloud_id)
             VALUES (?, ?, ?)`,
            ["jira", res.data.access_token, cloud.data[0].id],
        );
    }

    async getConnection() {
        const row = await this.db.get(
            `SELECT * FROM connections WHERE provider = ?`, ["jira"]
        );
        if (!row) throw new Error("Jira not connected");
        return row;
    }

    async get(path: string) {
        const conn = await this.getConnection();
        const url  = `https://api.atlassian.com/ex/jira/${conn.cloud_id}${path}`;
        const res  = await axios.get(url, {
            headers: { Authorization: `Bearer ${conn.keychain_ref}` },
        });
        return res.data;
    }

    async stories() {
        const data = await this.get(
            `/rest/api/3/search/jql?jql=assignee=currentUser()`
        );

        for (const issue of data.issues) {
            await this.db.run(
                `INSERT INTO stories (jira_key, summary, status, priority, assignee, raw_json)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(jira_key) DO UPDATE SET
                   summary  = excluded.summary,
                   status   = excluded.status,
                   priority = excluded.priority,
                   assignee = excluded.assignee,
                   raw_json = excluded.raw_json,
                   synced_at = CURRENT_TIMESTAMP`,
                [
                    issue.key,
                    issue.fields.summary,
                    issue.fields.status?.name,
                    issue.fields.priority?.name,
                    issue.fields.assignee?.displayName,
                    JSON.stringify(issue),
                ]
            );
        }

        return data;
    }

    async story(key: string) {
        return this.get(`/rest/api/3/issue/${key}`);
    }

    async status() {
        const row = await this.db.get(
            `SELECT * FROM connections WHERE provider = ?`, ["jira"]
        );
        return { connected: !!row };
    }
}

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
        try {
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${conn.keychain_ref}` },
            });
            return res.data;
        } catch (err: any) {
            if (err?.response?.status === 401) {
                await this.db.run(`DELETE FROM connections WHERE provider = ?`, ["jira"]);
                throw new Error("Jira not connected");
            }
            throw err;
        }
    }

    async stories() {
        const data = await this.get(
            `/rest/api/3/search/jql?jql=assignee=currentUser()` +
            `&fields=summary,status,priority,assignee,sprint,description`
        );
        console.log(JSON.stringify(data.issues?.[0], null, 2)); // ← add this
        return data;
        //return this.get(`/rest/api/3/search/jql?jql=assignee=currentUser()`);
    }

    async story(key: string) {
        return this.get(
            `/rest/api/3/search/jql?jql=assignee=currentUser()` +
            `&fields=summary,status,priority,assignee,sprint,description`
        );
    }

    async status() {
        const row = await this.db.get(
            `SELECT * FROM connections WHERE provider = ?`, ["jira"]
        );
        return { connected: !!row };
    }
}
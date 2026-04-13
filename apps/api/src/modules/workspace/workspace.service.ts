import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../core/database/database.service";
import * as fs   from "fs";
import * as path from "path";

@Injectable()
export class WorkspaceService {
    constructor(private db: DatabaseService) {}

    async create(key: string) {
        const base   = process.env.WORKSPACE_PATH
            ?? path.resolve(__dirname, "../../../../workspace");
        const folder = path.join(base, key);

        fs.mkdirSync(folder, { recursive: true });

        await this.db.run(
            `INSERT INTO workspaces (jira_key, folder_path)
             VALUES (?, ?)
             ON CONFLICT(jira_key) DO NOTHING`,
            [key, folder],
        );

        return { folder };
    }

    async list() {
        return this.db.all(`SELECT * FROM workspaces ORDER BY created_at DESC`);
    }
}

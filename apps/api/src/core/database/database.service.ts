/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit } from "@nestjs/common";
import * as sqlite3 from "sqlite3";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class DatabaseService implements OnModuleInit {
    db: sqlite3.Database;

    onModuleInit() {
        const dbPath = process.env.DATABASE_PATH
            ?? path.resolve(__dirname, "../../../../database/app.db");
        const schemaPath = path.join(__dirname, "schema.sql");

        if (!fs.existsSync(path.dirname(dbPath))) {
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        }

        this.db = new sqlite3.Database(dbPath);
        this.db.exec(fs.readFileSync(schemaPath, "utf-8"));

        // Run migrations after schema is applied
        this.runMigrations();
    }

    private runMigrations() {
        const migrations = [
            `ALTER TABLE connections ADD COLUMN refresh_token  TEXT`,
            `ALTER TABLE connections ADD COLUMN instance_url   TEXT`,
            `ALTER TABLE connections ADD COLUMN account_name   TEXT`,
            `ALTER TABLE connections ADD COLUMN account_email  TEXT`,
            `ALTER TABLE connections ADD COLUMN avatar_url     TEXT`,

            `ALTER TABLE workspaces ADD COLUMN name              TEXT`,
            `ALTER TABLE workspaces ADD COLUMN jira_account_id   INTEGER`,
            `ALTER TABLE workspaces ADD COLUMN jira_board        TEXT`,
            `ALTER TABLE workspaces ADD COLUMN github_account_id INTEGER`,
            `ALTER TABLE workspaces ADD COLUMN git_repo_url      TEXT`,
            `ALTER TABLE workspaces ADD COLUMN git_branch        TEXT`,
            `ALTER TABLE workspaces ADD COLUMN sf_account_id     INTEGER`,
        ];

        for (const sql of migrations) {
            this.db.run(sql, (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    console.error("Migration failed:", sql, err.message);
                }
            });
        }

        this.db.run(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_provider_cloud
         ON connections(provider, cloud_id)`
        );

        this.db.run(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_jira_board
         ON workspaces(jira_board)`
        );
    }

    run(query: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (error) {
                if (error) reject(error);
                else resolve(this);
            });
        });
    }

    all(query: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (error, rows) => {
                if (error) reject(error);
                else resolve(rows);
            });
        });
    }

    get(query: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (error, row) => {
                if (error) reject(error);
                else resolve(row);
            });
        });
    }
}
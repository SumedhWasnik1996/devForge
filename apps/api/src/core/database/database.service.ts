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

        this.db.serialize(() => {
            // WAL mode — safer for concurrent reads/writes
            this.db.run(`PRAGMA journal_mode = WAL`);
            this.db.run(`PRAGMA foreign_keys = ON`);

            // Step 1 — base schema
            this.db.exec(fs.readFileSync(schemaPath, "utf-8"), (err) => {
                if (err) console.error("Schema exec error:", err.message);
            });

            // Step 2 — add columns to connections if missing (safe to re-run)
            const connectionsMigrations = [
                `ALTER TABLE connections ADD COLUMN refresh_token  TEXT`,
                `ALTER TABLE connections ADD COLUMN instance_url   TEXT`,
                `ALTER TABLE connections ADD COLUMN account_name   TEXT`,
                `ALTER TABLE connections ADD COLUMN account_email  TEXT`,
                `ALTER TABLE connections ADD COLUMN avatar_url     TEXT`,
            ];

            for (const sql of connectionsMigrations) {
                this.db.run(sql, (err) => {
                    if (err && !err.message.includes("duplicate column")) {
                        console.error("Connections migration failed:", err.message);
                    }
                });
            }

            // Step 3 — ensure unique index on connections(provider, cloud_id).
            // Clean up any duplicate/null cloud_id rows first so the index
            // can always be created — this was the root cause of Jira tokens
            // not persisting across restarts.
            this.db.run(
                `DELETE FROM connections
                 WHERE cloud_id IS NULL
                    OR id NOT IN (
                        SELECT MIN(id)
                        FROM connections
                        GROUP BY provider, cloud_id
                    )`,
                (err) => {
                    if (err) console.error("Connections dedup failed:", err.message);
                }
            );

            this.db.run(
                `CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_provider_cloud
                 ON connections(provider, cloud_id)`,
                (err) => {
                    if (err && !err.message.includes("already exists")) {
                        console.error("Connections index failed:", err.message);
                    }
                }
            );

            // Step 4 — workspaces schema migration (one-time, safe to re-run)
            this.db.get(
                `SELECT name FROM pragma_table_info('workspaces') WHERE name = 'jira_board'`,
                (err, row) => {
                    if (err) {
                        console.error("Workspace schema check failed:", err.message);
                        return;
                    }

                    if (!row) {
                        console.log("[DB] Migrating workspaces table to new schema...");
                        this.db.serialize(() => {
                            this.db.run(`DROP TABLE IF EXISTS workspaces`, (err) => {
                                if (err) console.error("Drop workspaces failed:", err.message);
                            });
                            this.db.run(`
                                CREATE TABLE IF NOT EXISTS workspaces (
                                    id                INTEGER  PRIMARY KEY AUTOINCREMENT,
                                    name              TEXT     NOT NULL,
                                    jira_account_id   INTEGER  REFERENCES connections(id) ON DELETE SET NULL,
                                    jira_board        TEXT     NOT NULL,
                                    github_account_id INTEGER  REFERENCES connections(id) ON DELETE SET NULL,
                                    git_repo_url      TEXT,
                                    git_branch        TEXT     DEFAULT 'main',
                                    sf_account_id     INTEGER  REFERENCES connections(id) ON DELETE SET NULL,
                                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
                                )
                            `, (err) => {
                                if (err) console.error("Create workspaces failed:", err.message);
                                else console.log("[DB] Workspaces table migrated successfully.");
                            });
                            this.db.run(
                                `CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_jira_board
                                 ON workspaces(jira_board)`,
                                (err) => {
                                    if (err && !err.message.includes("already exists")) {
                                        console.error("Workspaces index failed:", err.message);
                                    }
                                }
                            );
                        });
                    }
                }
            );
        });
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
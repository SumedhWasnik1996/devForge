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

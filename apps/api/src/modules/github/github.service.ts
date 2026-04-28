/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import axios from "axios";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../core/database/database.service";

// ─── SDFX scaffold files committed on repo creation ───────────────────────────
const SDFX_SCAFFOLD: Record<string, string> = {
    "README.md": `# SDFX Project\n\nCreated with DevForge. Powered by SDFX.\n`,

    ".sdfx/project.json": JSON.stringify({
        version: "1.0.0",
        sdfx_version: "latest",
        name: "",           // filled at runtime
        created_at: "",     // filled at runtime
        workflows: ["workflows/default.json"],
    }, null, 2),

    "workflows/default.json": JSON.stringify({
        id: "default",
        name: "Default Workflow",
        version: "1.0.0",
        nodes: [],
        edges: [],
        metadata: {
            description: "Empty workflow — add nodes to get started",
            created_at: "",
        },
    }, null, 2),

    "assets/.gitkeep": "",

    ".gitignore": [
        "# OS",
        ".DS_Store",
        "Thumbs.db",
        "",
        "# SDFX outputs",
        "outputs/",
        "*.tmp",
    ].join("\n"),
};

@Injectable()
export class GithubService {
    constructor(private db: DatabaseService) { }

    // ─── OAuth ──────────────────────────────────────────────────────────────────

    async exchange(code: string) {
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

        const userRes = await axios.get("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
        });

        const { login, name, email, avatar_url, id: githubUserId } = userRes.data;

        await this.db.run(
            `INSERT INTO connections
                (provider, keychain_ref, cloud_id, account_name, account_email, avatar_url)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(provider, cloud_id) DO UPDATE SET
                 keychain_ref  = excluded.keychain_ref,
                 account_name  = excluded.account_name,
                 account_email = excluded.account_email,
                 avatar_url    = excluded.avatar_url`,
            ["github", accessToken, String(githubUserId), name || login, email, avatar_url],
        );

        return { login };
    }

    // ─── Accounts ───────────────────────────────────────────────────────────────

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

    // ─── HTTP helpers ────────────────────────────────────────────────────────────

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

    private async post(path: string, body: any, accountId?: number) {
        const conn = await this.getConnection(accountId);
        const url = path.startsWith("https://") ? path : `https://api.github.com${path}`;
        const res = await axios.post(url, body, {
            headers: {
                Authorization: `Bearer ${conn.keychain_ref}`,
                Accept: "application/vnd.github+json",
            },
        });
        return res.data;
    }

    private async put(path: string, body: any, accountId?: number) {
        const conn = await this.getConnection(accountId);
        const url = path.startsWith("https://") ? path : `https://api.github.com${path}`;
        const res = await axios.put(url, body, {
            headers: {
                Authorization: `Bearer ${conn.keychain_ref}`,
                Accept: "application/vnd.github+json",
            },
        });
        return res.data;
    }

    // ─── Repos ──────────────────────────────────────────────────────────────────

    async repos(accountId?: number, page = 1, perPage = 30) {
        return this.get(
            `/user/repos?affiliation=owner,collaborator&sort=pushed&per_page=${perPage}&page=${page}`,
            accountId,
        );
    }

    /**
     * Create a new GitHub repo and populate it with the SDFX scaffold
     * using the Git Data API (single atomic commit).
     */
    async createRepo(name: string, accountId?: number, isPrivate = true) {
        const conn = await this.getConnection(accountId);

        // 1. Create the empty repo (auto_init=false so we control the first commit)
        const repo = await this.post("/user/repos", {
            name,
            description: "SDFX project — created with DevForge",
            private: isPrivate,
            auto_init: false,
        }, accountId);

        const owner: string = repo.owner.login;
        const repoName: string = repo.name;
        const now = new Date().toISOString();

        // Patch in dynamic values
        const scaffold = { ...SDFX_SCAFFOLD };
        scaffold[".sdfx/project.json"] = JSON.stringify({
            ...JSON.parse(scaffold[".sdfx/project.json"]),
            name: repoName,
            created_at: now,
        }, null, 2);
        scaffold["workflows/default.json"] = JSON.stringify({
            ...JSON.parse(scaffold["workflows/default.json"]),
            metadata: { description: "Empty workflow — add nodes to get started", created_at: now },
        }, null, 2);

        // 2. Create blobs for every file
        const blobs: { path: string; sha: string }[] = [];
        for (const [filePath, content] of Object.entries(scaffold)) {
            const b64 = Buffer.from(content).toString("base64");
            const blob = await this.post(
                `/repos/${owner}/${repoName}/git/blobs`,
                { content: b64, encoding: "base64" },
                accountId,
            );
            blobs.push({ path: filePath, sha: blob.sha });
        }

        // 3. Create tree
        const tree = await this.post(
            `/repos/${owner}/${repoName}/git/trees`,
            {
                tree: blobs.map(b => ({
                    path: b.path,
                    mode: "100644",
                    type: "blob",
                    sha: b.sha,
                })),
            },
            accountId,
        );

        // 4. Create commit (no parent — first commit)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const commit = await this.post(
            `/repos/${owner}/${repoName}/git/commits`,
            {
                message: "chore: init SDFX project scaffold",
                tree: tree.sha,
                author: {
                    name: conn.account_name || "DevForge",
                    email: conn.account_email || "devforge@local",
                    date: now,
                },
            },
            accountId,
        );

        // 5. Create main branch ref
        await this.post(
            `/repos/${owner}/${repoName}/git/refs`,
            { ref: "refs/heads/main", sha: commit.sha },
            accountId,
        );

        // 6. Set default branch to main
        await axios.patch(
            `https://api.github.com/repos/${owner}/${repoName}`,
            { default_branch: "main" },
            {
                headers: {
                    Authorization: `Bearer ${conn.keychain_ref}`,
                    Accept: "application/vnd.github+json",
                },
            },
        );

        return {
            id: repo.id,
            name: repoName,
            full_name: repo.full_name,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            ssh_url: repo.ssh_url,
            default_branch: "main",
            owner: { login: owner, avatar_url: repo.owner.avatar_url },
        };
    }

    // ─── File tree ───────────────────────────────────────────────────────────────

    /**
     * Returns the recursive file tree for a branch using the Git Trees API.
     */
    async getRepoTree(owner: string, repo: string, branch = "main", accountId?: number) {
        // Get branch SHA
        const ref = await this.get(
            `/repos/${owner}/${repo}/branches/${branch}`,
            accountId,
        );
        const treeSha: string = ref.commit.commit.tree.sha;

        const tree = await this.get(
            `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
            accountId,
        );

        return {
            sha: treeSha,
            truncated: tree.truncated,
            tree: tree.tree as Array<{
                path: string;
                mode: string;
                type: "blob" | "tree";
                sha: string;
                size?: number;
                url: string;
            }>,
        };
    }

    /**
     * Returns decoded file content + metadata.
     */
    async getFileContent(owner: string, repo: string, path: string, branch = "main", accountId?: number) {
        const data = await this.get(
            `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
            accountId,
        );

        if (Array.isArray(data)) {
            // It's a directory listing
            return { type: "dir", entries: data };
        }

        const content = data.encoding === "base64"
            ? Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8")
            : data.content;

        return {
            type: "file",
            name: data.name,
            path: data.path,
            sha: data.sha,
            size: data.size,
            encoding: data.encoding,
            content,
            download_url: data.download_url,
        };
    }

    // ─── Pull Requests ───────────────────────────────────────────────────────────

    async getPullRequests(owner: string, repo: string, state: "open" | "closed" | "all" = "open", accountId?: number) {
        return this.get(
            `/repos/${owner}/${repo}/pulls?state=${state}&per_page=50&sort=updated`,
            accountId,
        );
    }

    // ─── Branches ────────────────────────────────────────────────────────────────

    async getBranches(owner: string, repo: string, accountId?: number) {
        return this.get(
            `/repos/${owner}/${repo}/branches?per_page=100`,
            accountId,
        );
    }

    // ─── Status ──────────────────────────────────────────────────────────────────

    async status() {
        const rows = await this.db.all(
            `SELECT id FROM connections WHERE provider = ?`, ["github"]
        );
        return { connected: rows.length > 0, count: rows.length };
    }
}
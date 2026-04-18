/* eslint-disable prettier/prettier */
// apps/api/src/modules/workspace/workspace.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../../core/database/database.service";
import type {
    CreateWorkspaceDto,
    UpdateWorkspaceDto
} from "./workspace.dto";


@Injectable()
export class WorkspaceService {
    constructor(private db: DatabaseService) { }

    async create(dto: CreateWorkspaceDto) {
        // Check jira_board is not already used
        const existing = await this.db.get(
            `SELECT id FROM workspaces WHERE jira_board = ?`,
            [dto.jiraBoard],
        );
        if (existing) {
            throw new BadRequestException(
                `A workspace for board ${dto.jiraBoard} already exists`
            );
        }

        // Verify jira account exists
        const jiraAccount = await this.db.get(
            `SELECT id, account_name FROM connections WHERE id = ? AND provider = 'jira'`,
            [dto.jiraAccountId],
        );
        if (!jiraAccount) {
            throw new BadRequestException("Jira account not found");
        }

        await this.db.run(
            `INSERT INTO workspaces
                (name, jira_account_id, jira_board, github_account_id,
                 git_repo_url, git_branch, sf_account_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                dto.name,
                dto.jiraAccountId,
                dto.jiraBoard,
                dto.githubAccountId ?? null,
                dto.gitRepoUrl ?? null,
                dto.gitBranch ?? "main",
                dto.sfAccountId ?? null,
            ],
        );

        return this.db.get(
            `SELECT * FROM workspaces ORDER BY created_at DESC LIMIT 1`
        );
    }

    async list() {
        // Join with connections to get account display names
        return this.db.all(`
            SELECT
                w.*,
                j.account_name  AS jira_account_name,
                j.account_email AS jira_account_email,
                g.account_name  AS github_account_name,
                s.account_name  AS sf_account_name,
                s.instance_url  AS sf_instance_url
            FROM workspaces w
            LEFT JOIN connections j ON j.id = w.jira_account_id
            LEFT JOIN connections g ON g.id = w.github_account_id
            LEFT JOIN connections s ON s.id = w.sf_account_id
            ORDER BY w.created_at DESC
        `);
    }

    async get(id: number) {
        const row = await this.db.get(`
            SELECT
                w.*,
                j.account_name  AS jira_account_name,
                j.account_email AS jira_account_email,
                j.avatar_url    AS jira_avatar_url,
                g.account_name  AS github_account_name,
                g.avatar_url    AS github_avatar_url,
                s.account_name  AS sf_account_name,
                s.instance_url  AS sf_instance_url,
                s.avatar_url    AS sf_avatar_url
            FROM workspaces w
            LEFT JOIN connections j ON j.id = w.jira_account_id
            LEFT JOIN connections g ON g.id = w.github_account_id
            LEFT JOIN connections s ON s.id = w.sf_account_id
            WHERE w.id = ?
        `, [id]);

        if (!row) throw new NotFoundException(`Workspace ${id} not found`);
        return row;
    }

    async update(id: number, dto: UpdateWorkspaceDto) {
        const workspace = await this.get(id);
        if (!workspace) throw new NotFoundException(`Workspace ${id} not found`);

        await this.db.run(
            `UPDATE workspaces SET
                name              = COALESCE(?, name),
                github_account_id = COALESCE(?, github_account_id),
                git_repo_url      = COALESCE(?, git_repo_url),
                git_branch        = COALESCE(?, git_branch),
                sf_account_id     = COALESCE(?, sf_account_id)
             WHERE id = ?`,
            [
                dto.name ?? null,
                dto.githubAccountId ?? null,
                dto.gitRepoUrl ?? null,
                dto.gitBranch ?? null,
                dto.sfAccountId ?? null,
                id,
            ],
        );

        return this.get(id);
    }

    async delete(id: number) {
        await this.db.run(`DELETE FROM workspaces WHERE id = ?`, [id]);
        return { deleted: true };
    }

    // Get stories for a specific workspace using its jira account + board
    async getStories(id: number, startAt = 0, maxResults = 50) {
        const workspace = await this.get(id);
        return {
            workspaceId: id,
            jiraBoard: workspace.jira_board,
            jiraAccountId: workspace.jira_account_id,
            startAt,
            maxResults,
        };
    }
}
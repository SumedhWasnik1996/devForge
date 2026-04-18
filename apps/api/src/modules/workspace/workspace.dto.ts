/* eslint-disable prettier/prettier */
export interface CreateWorkspaceDto {
    name: string;
    jiraAccountId: number;
    jiraBoard: string;
    githubAccountId?: number;
    gitRepoUrl?: string;
    gitBranch?: string;
    sfAccountId?: number;
}

export interface UpdateWorkspaceDto {
    name?: string;
    githubAccountId?: number;
    gitRepoUrl?: string;
    gitBranch?: string;
    sfAccountId?: number;
}

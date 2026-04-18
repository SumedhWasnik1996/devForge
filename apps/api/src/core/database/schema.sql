PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    provider      TEXT    NOT NULL,
    keychain_ref  TEXT    NOT NULL,          -- access token
    refresh_token TEXT,                      -- used by Salesforce (and future providers)
    cloud_id      TEXT,                      -- jira cloud id / github user id / sf org id
    instance_url  TEXT,                      -- salesforce: https://myorg.my.salesforce.com
    account_name  TEXT,
    account_email TEXT,
    avatar_url    TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, cloud_id)
);

CREATE TABLE IF NOT EXISTS stories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    jira_key     TEXT    UNIQUE NOT NULL,
    summary      TEXT,
    status       TEXT,
    priority     TEXT,
    assignee     TEXT,
    description  TEXT,
    raw_json     TEXT,
    synced_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Updated workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT    NOT NULL,
    jira_account_id   INTEGER REFERENCES connections(id) ON DELETE SET NULL,
    jira_board        TEXT    NOT NULL UNIQUE,
    github_account_id INTEGER REFERENCES connections(id) ON DELETE SET NULL,
    git_repo_url      TEXT,
    git_branch        TEXT    DEFAULT 'main',
    sf_account_id     INTEGER REFERENCES connections(id) ON DELETE SET NULL,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deployments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    jira_key     TEXT,
    status       TEXT,
    log          TEXT,
    deployed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    jira_key     TEXT,
    class_name   TEXT,
    outcome      TEXT,
    log          TEXT,
    ran_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    jira_key     TEXT,
    prompt       TEXT,
    response     TEXT,
    provider     TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
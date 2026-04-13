PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connections (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    provider     TEXT    NOT NULL,
    keychain_ref TEXT    NOT NULL,
    cloud_id     TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS workspaces (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    jira_key     TEXT    UNIQUE NOT NULL,
    folder_path  TEXT,
    git_branch   TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
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

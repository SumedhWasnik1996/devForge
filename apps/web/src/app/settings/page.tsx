"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import {
    Box, Typography, Avatar, Button, CircularProgress,
    Alert, Divider, Tooltip, Switch, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    TextField, IconButton, Chip,
} from "@mui/material";
import NewWorkspaceModal from "@/components/workspace/NewWorkspaceModal";

interface Account {
    id: number;
    cloud_id: string;
    instance_url?: string | null;
    account_name: string | null;
    account_email: string | null;
    avatar_url: string | null;
    created_at: string;
}

interface Workspace {
    id: number;
    name: string;
    jira_board: string;
    jira_account_name: string | null;
    jira_account_email: string | null;
    github_account_name: string | null;
    git_repo_url: string | null;
    git_branch: string | null;
    sf_account_name: string | null;
    sf_instance_url: string | null;
    created_at: string;
}

// ── Account card ──────────────────────────────────────────────────────────────
function AccountCard({ account, accentColor, deleteApiPath, onDisconnect, badge }: {
    account: Account;
    accentColor: string;
    deleteApiPath: string;
    onDisconnect: (id: number) => void;
    badge?: string;
}) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [removing, setRemoving] = useState(false);

    const handleDisconnect = async () => {
        setRemoving(true);
        try { await api.delete(deleteApiPath); onDisconnect(account.id); }
        finally { setRemoving(false); setConfirmOpen(false); }
    };

    const initials = account.account_name
        ? account.account_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
        : "?";

    return (
        <>
            <Box sx={{
                display: "flex", alignItems: "center", gap: 2, p: 2,
                borderRadius: 2, border: "1px solid", borderColor: "divider",
                bgcolor: "background.paper", transition: "border-color 0.15s",
                "&:hover": { borderColor: "primary.light" },
            }}>
                <Avatar src={account.avatar_url ?? undefined}
                    sx={{ width: 42, height: 42, bgcolor: accentColor, fontSize: 15, fontWeight: 600 }}>
                    {initials}
                </Avatar>
                <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={600} fontSize={14} noWrap>
                            {account.account_name ?? "Account"}
                        </Typography>
                        {badge && (
                            <Box sx={{
                                px: 0.75, py: 0.1, borderRadius: 0.75, fontSize: 10, fontWeight: 600,
                                bgcolor: badge === "Sandbox" ? "#f59e0b22" : "#22c55e22",
                                color: badge === "Sandbox" ? "#f59e0b" : "#22c55e",
                                border: `1px solid ${badge === "Sandbox" ? "#f59e0b44" : "#22c55e44"}`,
                                flexShrink: 0,
                            }}>
                                {badge}
                            </Box>
                        )}
                    </Box>
                    {account.account_email && (
                        <Typography fontSize={12} color="text.secondary" noWrap>
                            {account.account_email}
                        </Typography>
                    )}
                    {account.instance_url && (
                        <Typography fontSize={11} color="text.disabled" noWrap>
                            {account.instance_url}
                        </Typography>
                    )}
                    <Typography fontSize={11} color="text.disabled" mt={0.25}>
                        Connected {new Date(account.created_at).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                        })}
                    </Typography>
                </Box>
                <Tooltip title="Disconnect this account">
                    <Button size="small" color="error" variant="outlined"
                        onClick={() => setConfirmOpen(true)} sx={{ flexShrink: 0, fontSize: 12 }}>
                        Disconnect
                    </Button>
                </Tooltip>
            </Box>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
                <DialogTitle>Disconnect account?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will remove <strong>{account.account_name ?? account.account_email ?? "this account"}</strong> from DevForge. You can reconnect at any time.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDisconnect} disabled={removing}
                        startIcon={removing ? <CircularProgress size={14} color="inherit" /> : null}>
                        Disconnect
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ── Generic integration section ───────────────────────────────────────────────
function IntegrationSection({ logo, title, subtitle, accentColor, apiBase,
    accounts, loading, error, waiting, onConnect, onDisconnect, connectExtra }: {
        logo: React.ReactNode;
        title: string;
        subtitle: string;
        accentColor: string;
        apiBase: string;
        accounts: Account[];
        loading: boolean;
        error: string;
        waiting: boolean;
        onConnect: () => void;
        onDisconnect: (id: number) => void;
        connectExtra?: React.ReactNode;
    }) {
    return (
        <Box mb={4}>
            <Box mb={1.5} display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{
                        width: 32, height: 32, borderRadius: 1.5, bgcolor: accentColor,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                        {logo}
                    </Box>
                    <Box>
                        <Typography fontWeight={600} fontSize={14}>{title}</Typography>
                        <Typography fontSize={12} color="text.secondary">
                            {loading ? "Loading…" : accounts.length === 0
                                ? "No accounts connected"
                                : `${accounts.length} account${accounts.length > 1 ? "s" : ""} connected`}
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                    {connectExtra}
                    <Button variant="contained" size="small" onClick={onConnect} disabled={waiting}
                        startIcon={waiting ? <CircularProgress size={12} color="inherit" /> : null}
                        sx={{ bgcolor: accentColor, "&:hover": { filter: "brightness(1.2)", bgcolor: accentColor } }}>
                        {waiting ? "Waiting…" : "Add Account"}
                    </Button>
                </Box>
            </Box>

            {loading ? (
                <Box display="flex" alignItems="center" gap={1.5} py={2}>
                    <CircularProgress size={16} />
                    <Typography fontSize={13} color="text.secondary">Loading accounts…</Typography>
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>
            ) : accounts.length === 0 ? (
                <Box sx={{
                    mt: 1.5, p: 3, borderRadius: 2, border: "1px dashed", borderColor: "divider",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5,
                }}>
                    <Typography fontSize={13} color="text.secondary" textAlign="center">{subtitle}</Typography>
                    <Button variant="outlined" size="small" onClick={onConnect} disabled={waiting}>
                        {waiting ? "Waiting…" : `Connect ${title}`}
                    </Button>
                </Box>
            ) : (
                <Box display="flex" flexDirection="column" gap={1.5} mt={1.5}>
                    {accounts.map(acc => (
                        <AccountCard
                            key={acc.id}
                            account={acc}
                            accentColor={accentColor}
                            deleteApiPath={`/${apiBase}/accounts/${acc.id}`}
                            onDisconnect={onDisconnect}
                            badge={
                                apiBase === "salesforce"
                                    ? (acc.instance_url?.includes("sandbox") || acc.instance_url?.includes("test.")
                                        ? "Sandbox" : "Production")
                                    : undefined
                            }
                        />
                    ))}
                </Box>
            )}

            {waiting && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    Complete the login in your browser. This will update automatically.
                </Alert>
            )}
        </Box>
    );
}

// ── Workspace row ─────────────────────────────────────────────────────────────
function WorkspaceRow({ workspace, onDeleted, onUpdated }: {
    workspace: Workspace;
    onDeleted: (id: number) => void;
    onUpdated: (ws: Workspace) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(workspace.name);
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSave = async () => {
        if (!editName.trim()) return;
        setSaving(true);
        try {
            const r = await api.patch(`/workspace/${workspace.id}`, { name: editName.trim() });
            onUpdated(r.data);
            setEditing(false);
        } catch {
            // keep editing open on error
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/workspace/${workspace.id}`);
            onDeleted(workspace.id);
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") { setEditing(false); setEditName(workspace.name); }
    };

    return (
        <>
            <Box sx={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 160px 160px 120px 80px",
                alignItems: "center",
                gap: 2, px: 2, py: 1.5,
                borderBottom: "1px solid", borderColor: "divider",
                "&:hover": { bgcolor: "action.hover" },
                transition: "background 0.1s",
            }}>
                {/* Name — editable */}
                <Box display="flex" alignItems="center" gap={1} minWidth={0}>
                    {editing ? (
                        <TextField
                            size="small" value={editName} autoFocus
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => { setEditing(false); setEditName(workspace.name); }}
                            sx={{ "& .MuiInputBase-input": { fontSize: 13, py: 0.5 } }}
                        />
                    ) : (
                        <Typography
                            fontSize={13} fontWeight={500} noWrap
                            onClick={() => setEditing(true)}
                            sx={{ cursor: "text", "&:hover": { color: "primary.main" } }}
                            title="Click to edit name"
                        >
                            {workspace.name}
                        </Typography>
                    )}
                    {editing && (
                        <IconButton size="small" onClick={handleSave} disabled={saving}
                            sx={{ color: "success.main", p: 0.25 }}>
                            {saving
                                ? <CircularProgress size={12} />
                                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            }
                        </IconButton>
                    )}
                </Box>

                {/* Jira board */}
                <Box>
                    <Chip
                        label={workspace.jira_board}
                        size="small"
                        sx={{
                            height: 20, fontSize: 10, fontWeight: 600,
                            bgcolor: "#dbeafe", color: "#1e40af",
                        }}
                    />
                </Box>

                {/* Jira account */}
                <Typography fontSize={12} color="text.secondary" noWrap title={workspace.jira_account_email ?? ""}>
                    {workspace.jira_account_name ?? workspace.jira_account_email ?? "—"}
                </Typography>

                {/* GitHub repo */}
                <Typography
                    fontSize={11} color="text.disabled" noWrap
                    sx={{ fontFamily: "monospace" }}
                    title={workspace.git_repo_url ?? ""}
                >
                    {workspace.git_repo_url
                        ? workspace.git_repo_url.replace("https://github.com/", "")
                        : <span style={{ fontFamily: "inherit", fontStyle: "italic" }}>Not configured</span>
                    }
                </Typography>

                {/* Salesforce org */}
                <Typography fontSize={12} color="text.secondary" noWrap>
                    {workspace.sf_account_name ?? (
                        <span style={{ color: "var(--text-disabled)", fontStyle: "italic" }}>Not linked</span>
                    )}
                </Typography>

                {/* Actions */}
                <Box display="flex" gap={0.5} justifyContent="flex-end">
                    <Tooltip title="Edit name">
                        <IconButton
                            size="small"
                            onClick={() => { setEditing(true); setEditName(workspace.name); }}
                            sx={{ color: "text.disabled", "&:hover": { color: "primary.main" } }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete workspace">
                        <IconButton
                            size="small"
                            onClick={() => setConfirmOpen(true)}
                            sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                            </svg>
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Delete confirm dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
                <DialogTitle>Delete workspace?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will remove <strong>{workspace.name}</strong> and its configuration.
                        Your Jira, GitHub and Salesforce accounts will not be affected.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained"
                        onClick={handleDelete} disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : null}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ── Workspace section ─────────────────────────────────────────────────────────
function WorkspacesSection() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get("/workspace");
            setWorkspaces(r.data ?? []);
        } catch {
            setError("Failed to load workspaces");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleUpdated = (updated: Workspace) => {
        setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w));
    };

    const handleDeleted = (id: number) => {
        setWorkspaces(prev => prev.filter(w => w.id !== id));
    };

    return (
        <Box mb={4}>
            {/* Section header */}
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{
                        width: 32, height: 32, borderRadius: 1.5,
                        bgcolor: "#6366f1",
                        display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0,
                    }}>
                        {/* Workspace icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                    </Box>
                    <Box>
                        <Typography fontWeight={600} fontSize={14}>Workspaces</Typography>
                        <Typography fontSize={12} color="text.secondary">
                            {loading ? "Loading…"
                                : workspaces.length === 0
                                    ? "No workspaces configured"
                                    : `${workspaces.length} workspace${workspaces.length > 1 ? "s" : ""}`}
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained" size="small" disableElevation
                    onClick={() => setModalOpen(true)}
                    sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
                >
                    + New workspace
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" alignItems="center" gap={1.5} py={2}>
                    <CircularProgress size={16} />
                    <Typography fontSize={13} color="text.secondary">Loading workspaces…</Typography>
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : workspaces.length === 0 ? (
                <Box sx={{
                    p: 3, borderRadius: 2, border: "1px dashed", borderColor: "divider",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5,
                }}>
                    <Typography fontSize={13} color="text.secondary" textAlign="center">
                        No workspaces yet. A workspace links a Jira board, GitHub repo and Salesforce org.
                    </Typography>
                    <Button variant="outlined" size="small" onClick={() => setModalOpen(true)}>
                        Create workspace
                    </Button>
                </Box>
            ) : (
                <Box sx={{
                    border: "1px solid", borderColor: "divider",
                    borderRadius: 2, overflow: "hidden",
                }}>
                    {/* Table header */}
                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 80px 160px 160px 120px 80px",
                        gap: 2, px: 2, py: 1,
                        bgcolor: "action.hover",
                        borderBottom: "1px solid", borderColor: "divider",
                    }}>
                        {["Name", "Board", "Jira account", "GitHub repo", "Salesforce", ""].map(h => (
                            <Typography key={h} fontSize={11} fontWeight={600}
                                color="text.disabled"
                                sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {h}
                            </Typography>
                        ))}
                    </Box>

                    {/* Rows */}
                    {workspaces.map(ws => (
                        <WorkspaceRow
                            key={ws.id}
                            workspace={ws}
                            onDeleted={handleDeleted}
                            onUpdated={handleUpdated}
                        />
                    ))}
                </Box>
            )}

            {/* Reuse the same modal as the home page */}
            <NewWorkspaceModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={() => { setModalOpen(false); load(); }}
            />
        </Box>
    );
}

// ── Logos ─────────────────────────────────────────────────────────────────────
const JiraLogo = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <path d="M16 0C12.68 7.57 9.35 11.35 9.35 16c0 3.67 2.97 6.65 6.65 6.65S22.65 19.67 22.65 16C22.65 11.35 19.32 7.57 16 0z" fill="white" opacity="0.5" />
        <path d="M16 0c3.32 7.57 6.65 11.35 6.65 16 0 3.67-2.97 6.65-6.65 6.65V0z" fill="white" />
        <path d="M16 9.35C12.68 16.92 9.35 20.7 9.35 25.35 9.35 29.02 12.32 32 16 32s6.65-2.98 6.65-6.65c0-4.65-3.33-8.43-6.65-15.99z" fill="white" opacity="0.5" />
        <path d="M16 9.35c3.32 7.57 6.65 11.35 6.65 16C22.65 29.02 19.68 32 16 32V9.35z" fill="white" />
    </svg>
);

const GithubLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
);

const SalesforceLogo = () => (
    <svg width="20" height="14" viewBox="0 0 52 36" fill="white">
        <path d="M21.7 3.2C23.8 1.2 26.6 0 29.7 0c4.2 0 7.9 2.3 9.9 5.7.9-.4 1.9-.6 3-.6 4.1 0 7.4 3.3 7.4 7.4 0 .5-.1 1-.2 1.5C51.5 15.2 52 17 52 19c0 4.7-3.8 8.5-8.5 8.5H14c-5.5 0-10-4.5-10-10 0-4.9 3.5-8.9 8.2-9.8-.1-.5-.2-1-.2-1.5 0-3.9 3.2-7.1 7.1-7.1 1 0 2 .2 2.9.6C22.4 3.5 22 3.4 21.7 3.2z" />
    </svg>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const [jiraAccounts, setJiraAccounts] = useState<Account[]>([]);
    const [githubAccounts, setGithubAccounts] = useState<Account[]>([]);
    const [sfAccounts, setSfAccounts] = useState<Account[]>([]);
    const [jiraLoading, setJiraLoading] = useState(true);
    const [githubLoading, setGithubLoading] = useState(true);
    const [sfLoading, setSfLoading] = useState(true);
    const [jiraError, setJiraError] = useState("");
    const [githubError, setGithubError] = useState("");
    const [sfError, setSfError] = useState("");
    const [jiraWaiting, setJiraWaiting] = useState(false);
    const [githubWaiting, setGithubWaiting] = useState(false);
    const [sfWaiting, setSfWaiting] = useState(false);
    const [sfSandbox, setSfSandbox] = useState(false);

    const jiraPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const githubPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sfPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPoll = (r: React.MutableRefObject<ReturnType<typeof setInterval> | null>) => {
        if (r.current) { clearInterval(r.current); r.current = null; }
    };

    useEffect(() => {
        const load = async (path: string, set: any, setErr: any, setLoad: any) => {
            setLoad(true);
            try { set((await api.get(path)).data ?? []); }
            catch { setErr(`Failed to load accounts.`); }
            finally { setLoad(false); }
        };
        load("/jira/accounts", setJiraAccounts, setJiraError, setJiraLoading);
        load("/github/accounts", setGithubAccounts, setGithubError, setGithubLoading);
        load("/salesforce/accounts", setSfAccounts, setSfError, setSfLoading);
        return () => { stopPoll(jiraPollRef); stopPoll(githubPollRef); stopPoll(sfPollRef); };
    }, []);

    const openOAuth = async (url: string) => {
        try { const { invoke } = await import("@tauri-apps/api/core"); await invoke("open_url", { url }); }
        catch { window.open(url, "_blank"); }
    };

    const startPoll = (
        pollRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
        apiPath: string,
        prevCount: number,
        setAccounts: any,
        setWaiting: any,
    ) => {
        pollRef.current = setInterval(async () => {
            try {
                const r = await api.get(apiPath);
                if ((r.data ?? []).length > prevCount) {
                    stopPoll(pollRef); setWaiting(false); setAccounts(r.data);
                }
            } catch { }
        }, 2000);
        setTimeout(() => { stopPoll(pollRef); setWaiting(false); }, 120000);
    };

    const connectJira = async () => {
        await openOAuth("http://localhost:3000/jira/oauth/start");
        setJiraWaiting(true);
        startPoll(jiraPollRef, "/jira/accounts", jiraAccounts.length, setJiraAccounts, setJiraWaiting);
    };

    const connectGithub = async () => {
        await openOAuth("http://localhost:3000/github/oauth/start");
        setGithubWaiting(true);
        startPoll(githubPollRef, "/github/accounts", githubAccounts.length, setGithubAccounts, setGithubWaiting);
    };

    const connectSalesforce = async () => {
        await openOAuth(`http://localhost:3000/salesforce/oauth/start?sandbox=${sfSandbox}`);
        setSfWaiting(true);
        startPoll(sfPollRef, "/salesforce/accounts", sfAccounts.length, setSfAccounts, setSfWaiting);
    };

    return (
        <Box sx={{ p: 4, maxWidth: 840 }}>
            <Typography variant="h6" fontWeight={600} mb={0.5}>Settings</Typography>
            <Typography fontSize={13} color="text.secondary" mb={3}>
                Manage your connected integrations and preferences.
            </Typography>

            <Divider sx={{ mb: 3 }} />

            <IntegrationSection
                logo={<JiraLogo />} title="Jira / Atlassian" apiBase="jira"
                subtitle="Connect your Atlassian account to view and manage stories."
                accentColor="#0052cc"
                accounts={jiraAccounts} loading={jiraLoading} error={jiraError} waiting={jiraWaiting}
                onConnect={connectJira}
                onDisconnect={id => setJiraAccounts(p => p.filter(a => a.id !== id))}
            />

            <Divider sx={{ mb: 3 }} />

            <IntegrationSection
                logo={<GithubLogo />} title="GitHub" apiBase="github"
                subtitle="Connect your GitHub account to manage repos and branches."
                accentColor="#24292f"
                accounts={githubAccounts} loading={githubLoading} error={githubError} waiting={githubWaiting}
                onConnect={connectGithub}
                onDisconnect={id => setGithubAccounts(p => p.filter(a => a.id !== id))}
            />

            <Divider sx={{ mb: 3 }} />

            <IntegrationSection
                logo={<SalesforceLogo />} title="Salesforce" apiBase="salesforce"
                subtitle="Connect your Salesforce org to read and write metadata, Apex, and records."
                accentColor="#00a1e0"
                accounts={sfAccounts} loading={sfLoading} error={sfError} waiting={sfWaiting}
                onConnect={connectSalesforce}
                onDisconnect={id => setSfAccounts(p => p.filter(a => a.id !== id))}
                connectExtra={
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={sfSandbox}
                                onChange={e => setSfSandbox(e.target.checked)}
                            />
                        }
                        label={
                            <Typography fontSize={12} color="text.secondary">
                                Sandbox
                            </Typography>
                        }
                        sx={{ mr: 0, mb: 0.5 }}
                    />
                }
            />

            <Divider sx={{ mb: 3 }} />

            {/* ── Workspaces ── */}
            <WorkspacesSection />
        </Box>
    );
}
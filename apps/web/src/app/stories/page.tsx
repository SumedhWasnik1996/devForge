"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
    Box, Typography, Card, CardContent,
    Chip, CircularProgress, Alert, Button,
    Avatar, Tabs, Tab, Skeleton,
} from "@mui/material";


interface JiraAccount {
    id: number;
    cloud_id: string;
    account_name: string | null;
    account_email: string | null;
    avatar_url: string | null;
    created_at: string;
}

const statusColor = (status: string) => {
    const s = status?.toLowerCase() ?? "";
    if (s.includes("progress") || s.includes("dev")) return "warning";
    if (s.includes("done") || s.includes("complete")) return "success";
    if (s.includes("cancel")) return "error";
    if (s.includes("qa")) return "info";
    return "default";
};

const priorityColor = (priority: string) => {
    const p = priority?.toLowerCase() ?? "";
    if (p === "highest") return "#dc2626";
    if (p === "high") return "#ea580c";
    if (p === "medium") return "#ca8a04";
    if (p === "low") return "#16a34a";
    return "#6b7280";
};

const PAGE_SIZE = 20;

export default function StoriesPage() {

    const loadStories = async () => {
        setLoading(true);
        try {
            const ws = sessionStorage.getItem("activeWorkspace");
            const activeWs = ws ? JSON.parse(ws) : null;

            const params = new URLSearchParams();
            if (activeWs?.jira_account_id) {
                params.set("accountId", String(activeWs.jira_account_id));
            }

            const r = await api.get(`/jira/stories?${params}`);
            let issues = r.data.issues ?? [];

            // Filter to this workspace's board if we have one
            if (activeWs?.jira_board) {
                issues = issues.filter((s: any) =>
                    s.key.startsWith(activeWs.jira_board + "-")
                );
            }

            setStories(issues);
            setConnected(true);
        } catch {
            setConnected(false);
        } finally {
            setLoading(false);
            setWaiting(false);
        }
    };


    const router = useRouter();

    // Accounts
    const [accounts, setAccounts] = useState<JiraAccount[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [accountsLoading, setAccountsLoading] = useState(true);

    // Stories
    const [stories, setStories] = useState<any[]>([]);
    const [storiesLoading, setStoriesLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [startAt, setStartAt] = useState(0);
    const [total, setTotal] = useState(0);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    // OAuth polling
    const [waiting, setWaiting] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    // ── Load accounts ──────────────────────────────────────────────────────────
    const loadAccounts = async () => {
        setAccountsLoading(true);
        try {
            const r = await api.get("/jira/accounts");
            setAccounts(r.data ?? []);
        } catch {
            setAccounts([]);
        } finally {
            setAccountsLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
        return () => stopPolling();
    }, []);

    // ── Load stories for active account ───────────────────────────────────────
    const loadStories = useCallback(async (account: JiraAccount, offset = 0, append = false) => {
        if (offset === 0) setStoriesLoading(true);
        else setLoadingMore(true);

        try {
            const r = await api.get("/jira/stories", {
                params: { accountId: account.id, startAt: offset, maxResults: PAGE_SIZE },
            });
            const issues = r.data.issues ?? [];
            setTotal(r.data.total ?? 0);
            setStartAt(offset + issues.length);
            setStories(prev => append ? [...prev, ...issues] : issues);
        } catch (err: any) {
            if (err?.response?.status === 401 || err?.message?.includes("expired")) {
                // Token expired — remove from local list so UI updates
                await loadAccounts();
            }
        } finally {
            setStoriesLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        if (accounts.length === 0) return;
        const account = accounts[activeTab] ?? accounts[0];
        setStories([]);
        setStartAt(0);
        setCollapsed({});
        loadStories(account, 0, false);
    }, [accounts, activeTab, loadStories]);

    const loadMore = () => {
        const account = accounts[activeTab];
        if (!account || loadingMore) return;
        loadStories(account, startAt, true);
    };

    // ── OAuth connect ──────────────────────────────────────────────────────────
    const connectJira = async () => {
        const url = "http://localhost:3000/jira/oauth/start";
        try { const { invoke } = await import("@tauri-apps/api/core"); await invoke("open_url", { url }); }
        catch { window.open(url, "_blank"); }

        setWaiting(true);
        const prevCount = accounts.length;
        pollRef.current = setInterval(async () => {
            try {
                const r = await api.get("/jira/accounts");
                const newAccounts: JiraAccount[] = r.data ?? [];
                if (newAccounts.length > prevCount) {
                    stopPolling();
                    setWaiting(false);
                    setAccounts(newAccounts);
                    setActiveTab(newAccounts.length - 1); // switch to newly added
                }
            } catch { }
        }, 2000);
        setTimeout(() => { stopPolling(); setWaiting(false); }, 120000);
    };

    const toggleBoard = (board: string) =>
        setCollapsed(prev => ({ ...prev, [board]: !prev[board] }));

    // Group stories by board prefix
    const grouped = stories.reduce<Record<string, any[]>>((acc, s) => {
        const board = s.key.split("-")[0];
        if (!acc[board]) acc[board] = [];
        acc[board].push(s);
        return acc;
    }, {});

    const hasMore = startAt < total;

    // ── Empty / loading state ──────────────────────────────────────────────────
    if (accountsLoading) return (
        <Box p={4} display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading accounts...</Typography>
        </Box>
    );

    if (accounts.length === 0) return (
        <Box p={4} display="flex" flexDirection="column" gap={2} maxWidth={420}>
            <Alert severity="warning">No Jira accounts connected.</Alert>
            <Typography color="text.secondary" fontSize={14}>
                Connect your Atlassian account to view your assigned stories.
            </Typography>
            <Button variant="contained" onClick={connectJira} disabled={waiting}>
                {waiting ? "Waiting for auth…" : "Connect Jira Account"}
            </Button>
            {waiting && (
                <Typography color="text.secondary" fontSize={13}>
                    Complete the login in your browser. This will update automatically.
                </Typography>
            )}
        </Box>
    );

    const activeWs = sessionStorage.getItem("activeWorkspace");
    const ws = activeWs ? JSON.parse(activeWs) : null;


    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Header ── */}
            <Box sx={{
                position: "sticky", top: 0, zIndex: 10,
                bgcolor: "background.paper",
                borderBottom: "1px solid", borderColor: "divider",
                px: 4, pt: 2,
            }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" pb={1}>
                    <Box>
                        <Typography variant="h6" fontWeight={500}>
                            {ws?.name ?? "My Stories"}
                        </Typography>
                        {ws && (
                            <Typography variant="caption" color="text.secondary">
                                {ws.jira_board} · {ws.jira_account_name}
                            </Typography>
                        )}
                    </Box>
                    <Box display="flex" gap={1}>
                        <Button size="small" variant="outlined" onClick={connectJira} disabled={waiting}>
                            {waiting ? "Waiting…" : "+ Add Account"}
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                                const account = accounts[activeTab];
                                if (account) { setStories([]); setStartAt(0); loadStories(account, 0, false); }
                            }}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Account tabs */}
                {accounts.length > 1 && (
                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ minHeight: 40 }}
                    >
                        {accounts.map((acc, i) => (
                            <Tab
                                key={acc.id}
                                value={i}
                                label={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar
                                            src={acc.avatar_url ?? undefined}
                                            sx={{ width: 20, height: 20, fontSize: 10 }}
                                        >
                                            {acc.account_name?.[0] ?? "J"}
                                        </Avatar>
                                        <Typography fontSize={13}>
                                            {acc.account_name ?? acc.account_email ?? `Account ${i + 1}`}
                                        </Typography>
                                    </Box>
                                }
                                sx={{ minHeight: 40, textTransform: "none", px: 1.5 }}
                            />
                        ))}
                    </Tabs>
                )}
            </Box>

            {/* ── Scrollable content ── */}
            <Box sx={{ flex: 1, overflowY: "auto", px: 4, py: 3 }}>

                {storiesLoading ? (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 1 }} />
                        ))}
                    </Box>
                ) : Object.keys(grouped).length === 0 ? (
                    <Typography color="text.secondary">No stories assigned to you for this account.</Typography>
                ) : (
                    <>
                        {Object.entries(grouped).map(([board, items]) => (
                            <Box key={board} mb={4}>
                                <Box
                                    onClick={() => toggleBoard(board)}
                                    sx={{
                                        display: "flex", alignItems: "center", gap: 1.5,
                                        mb: 1.5, cursor: "pointer", userSelect: "none",
                                        "&:hover .board-label": { color: "primary.main" },
                                    }}
                                >
                                    <Typography
                                        className="board-label"
                                        fontWeight={600} fontSize={13}
                                        sx={{
                                            color: "text.secondary",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.06em",
                                            transition: "color 0.15s",
                                        }}
                                    >
                                        {board}
                                    </Typography>
                                    <Chip
                                        label={items.length}
                                        size="small"
                                        sx={{ height: 18, fontSize: 11, bgcolor: "action.selected" }}
                                    />
                                    <Typography fontSize={13} color="text.disabled" ml="auto">
                                        {collapsed[board] ? "▶" : "▼"}
                                    </Typography>
                                </Box>

                                {!collapsed[board] && (
                                    <Box display="flex" flexDirection="column" gap={1.5}>
                                        {items.map(s => (
                                            <Card
                                                key={s.key}
                                                variant="outlined"
                                                onClick={() => router.push(`/stories/${s.key}`)}
                                                sx={{
                                                    cursor: "pointer",
                                                    transition: "border-color 0.15s, box-shadow 0.15s",
                                                    "&:hover": { borderColor: "primary.main", boxShadow: "0 0 0 1px" },
                                                }}
                                            >
                                                <CardContent sx={{ py: "10px !important", px: 2 }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                        <Typography
                                                            variant="caption" fontWeight={600}
                                                            sx={{ color: "primary.main", letterSpacing: "0.03em" }}
                                                        >
                                                            {s.key}
                                                        </Typography>
                                                        <Box display="flex" gap={0.75} alignItems="center">
                                                            {s.fields?.priority?.name && (
                                                                <Box sx={{
                                                                    width: 8, height: 8, borderRadius: "50%",
                                                                    bgcolor: priorityColor(s.fields.priority.name),
                                                                    flexShrink: 0,
                                                                }} title={s.fields.priority.name} />
                                                            )}
                                                            {s.fields?.status?.name && (
                                                                <Chip
                                                                    label={s.fields.status.name}
                                                                    size="small"
                                                                    color={statusColor(s.fields.status.name) as any}
                                                                    sx={{ height: 20, fontSize: 11 }}
                                                                />
                                                            )}
                                                        </Box>
                                                    </Box>
                                                    <Typography fontSize={13} color="text.primary" lineHeight={1.4}>
                                                        {s.fields?.summary ?? s.key}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        ))}

                        {/* Pagination — load more */}
                        {hasMore && (
                            <Box display="flex" justifyContent="center" mt={2} mb={4}>
                                <Button
                                    variant="outlined"
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    startIcon={loadingMore ? <CircularProgress size={14} /> : null}
                                >
                                    {loadingMore ? "Loading…" : `Load more (${total - startAt} remaining)`}
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}
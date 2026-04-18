"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
    Box, Typography, Card, CardContent,
    Chip, CircularProgress, Alert, Button
} from "@mui/material";

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

export default function StoriesPage() {
    const router = useRouter();
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(true);
    const [waiting, setWaiting] = useState(false);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    const loadStories = async () => {
        setLoading(true);
        try {
            const r = await api.get("/jira/stories");
            setStories(r.data.issues ?? []);
            setConnected(true);
        } catch { setConnected(false); }
        finally { setLoading(false); setWaiting(false); }
    };

    const checkAndLoad = async () => {
        setLoading(true);
        try {
            const status = await api.get("/jira/status");
            if (!status.data.connected) { setConnected(false); setLoading(false); return; }
            await loadStories();
        } catch { setConnected(false); setLoading(false); }
    };

    useEffect(() => { checkAndLoad(); return () => stopPolling(); }, []);

    const connectJira = async () => {
        const url = "http://localhost:3000/jira/oauth/start";
        try { const { invoke } = await import("@tauri-apps/api/core"); await invoke("open_url", { url }); }
        catch { window.open(url, "_blank"); }
        setWaiting(true);
        pollRef.current = setInterval(async () => {
            try {
                const status = await api.get("/jira/status");
                if (status.data.connected) { stopPolling(); setWaiting(false); await loadStories(); }
            } catch { }
        }, 2000);
        setTimeout(() => { stopPolling(); setWaiting(false); }, 120000);
    };

    // Group stories by board prefix (e.g. "HAC2", "NP")
    const grouped = stories.reduce<Record<string, any[]>>((acc, s) => {
        const board = s.key.split("-")[0];
        if (!acc[board]) acc[board] = [];
        acc[board].push(s);
        return acc;
    }, {});

    const toggleBoard = (board: string) =>
        setCollapsed(prev => ({ ...prev, [board]: !prev[board] }));

    if (loading) return (
        <Box p={4} display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading stories...</Typography>
        </Box>
    );

    if (!connected) return (
        <Box p={4} display="flex" flexDirection="column" gap={2} maxWidth={400}>
            <Alert severity="warning">Jira is not connected.</Alert>
            <Typography color="text.secondary" fontSize={14}>
                Connect your Atlassian account to view your assigned stories.
            </Typography>
            <Button variant="contained" onClick={connectJira} disabled={waiting}>
                {waiting ? "Waiting for auth..." : "Connect to Jira"}
            </Button>
            {waiting && (
                <Typography color="text.secondary" fontSize={13}>
                    Complete the login in your browser. The app will update automatically.
                </Typography>
            )}
        </Box>
    );

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Sticky header ── */}
            <Box sx={{
                position: "sticky", top: 0, zIndex: 10,
                bgcolor: "background.paper",
                borderBottom: "1px solid", borderColor: "divider",
                px: 4, py: 2,
                display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <Box>
                    <Typography variant="h6" fontWeight={500}>My Stories</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {stories.length} stories across {Object.keys(grouped).length} boards
                    </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={checkAndLoad}>
                    Refresh
                </Button>
            </Box>

            {/* ── Scrollable content ── */}
            <Box sx={{ flex: 1, overflowY: "auto", px: 4, py: 3 }}>
                {Object.keys(grouped).length === 0 && (
                    <Typography color="text.secondary">No stories assigned to you.</Typography>
                )}

                {Object.entries(grouped).map(([board, items]) => (
                    <Box key={board} mb={4}>

                        {/* Board header */}
                        <Box
                            onClick={() => toggleBoard(board)}
                            sx={{
                                display: "flex", alignItems: "center", gap: 1.5,
                                mb: 1.5, cursor: "pointer",
                                userSelect: "none",
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

                        {/* Story cards */}
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
                                            "&:hover": {
                                                borderColor: "primary.main",
                                                boxShadow: "0 0 0 1px",
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ py: "10px !important", px: 2 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={600}
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
            </Box>
        </Box>
    );
}
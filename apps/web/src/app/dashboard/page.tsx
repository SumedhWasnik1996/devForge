"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace-context";
import {
    Box, Typography, CircularProgress,
    Alert, Chip, Avatar, Tooltip,
} from "@mui/material";

// ── Colour helpers ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    "to do": { bg: "#e5e7eb", text: "#374151" },
    "in progress": { bg: "#dbeafe", text: "#1d4ed8" },
    "in dev": { bg: "#dbeafe", text: "#1d4ed8" },
    "dev": { bg: "#dbeafe", text: "#1d4ed8" },
    "qa": { bg: "#ede9fe", text: "#6d28d9" },
    "done": { bg: "#dcfce7", text: "#166534" },
    "complete": { bg: "#dcfce7", text: "#166534" },
    "cancelled": { bg: "#fee2e2", text: "#991b1b" },
    "blocked": { bg: "#fee2e2", text: "#991b1b" },
};

const statusChipStyle = (name: string) => {
    const key = name.toLowerCase();
    for (const [k, v] of Object.entries(STATUS_COLORS)) {
        if (key.includes(k)) return v;
    }
    return { bg: "#f3f4f6", text: "#6b7280" };
};

const statusBarColor = (bg: string) => {
    if (bg === "#dcfce7") return "#16a34a";
    if (bg === "#dbeafe") return "#1d4ed8";
    if (bg === "#ede9fe") return "#6d28d9";
    if (bg === "#fee2e2") return "#dc2626";
    return "#9ca3af";
};

const PRIORITY_META: Record<string, { color: string }> = {
    highest: { color: "#dc2626" },
    high: { color: "#ea580c" },
    medium: { color: "#ca8a04" },
    low: { color: "#16a34a" },
    none: { color: "#9ca3af" },
};
const priorityMeta = (name: string) =>
    PRIORITY_META[name.toLowerCase()] ?? { color: "#9ca3af" };

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ── Clickable stat card ───────────────────────────────────────────────────────
function StatCard({ label, value, accent, onClick }: {
    label: string; value: number; accent?: string; onClick?: () => void;
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                border: "1px solid", borderColor: "divider",
                borderRadius: 2, p: 2,
                borderLeft: accent ? `3px solid ${accent}` : undefined,
                cursor: onClick ? "pointer" : "default",
                transition: "border-color 0.15s, background 0.15s",
                "&:hover": onClick ? {
                    borderColor: accent ?? "primary.main",
                    bgcolor: "action.hover",
                } : {},
            }}
        >
            <Typography fontSize={11} color="text.disabled"
                sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
            </Typography>
            <Typography fontSize={28} fontWeight={600} lineHeight={1.2} mt={0.5}>
                {value}
            </Typography>
            {onClick && (
                <Typography fontSize={10} color="text.disabled" mt={0.5}>
                    Click to view →
                </Typography>
            )}
        </Box>
    );
}

// ── Status breakdown ──────────────────────────────────────────────────────────
function StatusBreakdown({ byStatus, total, onStatusClick }: {
    byStatus: Record<string, number>;
    total: number;
    onStatusClick: (status: string) => void;
}) {
    const entries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
    return (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography fontWeight={600} fontSize={13}
                    sx={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary" }}>
                    By Status
                </Typography>
            </Box>
            <Box display="flex" flexDirection="column" gap={1.5}>
                {entries.map(([status, count]) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const style = statusChipStyle(status);
                    return (
                        <Box
                            key={status}
                            onClick={() => onStatusClick(status)}
                            sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
                        >
                            <Box display="flex" justifyContent="space-between"
                                alignItems="center" mb={0.5}>
                                <Box sx={{
                                    px: 1, py: 0.25, borderRadius: 9,
                                    bgcolor: style.bg, color: style.text,
                                    fontSize: 11, fontWeight: 500,
                                }}>
                                    {status}
                                </Box>
                                <Typography fontSize={12} fontWeight={600}>
                                    {count}
                                    <Typography component="span" fontSize={11}
                                        color="text.disabled" ml={0.5}>
                                        ({pct}%)
                                    </Typography>
                                </Typography>
                            </Box>
                            <Box sx={{
                                height: 4, borderRadius: 2,
                                bgcolor: "action.hover", overflow: "hidden",
                            }}>
                                <Box sx={{
                                    height: "100%", borderRadius: 2,
                                    width: `${pct}%`,
                                    bgcolor: statusBarColor(style.bg),
                                    transition: "width 0.4s ease",
                                }} />
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

// ── Priority breakdown ────────────────────────────────────────────────────────
function PriorityBreakdown({ byPriority, total, onPriorityClick }: {
    byPriority: Record<string, number>;
    total: number;
    onPriorityClick: (priority: string) => void;
}) {
    const order = ["Highest", "High", "Medium", "Low", "None"];
    const entries = order
        .map(p => [p, byPriority[p] ?? 0] as [string, number])
        .filter(([, v]) => v > 0);

    return (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography fontWeight={600} fontSize={13}
                    sx={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary" }}>
                    By Priority
                </Typography>
            </Box>
            <Box display="flex" flexDirection="column" gap={1.5}>
                {entries.map(([priority, count]) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const meta = priorityMeta(priority);
                    return (
                        <Box
                            key={priority}
                            onClick={() => onPriorityClick(priority)}
                            sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
                        >
                            <Box display="flex" justifyContent="space-between"
                                alignItems="center" mb={0.5}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Box sx={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        bgcolor: meta.color, flexShrink: 0,
                                    }} />
                                    <Typography fontSize={12}>{priority}</Typography>
                                </Box>
                                <Typography fontSize={12} fontWeight={600}>
                                    {count}
                                    <Typography component="span" fontSize={11}
                                        color="text.disabled" ml={0.5}>
                                        ({pct}%)
                                    </Typography>
                                </Typography>
                            </Box>
                            <Box sx={{
                                height: 4, borderRadius: 2,
                                bgcolor: "action.hover", overflow: "hidden",
                            }}>
                                <Box sx={{
                                    height: "100%", borderRadius: 2,
                                    width: `${pct}%`,
                                    bgcolor: meta.color,
                                    transition: "width 0.4s ease",
                                }} />
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

// ── PR card ───────────────────────────────────────────────────────────────────
function PRCard({ pr }: { pr: any }) {
    return (
        <Box
            component="a"
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
                display: "block",
                border: "1px solid", borderColor: "divider",
                borderRadius: 1.5, p: 1.5,
                textDecoration: "none",
                transition: "border-color 0.15s",
                "&:hover": { borderColor: "primary.main" },
            }}
        >
            <Box display="flex" justifyContent="space-between"
                alignItems="flex-start" gap={1}>
                <Box minWidth={0} flex={1}>
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                        <Typography fontSize={11} color="text.disabled"
                            sx={{ fontFamily: "monospace", flexShrink: 0 }}>
                            #{pr.number}
                        </Typography>
                        {pr.draft && (
                            <Box sx={{
                                fontSize: 9, fontWeight: 600, px: 0.75, py: 0.1,
                                borderRadius: 9, bgcolor: "action.selected",
                                color: "text.secondary", flexShrink: 0,
                                textTransform: "uppercase", letterSpacing: "0.05em",
                            }}>
                                Draft
                            </Box>
                        )}
                    </Box>
                    <Typography fontSize={13} fontWeight={500} color="text.primary"
                        sx={{
                            overflow: "hidden", textOverflow: "ellipsis",
                            display: "-webkit-box", WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                        }}>
                        {pr.title}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5} mt={0.75}>
                        <Typography fontSize={10} sx={{ fontFamily: "monospace" }}
                            color="text.disabled">
                            {pr.branch}
                        </Typography>
                        <Typography fontSize={10} color="text.disabled">→</Typography>
                        <Typography fontSize={10} sx={{ fontFamily: "monospace" }}
                            color="text.disabled">
                            {pr.targetBranch}
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" flexDirection="column"
                    alignItems="flex-end" gap={0.5} flexShrink={0}>
                    <Tooltip title={pr.author ?? "Unknown"} placement="left">
                        <Avatar src={pr.authorAvatar ?? undefined}
                            sx={{ width: 22, height: 22, fontSize: 10 }}>
                            {pr.author?.[0]?.toUpperCase() ?? "?"}
                        </Avatar>
                    </Tooltip>
                    <Typography fontSize={10} color="text.disabled">
                        {timeAgo(pr.updatedAt)}
                    </Typography>
                </Box>
            </Box>
            <Box display="flex" justifyContent="space-between"
                alignItems="center" mt={1}>
                <Typography fontSize={10} color="text.disabled">
                    {pr.reviewStatus}
                </Typography>
                {pr.commentCount > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <Typography fontSize={10} color="text.disabled">
                            {pr.commentCount}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const router = useRouter();
    const { activeWorkspace } = useWorkspace();

    const [jiraMetrics, setJiraMetrics] = useState<any>(null);
    const [jiraLoading, setJiraLoading] = useState(false);
    const [jiraError, setJiraError] = useState("");

    const [prs, setPrs] = useState<any[]>([]);
    const [prsLoading, setPrsLoading] = useState(false);
    const [prsError, setPrsError] = useState("");

    useEffect(() => {
        if (!activeWorkspace) return;

        setJiraLoading(true);
        api.get("/jira/metrics", {
            params: {
                board: activeWorkspace.jira_board,
                accountId: activeWorkspace.jira_account_id,
            },
        })
            .then(r => setJiraMetrics(r.data))
            .catch(() => setJiraError("Failed to load Jira metrics."))
            .finally(() => setJiraLoading(false));

        if (activeWorkspace.git_repo_url) {
            setPrsLoading(true);
            api.get("/github/prs", {
                params: {
                    repoUrl: activeWorkspace.git_repo_url,
                    accountId: activeWorkspace.github_account_id ?? undefined,
                },
            })
                .then(r => setPrs(r.data))
                .catch(() => setPrsError("Failed to load pull requests."))
                .finally(() => setPrsLoading(false));
        }
    }, [activeWorkspace?.id]);

    // ── Navigation helpers ────────────────────────────────────────────────────
    const goToStories = (params?: { status?: string; priority?: string }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.priority) qs.set("priority", params.priority);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        router.push(`/stories${suffix}`);
    };

    // Derive aggregate counts for stat cards
    const countByKeyword = (
        map: Record<string, number>,
        keywords: string[],
    ) =>
        Object.entries(map)
            .filter(([k]) => keywords.some(kw => k.toLowerCase().includes(kw)))
            .reduce((s, [, v]) => s + v, 0);

    // ── No active workspace ───────────────────────────────────────────────────
    if (!activeWorkspace) {
        return (
            <Box p={4} display="flex" flexDirection="column" alignItems="center"
                justifyContent="center" height="60vh" gap={2}>
                <Typography color="text.secondary" fontSize={14}>
                    No workspace selected
                </Typography>
                <Typography
                    fontSize={13} color="primary.main"
                    sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                    onClick={() => router.push("/workspace")}
                >
                    Select a workspace →
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>

            {/* Sticky header */}
            <Box sx={{
                position: "sticky", top: 0, zIndex: 10,
                bgcolor: "background.paper",
                borderBottom: "1px solid", borderColor: "divider",
                px: 4, py: 2,
            }}>
                <Typography variant="h6" fontWeight={500}>Dashboard</Typography>
                <Typography variant="caption" color="text.secondary">
                    {activeWorkspace.name} · {activeWorkspace.jira_board}
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflowY: "auto", p: 4 }}>

                {/* ── Jira section ── */}
                <Typography fontSize={11} fontWeight={600} color="text.disabled"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                    Jira · {activeWorkspace.jira_board}
                </Typography>

                {jiraError && (
                    <Alert severity="error" sx={{ mb: 3 }}>{jiraError}</Alert>
                )}

                {jiraLoading ? (
                    <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                        <CircularProgress size={16} />
                        <Typography fontSize={13} color="text.secondary">
                            Loading Jira metrics…
                        </Typography>
                    </Box>
                ) : jiraMetrics && (
                    <>
                        {/* ── Stat cards — click navigates to stories with no filter
                            except "Total" which goes with no filter at all ── */}
                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 2, mb: 3,
                        }}>
                            <StatCard
                                label="Total assigned"
                                value={jiraMetrics.total}
                                accent="#6366f1"
                                onClick={() => goToStories()}
                            />
                            <StatCard
                                label="In Progress"
                                value={countByKeyword(jiraMetrics.byStatus, ["progress", "dev"])}
                                accent="#1d4ed8"
                                onClick={() => {
                                    // Find the first matching actual status name
                                    const match = Object.keys(jiraMetrics.byStatus)
                                        .find(k => k.toLowerCase().includes("progress") ||
                                            k.toLowerCase().includes("dev"));
                                    if (match) goToStories({ status: match });
                                }}
                            />
                            <StatCard
                                label="In QA"
                                value={countByKeyword(jiraMetrics.byStatus, ["qa"])}
                                accent="#6d28d9"
                                onClick={() => {
                                    const match = Object.keys(jiraMetrics.byStatus)
                                        .find(k => k.toLowerCase().includes("qa"));
                                    if (match) goToStories({ status: match });
                                }}
                            />
                            <StatCard
                                label="Done"
                                value={countByKeyword(jiraMetrics.byStatus, ["done", "complete"])}
                                accent="#16a34a"
                                onClick={() => {
                                    const match = Object.keys(jiraMetrics.byStatus)
                                        .find(k => k.toLowerCase().includes("done") ||
                                            k.toLowerCase().includes("complete"));
                                    if (match) goToStories({ status: match });
                                }}
                            />
                        </Box>

                        {/* ── Breakdown panels — each row is clickable ── */}
                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 2, mb: 4,
                        }}>
                            <StatusBreakdown
                                byStatus={jiraMetrics.byStatus}
                                total={jiraMetrics.total}
                                onStatusClick={status => goToStories({ status })}
                            />
                            <PriorityBreakdown
                                byPriority={jiraMetrics.byPriority}
                                total={jiraMetrics.total}
                                onPriorityClick={priority => goToStories({ priority })}
                            />
                        </Box>
                    </>
                )}

                {/* ── GitHub PRs section ── */}
                {activeWorkspace.git_repo_url && (
                    <>
                        <Box sx={{
                            borderTop: "1px solid", borderColor: "divider",
                            pt: 3, mb: 2,
                        }}>
                            <Typography fontSize={11} fontWeight={600} color="text.disabled"
                                sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                GitHub · Active Pull Requests
                            </Typography>
                        </Box>

                        {prsError && (
                            <Alert severity="error" sx={{ mb: 2 }}>{prsError}</Alert>
                        )}

                        {prsLoading ? (
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <CircularProgress size={16} />
                                <Typography fontSize={13} color="text.secondary">
                                    Loading pull requests…
                                </Typography>
                            </Box>
                        ) : prs.length === 0 ? (
                            <Box sx={{
                                p: 3, border: "1px dashed", borderColor: "divider",
                                borderRadius: 2, textAlign: "center",
                            }}>
                                <Typography fontSize={13} color="text.disabled">
                                    No open pull requests
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <Chip
                                        label={`${prs.length} open`}
                                        size="small"
                                        sx={{
                                            height: 20, fontSize: 11, fontWeight: 600,
                                            bgcolor: "#dcfce7", color: "#166534",
                                        }}
                                    />
                                    {prs.filter(p => p.draft).length > 0 && (
                                        <Chip
                                            label={`${prs.filter(p => p.draft).length} draft`}
                                            size="small"
                                            sx={{
                                                height: 20, fontSize: 11,
                                                bgcolor: "action.selected",
                                                color: "text.secondary",
                                            }}
                                        />
                                    )}
                                </Box>
                                <Box sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, 1fr)",
                                    gap: 1.5,
                                }}>
                                    {prs.map(pr => (
                                        <PRCard key={pr.number} pr={pr} />
                                    ))}
                                </Box>
                            </>
                        )}
                    </>
                )}

                {!activeWorkspace.git_repo_url && (
                    <Box sx={{
                        mt: 2, p: 2.5,
                        border: "1px dashed", borderColor: "divider",
                        borderRadius: 2,
                    }}>
                        <Typography fontSize={13} color="text.disabled">
                            No GitHub repo configured for this workspace.{" "}
                            <Typography
                                component="span" fontSize={13} color="primary.main"
                                sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                onClick={() => router.push("/settings")}
                            >
                                Add one in Settings →
                            </Typography>
                        </Typography>
                    </Box>
                )}

            </Box>
        </Box>
    );
}
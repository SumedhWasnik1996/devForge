"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams }                 from "next/navigation";
import { api }                                        from "@/lib/api";
import { useWorkspace }                               from "@/lib/workspace-context";
import {
    Box, Typography, Card, CardContent,
    Chip, CircularProgress, Alert, Button, Skeleton,
} from "@mui/material";

// ── Colour helpers ─────────────────────────────────────────────────────────────
const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
    "to do":       { bg: "#e5e7eb", text: "#374151" },
    "in progress": { bg: "#dbeafe", text: "#1d4ed8" },
    "in dev":      { bg: "#dbeafe", text: "#1d4ed8" },
    "dev":         { bg: "#dbeafe", text: "#1d4ed8" },
    "qa":          { bg: "#ede9fe", text: "#6d28d9" },
    "done":        { bg: "#dcfce7", text: "#166534" },
    "complete":    { bg: "#dcfce7", text: "#166534" },
    "cancelled":   { bg: "#fee2e2", text: "#991b1b" },
    "blocked":     { bg: "#fee2e2", text: "#991b1b" },
};

const statusStyle = (name: string) => {
    const k = name.toLowerCase();
    for (const [key, val] of Object.entries(STATUS_CHIP)) {
        if (k.includes(key)) return val;
    }
    return { bg: "#f3f4f6", text: "#6b7280" };
};

const PRIORITY_COLOR: Record<string, string> = {
    highest: "#dc2626",
    high:    "#ea580c",
    medium:  "#ca8a04",
    low:     "#16a34a",
};
const priorityColor = (p: string) =>
    PRIORITY_COLOR[p?.toLowerCase()] ?? "#9ca3af";

const PAGE_SIZE = 20;

// ── Filter pill ────────────────────────────────────────────────────────────────
function FilterPill({
    label, onClear,
}: { label: string; onClear: () => void }) {
    return (
        <Box sx={{
            display: "flex", alignItems: "center", gap: 0.5,
            px: 1.25, py: 0.25, borderRadius: 9,
            bgcolor: "primary.main", color: "#fff",
            fontSize: 12, fontWeight: 500,
        }}>
            {label}
            <Box
                component="span"
                onClick={onClear}
                sx={{
                    ml: 0.5, cursor: "pointer", opacity: 0.8,
                    "&:hover": { opacity: 1 }, lineHeight: 1, fontSize: 14,
                }}
            >
                ×
            </Box>
        </Box>
    );
}

// ── Story card ─────────────────────────────────────────────────────────────────
function StoryCard({ story, onClick }: { story: any; onClick: () => void }) {
    const f     = story.fields ?? {};
    const style = statusStyle(f.status?.name ?? "");

    return (
        <Card
            variant="outlined"
            onClick={onClick}
            sx={{
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
                "&:hover": { borderColor: "primary.main", boxShadow: "0 0 0 1px" },
            }}
        >
            <CardContent sx={{ py: "10px !important", px: 2 }}>
                <Box display="flex" justifyContent="space-between"
                    alignItems="center" mb={0.5}>
                    <Typography
                        variant="caption" fontWeight={600}
                        sx={{ color: "primary.main", letterSpacing: "0.03em" }}
                    >
                        {story.key}
                    </Typography>
                    <Box display="flex" gap={0.75} alignItems="center">
                        {f.priority?.name && (
                            <Box sx={{
                                width: 8, height: 8, borderRadius: "50%",
                                bgcolor: priorityColor(f.priority.name), flexShrink: 0,
                            }} title={f.priority.name} />
                        )}
                        {f.status?.name && (
                            <Box sx={{
                                px: 1, py: 0.25, borderRadius: 9,
                                bgcolor: style.bg, color: style.text,
                                fontSize: 11, fontWeight: 500,
                            }}>
                                {f.status.name}
                            </Box>
                        )}
                    </Box>
                </Box>
                <Typography fontSize={13} color="text.primary" lineHeight={1.4}>
                    {f.summary ?? story.key}
                </Typography>
                {f.assignee?.displayName && (
                    <Typography fontSize={11} color="text.disabled" mt={0.5}>
                        {f.assignee.displayName}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

// ── Pagination bar ─────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPrev, onNext }: {
    page: number; totalPages: number; total: number;
    onPrev: () => void; onNext: () => void;
}) {
    if (totalPages <= 1) return null;
    return (
        <Box display="flex" justifyContent="space-between" alignItems="center"
            mt={3} mb={4}>
            <Typography fontSize={12} color="text.disabled">
                Page {page + 1} of {totalPages} · {total} stories
            </Typography>
            <Box display="flex" gap={1}>
                <Button size="small" variant="outlined"
                    onClick={onPrev} disabled={page === 0}>
                    ← Prev
                </Button>
                <Button size="small" variant="outlined"
                    onClick={onNext} disabled={page >= totalPages - 1}>
                    Next →
                </Button>
            </Box>
        </Box>
    );
}

// ── Inner page (needs useSearchParams so must be wrapped in Suspense) ──────────
function StoriesInner() {
    const router              = useRouter();
    const searchParams        = useSearchParams();
    const { activeWorkspace } = useWorkspace();

    // Filters come from URL params (set by dashboard) or are null (sidebar nav)
    const [statusFilter,   setStatusFilter]   = useState<string | null>(
        searchParams.get("status")
    );
    const [priorityFilter, setPriorityFilter] = useState<string | null>(
        searchParams.get("priority")
    );

    const [stories,       setStories]       = useState<any[]>([]);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState("");
    const [page,          setPage]          = useState(0);
    const [total,         setTotal]         = useState(0);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const load = useCallback(async (
        pageNum:  number,
        status:   string | null,
        priority: string | null,
    ) => {
        if (!activeWorkspace) return;
        setLoading(true);
        setError("");
        try {
            const r = await api.get("/jira/stories", {
                params: {
                    accountId:  activeWorkspace.jira_account_id,
                    board:      activeWorkspace.jira_board,
                    startAt:    pageNum * PAGE_SIZE,
                    maxResults: PAGE_SIZE,
                    ...(status   ? { status }   : {}),
                    ...(priority ? { priority } : {}),
                },
            });
            setStories(r.data.issues ?? []);
            setTotal(r.data.total ?? 0);
        } catch {
            setError("Failed to load stories.");
        } finally {
            setLoading(false);
        }
    }, [activeWorkspace?.id]);

    // Reload whenever filters or page change
    useEffect(() => {
        setPage(0);
        load(0, statusFilter, priorityFilter);
    }, [statusFilter, priorityFilter, activeWorkspace?.id]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        load(newPage, statusFilter, priorityFilter);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const clearStatus = () => {
        setStatusFilter(null);
        // Remove from URL without full reload
        const params = new URLSearchParams(searchParams.toString());
        params.delete("status");
        router.replace(`/stories?${params.toString()}`);
    };

    const clearPriority = () => {
        setPriorityFilter(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("priority");
        router.replace(`/stories?${params.toString()}`);
    };

    const hasFilters = !!statusFilter || !!priorityFilter;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>

            {/* Sticky header */}
            <Box sx={{
                position: "sticky", top: 0, zIndex: 10,
                bgcolor: "background.paper",
                borderBottom: "1px solid", borderColor: "divider",
                px: 4, py: 2,
            }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="h6" fontWeight={500}>
                            {activeWorkspace?.name ?? "Stories"}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
                            {activeWorkspace && (
                                <Typography variant="caption" color="text.secondary">
                                    {activeWorkspace.jira_board}
                                    {total > 0 && ` · ${total} stories`}
                                </Typography>
                            )}
                            {/* Active filter pills */}
                            {statusFilter && (
                                <FilterPill
                                    label={`Status: ${statusFilter}`}
                                    onClear={clearStatus}
                                />
                            )}
                            {priorityFilter && (
                                <FilterPill
                                    label={`Priority: ${priorityFilter}`}
                                    onClear={clearPriority}
                                />
                            )}
                            {hasFilters && (
                                <Box
                                    component="span"
                                    onClick={() => { clearStatus(); clearPriority(); }}
                                    sx={{
                                        fontSize: 11, color: "text.disabled",
                                        cursor: "pointer",
                                        "&:hover": { color: "error.main" },
                                    }}
                                >
                                    Clear all
                                </Box>
                            )}
                        </Box>
                    </Box>
                    <Button
                        size="small" variant="outlined"
                        onClick={() => load(page, statusFilter, priorityFilter)}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflowY: "auto", px: 4, py: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading ? (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                        {[...Array(PAGE_SIZE)].map((_, i) => (
                            <Skeleton key={i} variant="rectangular" height={68}
                                sx={{ borderRadius: 1 }} />
                        ))}
                    </Box>
                ) : stories.length === 0 ? (
                    <Box sx={{
                        p: 4, textAlign: "center",
                        border: "1px dashed", borderColor: "divider", borderRadius: 2,
                    }}>
                        <Typography color="text.secondary" fontSize={14}>
                            No stories found
                            {hasFilters ? " for the selected filters" : ""}.
                        </Typography>
                        {hasFilters && (
                            <Button size="small" sx={{ mt: 1.5 }}
                                onClick={() => { clearStatus(); clearPriority(); }}>
                                Clear filters
                            </Button>
                        )}
                    </Box>
                ) : (
                    <>
                        <Box display="flex" flexDirection="column" gap={1.5}>
                            {stories.map(s => (
                                <StoryCard
                                    key={s.key}
                                    story={s}
                                    onClick={() => router.push(`/stories/${s.key}`)}
                                />
                            ))}
                        </Box>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={total}
                            onPrev={() => handlePageChange(page - 1)}
                            onNext={() => handlePageChange(page + 1)}
                        />
                    </>
                )}
            </Box>
        </Box>
    );
}

// ── Export — wrapped in Suspense for useSearchParams ──────────────────────────
export default function StoriesPage() {
    return (
        <Suspense fallback={
            <Box p={4} display="flex" alignItems="center" gap={2}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">Loading…</Typography>
            </Box>
        }>
            <StoriesInner />
        </Suspense>
    );
}
"use client";
import { Box, Typography, Chip, CircularProgress, Alert, Divider } from "@mui/material";

interface PR {
    number: number;
    title: string;
    state: string;
    user: { login: string; avatar_url: string };
    head: { ref: string };
    base: { ref: string };
    created_at: string;
    updated_at: string;
    draft: boolean;
    html_url: string;
    comments: number;
    review_comments: number;
    labels: { name: string; color: string }[];
}

interface Props {
    pullRequests: PR[];
    loading: boolean;
    error?: string;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function PullRequestList({ pullRequests, loading, error }: Props) {
    if (loading) return (
        <Box display="flex" alignItems="center" justifyContent="center" p={4} gap={1}>
            <CircularProgress size={18} />
            <Typography fontSize={12} color="text.secondary">Loading pull requests…</Typography>
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ m: 2, fontSize: 12 }}>{error}</Alert>
    );

    if (pullRequests.length === 0) return (
        <Box p={3} display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Typography fontSize={24}>✓</Typography>
            <Typography fontSize={13} color="text.secondary">No open pull requests</Typography>
            <Typography fontSize={11} color="text.disabled">All clear — nothing waiting for review</Typography>
        </Box>
    );

    return (
        <Box>
            <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography fontSize={12} fontWeight={600}>
                    {pullRequests.length} open pull request{pullRequests.length !== 1 ? "s" : ""}
                </Typography>
            </Box>
            <Divider />
            {pullRequests.map((pr, i) => (
                <Box key={pr.number}>
                    <Box
                        component="a" href={pr.html_url} target="_blank" rel="noopener noreferrer"
                        sx={{
                            display: "flex", gap: 1.5, px: 2, py: 1.5,
                            textDecoration: "none", color: "inherit",
                            "&:hover": { bgcolor: "action.hover" },
                            cursor: "pointer",
                        }}
                    >
                        {/* PR icon */}
                        <Box sx={{ flexShrink: 0, mt: 0.25 }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill={pr.draft ? "#8b949e" : "#3fb950"}>
                                <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
                            </svg>
                        </Box>

                        <Box flex={1} minWidth={0}>
                            <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                                <Typography fontSize={13} fontWeight={500} noWrap sx={{ flex: 1 }}>
                                    {pr.title}
                                </Typography>
                                {pr.draft && (
                                    <Chip label="Draft" size="small" sx={{ height: 18, fontSize: 10 }} />
                                )}
                                {pr.labels.map(l => (
                                    <Box key={l.name} sx={{
                                        px: 0.75, py: 0.1, borderRadius: 9,
                                        bgcolor: `#${l.color}33`,
                                        border: "1px solid", borderColor: `#${l.color}66`,
                                        fontSize: 10, color: `#${l.color}`,
                                        fontWeight: 600, flexShrink: 0,
                                    }}>
                                        {l.name}
                                    </Box>
                                ))}
                            </Box>

                            <Box display="flex" alignItems="center" gap={1} mt={0.25} flexWrap="wrap">
                                <Typography fontSize={11} color="text.disabled">
                                    #{pr.number}
                                </Typography>
                                <Typography fontSize={11} color="text.disabled">
                                    opened {timeAgo(pr.created_at)} by {pr.user.login}
                                </Typography>
                                <Typography fontSize={11} color="text.disabled"
                                    sx={{ fontFamily: "monospace" }}>
                                    {pr.head.ref} → {pr.base.ref}
                                </Typography>
                                {(pr.comments + pr.review_comments) > 0 && (
                                    <Box display="flex" alignItems="center" gap={0.4}>
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
                                            style={{ opacity: 0.5 }}>
                                            <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Z" />
                                        </svg>
                                        <Typography fontSize={11} color="text.disabled">
                                            {pr.comments + pr.review_comments}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* Avatar */}
                        <img src={pr.user.avatar_url} width={20} height={20}
                            alt={pr.user.login}
                            style={{ borderRadius: "50%", flexShrink: 0, marginTop: 2 }} />
                    </Box>
                    {i < pullRequests.length - 1 && <Divider />}
                </Box>
            ))}
        </Box>
    );
}
"use client";
import { Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { api } from "@/lib/api";

interface Props {
    workspace: any;
    onOpen: () => void;
    onDeleted: () => void;
}

const StatusDot = ({ active, label }: { active: boolean; label: string }) => (
    <Box display="flex" alignItems="center" gap={0.75}>
        <Box sx={{
            width: 6, height: 6, borderRadius: "50%",
            bgcolor: active ? "#16a34a" : "#9ca3af",
            flexShrink: 0,
        }} />
        <Typography fontSize={11} color="text.secondary">{label}</Typography>
    </Box>
);

export default function WorkspaceCard({ workspace: ws, onOpen, onDeleted }: Props) {

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete workspace "${ws.name}"?`)) return;
        await api.delete(`/workspace/${ws.id}`);
        onDeleted();
    };

    return (
        <Box
            onClick={onOpen}
            sx={{
                border: "1px solid", borderColor: "divider",
                borderRadius: 2, p: 2.5,
                cursor: "pointer", display: "flex",
                flexDirection: "column", gap: 1.5,
                transition: "border-color 0.15s",
                "&:hover": { borderColor: "primary.main" },
                position: "relative",
            }}
        >
            {/* Delete button */}
            <Tooltip title="Delete workspace" placement="top">
                <IconButton
                    size="small"
                    onClick={handleDelete}
                    sx={{
                        position: "absolute", top: 8, right: 8,
                        opacity: 0, transition: "opacity 0.15s",
                        ".MuiBox-root:hover &": { opacity: 1 },
                        color: "text.disabled",
                        "&:hover": { color: "error.main" },
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                </IconButton>
            </Tooltip>

            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box minWidth={0}>
                    <Typography fontSize={14} fontWeight={500} noWrap>
                        {ws.name}
                    </Typography>
                    {ws.git_repo_url && (
                        <Typography fontSize={11} color="text.disabled"
                            sx={{ fontFamily: "monospace" }} noWrap>
                            {ws.git_repo_url.replace("https://github.com/", "")}
                        </Typography>
                    )}
                </Box>
                <Chip
                    label={ws.jira_board}
                    size="small"
                    sx={{
                        height: 20, fontSize: 10, fontWeight: 600,
                        bgcolor: "#dbeafe", color: "#1e40af",
                        ml: 1, flexShrink: 0,
                    }}
                />
            </Box>

            {/* Stats */}
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                <Box sx={{
                    bgcolor: "action.hover", borderRadius: 1,
                    p: 1, textAlign: "center"
                }}>
                    <Typography fontSize={16} fontWeight={500}>—</Typography>
                    <Typography fontSize={10} color="text.disabled">Stories</Typography>
                </Box>
                <Box sx={{
                    bgcolor: "action.hover", borderRadius: 1,
                    p: 1, textAlign: "center"
                }}>
                    <Typography fontSize={16} fontWeight={500}>—</Typography>
                    <Typography fontSize={10} color="text.disabled">In progress</Typography>
                </Box>
            </Box>

            {/* Status */}
            <Box display="flex" flexDirection="column" gap={0.5}>
                <StatusDot
                    active={!!ws.git_repo_url}
                    label={ws.git_repo_url ? "Git connected" : "Git not configured"}
                />
                <StatusDot
                    active={!!ws.sf_account_id}
                    label={ws.sf_account_id ? `SF: ${ws.sf_account_name ?? "linked"}` : "SF not linked"}
                />
            </Box>

            {/* Jira account */}
            <Typography fontSize={11} color="text.disabled">
                {ws.jira_account_name ?? ws.jira_account_email ?? "Unknown account"}
            </Typography>
        </Box>
    );
}
"use client";
import { Box, Typography, CircularProgress, Alert, Divider, Chip } from "@mui/material";

interface Branch {
    name: string;
    commit: { sha: string; url: string };
    protected: boolean;
}

interface Props {
    branches: Branch[];
    currentBranch: string;
    defaultBranch: string;
    loading: boolean;
    error?: string;
    onSelectBranch: (branch: string) => void;
}

export default function BranchList({
    branches, currentBranch, defaultBranch,
    loading, error, onSelectBranch,
}: Props) {
    if (loading) return (
        <Box display="flex" alignItems="center" justifyContent="center" p={4} gap={1}>
            <CircularProgress size={18} />
            <Typography fontSize={12} color="text.secondary">Loading branches…</Typography>
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ m: 2, fontSize: 12 }}>{error}</Alert>
    );

    // Sort: default first, then current, then alpha
    const sorted = [...branches].sort((a, b) => {
        if (a.name === defaultBranch) return -1;
        if (b.name === defaultBranch) return 1;
        if (a.name === currentBranch) return -1;
        if (b.name === currentBranch) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <Box>
            <Box sx={{ px: 2, py: 1.5 }}>
                <Typography fontSize={12} fontWeight={600}>
                    {branches.length} branch{branches.length !== 1 ? "es" : ""}
                </Typography>
            </Box>
            <Divider />
            {sorted.map((branch, i) => {
                const isActive = branch.name === currentBranch;
                const isDefault = branch.name === defaultBranch;

                return (
                    <Box key={branch.name}>
                        <Box
                            onClick={() => onSelectBranch(branch.name)}
                            sx={{
                                display: "flex", alignItems: "center", gap: 1.5,
                                px: 2, py: 1.25, cursor: "pointer",
                                bgcolor: isActive ? "primary.50" : "transparent",
                                "&:hover": { bgcolor: isActive ? "primary.50" : "action.hover" },
                            }}
                        >
                            {/* Branch icon */}
                            <svg width="14" height="14" viewBox="0 0 16 16"
                                fill={isActive ? "#2563eb" : "#6b7280"}>
                                <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
                            </svg>

                            <Typography
                                fontSize={13} noWrap flex={1}
                                sx={{
                                    fontFamily: "monospace",
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? "primary.main" : "text.primary",
                                }}
                            >
                                {branch.name}
                            </Typography>

                            <Box display="flex" gap={0.5} alignItems="center" flexShrink={0}>
                                {isDefault && (
                                    <Chip label="default" size="small" sx={{
                                        height: 18, fontSize: 10, fontWeight: 600,
                                        bgcolor: "#dcfce7", color: "#16a34a",
                                    }} />
                                )}
                                {isActive && !isDefault && (
                                    <Chip label="active" size="small" sx={{
                                        height: 18, fontSize: 10, fontWeight: 600,
                                        bgcolor: "#dbeafe", color: "#1e40af",
                                    }} />
                                )}
                                {branch.protected && (
                                    <Box title="Protected branch">
                                        <svg width="12" height="12" viewBox="0 0 16 16"
                                            fill="#9ca3af">
                                            <path d="M8.533.133a1.75 1.75 0 0 0-1.066 0l-5.25 1.68A1.75 1.75 0 0 0 1 3.48V8c0 3.376 2.054 6.29 5.143 7.304l.862.282.862-.282C10.946 14.29 13 11.376 13 8V3.48a1.75 1.75 0 0 0-1.217-1.667Z" />
                                        </svg>
                                    </Box>
                                )}
                                <Typography fontSize={10} color="text.disabled"
                                    sx={{ fontFamily: "monospace" }}
                                    title={branch.commit.sha}>
                                    {branch.commit.sha.slice(0, 7)}
                                </Typography>
                            </Box>
                        </Box>
                        {i < sorted.length - 1 && <Divider />}
                    </Box>
                );
            })}
        </Box>
    );
}
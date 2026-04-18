"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
    Box, Typography, CircularProgress,
    Alert, Button, Dialog
} from "@mui/material";
import WorkspaceCard from "@/components/workspace/WorkspaceCard";
import NewWorkspaceModal from "@/components/workspace/NewWorkspaceModal";

export default function HomePage() {
    const router                          = useRouter();
    const [workspaces, setWorkspaces]     = useState<any[]>([]);
    const [loading,    setLoading]        = useState(true);
    const [error,      setError]          = useState("");
    const [modalOpen,  setModalOpen]      = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get("/workspace");
            setWorkspaces(r.data);
        } catch {
            setError("Failed to load workspaces");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleWorkspaceCreated = () => {
        setModalOpen(false);
        load();
    };

    const handleOpen = (ws: any) => {
        // Store selected workspace in sessionStorage
        // so stories page knows which board to filter
        sessionStorage.setItem("activeWorkspace", JSON.stringify(ws));
        router.push("/stories");
    };

    if (loading) return (
        <Box p={4} display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading workspaces...</Typography>
        </Box>
    );

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>

            {/* Sticky header */}
            <Box sx={{
                position: "sticky", top: 0, zIndex: 10,
                bgcolor: "background.paper",
                borderBottom: "1px solid", borderColor: "divider",
                px: 4, py: 2,
                display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <Box>
                    <Typography variant="h6" fontWeight={500}>Workspaces</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {workspaces.length
                            ? `${workspaces.length} workspace${workspaces.length > 1 ? "s" : ""} configured`
                            : "No workspaces yet"}
                    </Typography>
                </Box>
                <Button
                    variant="contained" size="small"
                    onClick={() => setModalOpen(true)}
                    disableElevation
                >
                    + New workspace
                </Button>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflowY: "auto", p: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {workspaces.length === 0 ? (
                    <Box
                        sx={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            height: 400, gap: 2,
                            border: "1px dashed", borderColor: "divider",
                            borderRadius: 2,
                        }}
                    >
                        <Typography color="text.secondary" fontSize={14}>
                            No workspaces configured yet
                        </Typography>
                        <Typography color="text.disabled" fontSize={12}>
                            A workspace links a Jira board, GitHub repo and Salesforce org
                        </Typography>
                        <Button
                            variant="outlined" size="small"
                            onClick={() => setModalOpen(true)}
                        >
                            Create your first workspace
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 2,
                    }}>
                        {workspaces.map(ws => (
                            <WorkspaceCard
                                key={ws.id}
                                workspace={ws}
                                onOpen={() => handleOpen(ws)}
                                onDeleted={load}
                            />
                        ))}
                        {/* Add new card */}
                        <Box
                            onClick={() => setModalOpen(true)}
                            sx={{
                                border: "1px dashed", borderColor: "divider",
                                borderRadius: 2, p: 3,
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                gap: 1, cursor: "pointer", minHeight: 180,
                                color: "text.disabled",
                                "&:hover": { borderColor: "primary.main", color: "primary.main" },
                                transition: "border-color 0.15s, color 0.15s",
                            }}
                        >
                            <Typography fontSize={24} lineHeight={1}>+</Typography>
                            <Typography fontSize={13}>New workspace</Typography>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* New workspace modal */}
            <NewWorkspaceModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={handleWorkspaceCreated}
            />
        </Box>
    );
}
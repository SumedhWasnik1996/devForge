"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    Box, Typography, Card, CardContent,
    Chip, CircularProgress, Alert, Button
} from "@mui/material";

export default function StoriesPage() {
    const [stories,   setStories]   = useState<any[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [connected, setConnected] = useState(true);
    const [waiting,   setWaiting]   = useState(false);

    const checkAndLoad = async () => {
        setLoading(true);
        try {
            const status = await api.get("/jira/status");
            if (!status.data.connected) {
                setConnected(false);
                return;
            }
            const r = await api.get("/jira/stories");
            setStories(r.data.issues ?? []);
            setConnected(true);
        } catch {
            setConnected(false);
        } finally {
            setLoading(false);
            setWaiting(false);
        }
    };

    useEffect(() => { checkAndLoad(); }, []);

    const connectJira = async () => {
        const url = "http://localhost:3000/jira/oauth/start";
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("open_url", { url });
        } catch {
            window.location.href = url;
        }
        setWaiting(true);
    };

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
                <Box mt={1}>
                    <Typography color="text.secondary" fontSize={13} mb={1}>
                        Complete the login in your browser, then click below.
                    </Typography>
                    <Button variant="outlined" onClick={checkAndLoad}>
                        I have connected - reload
                    </Button>
                </Box>
            )}
        </Box>
    );

    return (
        <Box p={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={500}>My Stories</Typography>
                <Button size="small" variant="outlined" onClick={checkAndLoad}>
                    Refresh
                </Button>
            </Box>
            <Box display="flex" flexDirection="column" gap={2}>
                {stories.map(s => (
                    <Card key={s.key} variant="outlined" sx={{ cursor: "pointer" }}
                        onClick={() => window.location.href = `/stories/${s.key}`}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" color="primary">{s.key}</Typography>
                                <Box display="flex" gap={1}>
                                    <Chip label={s.fields.status?.name}   size="small" />
                                    <Chip label={s.fields.priority?.name} size="small" color="warning" />
                                </Box>
                            </Box>
                            <Typography mt={1}>{s.fields.summary}</Typography>
                        </CardContent>
                    </Card>
                ))}
                {stories.length === 0 && (
                    <Typography color="text.secondary">No stories assigned to you.</Typography>
                )}
            </Box>
        </Box>
    );
}
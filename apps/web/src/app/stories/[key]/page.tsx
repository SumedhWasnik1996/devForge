"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
    Box, Typography, Button, Chip,
    CircularProgress, Alert, Divider
} from "@mui/material";

export default function StoryPage() {
    const { key }                 = useParams();
    const router                  = useRouter();
    const [story,   setStory]     = useState<any>(null);
    const [loading, setLoading]   = useState(true);
    const [error,   setError]     = useState("");
    const [wsMsg,   setWsMsg]     = useState("");

    useEffect(() => {
        api.get(`/jira/stories/${key}`)
            .then(r => setStory(r.data))
            .catch(() => setError("Failed to load story."))
            .finally(() => setLoading(false));
    }, [key]);

    const openWorkspace = async () => {
        try {
            const r = await api.post(`/workspace/${key}`);
            setWsMsg(`Workspace created: ${r.data.folder}`);
        } catch {
            setWsMsg("Failed to create workspace.");
        }
    };

    if (loading) return <Box p={4}><CircularProgress /></Box>;
    if (error)   return <Box p={4}><Alert severity="error">{error}</Alert></Box>;

    const f = story.fields;

    return (
        <Box p={4} maxWidth={800}>
            <Button
                size="small"
                onClick={() => router.push("/stories")}
                sx={{ mb: 2, color: "text.secondary" }}
            >
                &larr; Back to Stories
            </Button>
            <Typography variant="caption" color="primary">{story.key}</Typography>
            <Typography variant="h5" fontWeight={500} mt={1} mb={2}>{f.summary}</Typography>
            <Box display="flex" gap={1} mb={3}>
                <Chip label={f.status?.name}   size="small" />
                <Chip label={f.priority?.name} size="small" color="warning" />
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={3}>
                <Box>
                    <Typography variant="caption" color="text.secondary">Assignee</Typography>
                    <Typography>{f.assignee?.displayName ?? "Unassigned"}</Typography>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">Sprint</Typography>
                    <Typography>{f.sprint?.name ?? "—"}</Typography>
                </Box>
            </Box>
            <Button variant="outlined" onClick={openWorkspace}>
                Open Development Workspace
            </Button>
            {wsMsg && <Alert severity="info" sx={{ mt: 2 }}>{wsMsg}</Alert>}
        </Box>
    );
}
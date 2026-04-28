"use client";
import { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, TextField, CircularProgress,
    Alert, Stepper, Step, StepLabel, Divider,
    ToggleButton, ToggleButtonGroup, Switch, FormControlLabel,
} from "@mui/material";
import { api } from "@/lib/api";

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const STEPS = ["Jira board", "GitHub repo", "Salesforce org", "Review"];

type GitMode = "connect" | "create";

export default function NewWorkspaceModal({ open, onClose, onCreated }: Props) {
    const [step, setStep] = useState(0);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Step 1 — Jira
    const [jiraAccounts, setJiraAccounts] = useState<any[]>([]);
    const [boards, setBoards] = useState<string[]>([]);
    const [workspaceName, setWorkspaceName] = useState("");
    const [jiraAccountId, setJiraAccountId] = useState<number | null>(null);
    const [jiraBoard, setJiraBoard] = useState("");

    // Step 2 — GitHub
    const [githubAccounts, setGithubAccounts] = useState<any[]>([]);
    const [githubAccountId, setGithubAccountId] = useState<number | null>(null);
    const [gitMode, setGitMode] = useState<GitMode>("connect");
    // connect mode
    const [gitRepoUrl, setGitRepoUrl] = useState("");
    const [gitBranch, setGitBranch] = useState("main");
    // create mode
    const [newRepoName, setNewRepoName] = useState("");
    const [newRepoPrivate, setNewRepoPrivate] = useState(true);
    const [creatingRepo, setCreatingRepo] = useState(false);
    const [createdRepo, setCreatedRepo] = useState<any | null>(null);

    // Step 3 — Salesforce
    const [sfAccounts, setSfAccounts] = useState<any[]>([]);
    const [sfAccountId, setSfAccountId] = useState<number | null>(null);

    useEffect(() => {
        if (!open) return;
        Promise.all([
            api.get("/jira/accounts"),
            api.get("/github/accounts"),
            api.get("/salesforce/accounts"),
        ]).then(([j, g, s]) => {
            setJiraAccounts(j.data);
            setGithubAccounts(g.data);
            setSfAccounts(s.data);
        }).catch(() => setError("Failed to load accounts"));
    }, [open]);

    useEffect(() => {
        if (!jiraAccountId) return;
        api.get(`/jira/boards/from-stories?accountId=${jiraAccountId}`)
            .then(r => setBoards(r.data.boards ?? []))
            .catch(() => { });
    }, [jiraAccountId]);

    // Auto-fill repo name from workspace name
    useEffect(() => {
        if (!newRepoName && workspaceName) {
            setNewRepoName(workspaceName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
        }
    }, [workspaceName, gitMode]);

    const reset = () => {
        setStep(0); setError(""); setWorkspaceName("");
        setJiraAccountId(null); setJiraBoard("");
        setGithubAccountId(null); setGitMode("connect");
        setGitRepoUrl(""); setGitBranch("main");
        setNewRepoName(""); setNewRepoPrivate(true); setCreatedRepo(null);
        setSfAccountId(null);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleNext = () => {
        setError("");
        if (step === 0) {
            if (!workspaceName.trim()) return setError("Workspace name is required");
            if (!jiraAccountId) return setError("Select a Jira account");
            if (!jiraBoard) return setError("Select a Jira board");
        }
        setStep(s => s + 1);
    };

    const handleCreateRepo = async () => {
        if (!newRepoName.trim()) { setError("Repo name is required"); return; }
        if (!githubAccountId) { setError("Select a GitHub account first"); return; }
        setError("");
        setCreatingRepo(true);
        try {
            const res = await api.post("/github/repos/create", {
                name: newRepoName.trim(),
                accountId: githubAccountId,
                private: newRepoPrivate,
            });
            const repo = res.data;
            setCreatedRepo(repo);
            // Auto-fill the URL so the workspace gets linked
            setGitRepoUrl(repo.clone_url);
            setGitBranch("main");
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "Failed to create repository");
        } finally {
            setCreatingRepo(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError("");
        try {
            await api.post("/workspace", {
                name: workspaceName,
                jiraAccountId,
                jiraBoard,
                githubAccountId: githubAccountId || undefined,
                gitRepoUrl: gitRepoUrl || undefined,
                gitBranch: gitBranch || "main",
                sfAccountId: sfAccountId || undefined,
            });
            reset();
            onCreated();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "Failed to create workspace");
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Shared account picker ────────────────────────────────────────────────────
    const AccountPicker = ({
        accounts, selectedId, onSelect, emptyMsg,
    }: {
        accounts: any[]; selectedId: number | null;
        onSelect: (id: number | null) => void; emptyMsg: string;
    }) => accounts.length === 0 ? (
        <Alert severity="warning" sx={{ fontSize: 12 }}>{emptyMsg}</Alert>
    ) : (
        <>
            {accounts.map(acc => (
                <Box
                    key={acc.id}
                    onClick={() => onSelect(selectedId === acc.id ? null : acc.id)}
                    sx={{
                        border: "1px solid",
                        borderColor: selectedId === acc.id ? "primary.main" : "divider",
                        borderRadius: 1.5, p: 1.5, mb: 1,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5,
                        bgcolor: selectedId === acc.id ? "primary.50" : "transparent",
                    }}
                >
                    {acc.avatar_url && (
                        <img src={acc.avatar_url} width={24} height={24}
                            style={{ borderRadius: "50%" }} alt="" />
                    )}
                    <Box>
                        <Typography fontSize={13}>{acc.account_name}</Typography>
                        {acc.account_email && (
                            <Typography fontSize={11} color="text.secondary">{acc.account_email}</Typography>
                        )}
                    </Box>
                </Box>
            ))}
        </>
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography fontWeight={500}>New workspace</Typography>
                <Typography variant="caption" color="text.secondary">
                    Link a Jira board, GitHub repo and Salesforce org
                </Typography>
            </DialogTitle>

            <Divider />

            <Box sx={{ px: 3, pt: 2 }}>
                <Stepper activeStep={step} alternativeLabel>
                    {STEPS.map(label => (
                        <Step key={label}>
                            <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: 11 } }}>
                                {label}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <DialogContent sx={{ pt: 2 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* ── Step 1 — Jira ─────────────────────────────────────────────── */}
                {step === 0 && (
                    <Box display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Workspace name" size="small" fullWidth
                            value={workspaceName}
                            onChange={e => setWorkspaceName(e.target.value)}
                            placeholder="e.g. Heat & Control"
                        />
                        <Box>
                            <Typography fontSize={12} color="text.secondary" mb={1}>Jira account</Typography>
                            <AccountPicker
                                accounts={jiraAccounts}
                                selectedId={jiraAccountId}
                                onSelect={id => setJiraAccountId(id)}
                                emptyMsg="No Jira accounts connected. Go to Settings → Connections."
                            />
                        </Box>
                        {jiraAccountId && boards.length > 0 && (
                            <Box>
                                <Typography fontSize={12} color="text.secondary" mb={1}>Select board</Typography>
                                {boards.map(board => (
                                    <Box key={board} onClick={() => setJiraBoard(board)} sx={{
                                        border: "1px solid",
                                        borderColor: jiraBoard === board ? "primary.main" : "divider",
                                        borderRadius: 1.5, p: 1.5, mb: 1, cursor: "pointer",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        bgcolor: jiraBoard === board ? "primary.50" : "transparent",
                                    }}>
                                        <Typography fontSize={13}>{board}</Typography>
                                        <Typography fontSize={10} fontWeight={600}
                                            sx={{ bgcolor: "#dbeafe", color: "#1e40af", px: 1, py: 0.25, borderRadius: 9 }}>
                                            {board}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        {jiraAccountId && boards.length === 0 && (
                            <Box>
                                <Typography fontSize={12} color="text.secondary" mb={1}>Board key</Typography>
                                <TextField size="small" fullWidth value={jiraBoard}
                                    onChange={e => setJiraBoard(e.target.value.toUpperCase())}
                                    placeholder="e.g. HAC2"
                                    helperText="Enter the board key prefix from your Jira issue keys"
                                />
                            </Box>
                        )}
                    </Box>
                )}

                {/* ── Step 2 — GitHub ────────────────────────────────────────────── */}
                {step === 1 && (
                    <Box display="flex" flexDirection="column" gap={2}>
                        {/* Account selector */}
                        <Box>
                            <Typography fontSize={12} color="text.secondary" mb={1}>
                                GitHub account (optional)
                            </Typography>
                            <AccountPicker
                                accounts={githubAccounts}
                                selectedId={githubAccountId}
                                onSelect={id => {
                                    setGithubAccountId(id);
                                    setCreatedRepo(null);
                                }}
                                emptyMsg="No GitHub accounts connected. Go to Settings → Connections."
                            />
                        </Box>

                        {/* Mode toggle */}
                        <Box>
                            <Typography fontSize={12} color="text.secondary" mb={1}>Repository</Typography>
                            <ToggleButtonGroup
                                value={gitMode}
                                exclusive
                                onChange={(_, v) => { if (v) { setGitMode(v); setCreatedRepo(null); setError(""); } }}
                                size="small"
                                fullWidth
                                sx={{ mb: 1.5 }}
                            >
                                <ToggleButton value="connect" sx={{ fontSize: 12, textTransform: "none" }}>
                                    Connect existing repo
                                </ToggleButton>
                                <ToggleButton value="create" sx={{ fontSize: 12, textTransform: "none" }}>
                                    ✦ Create new repo
                                </ToggleButton>
                            </ToggleButtonGroup>

                            {/* Connect existing */}
                            {gitMode === "connect" && (
                                <Box display="flex" flexDirection="column" gap={1.5}>
                                    <TextField label="Repository URL" size="small" fullWidth
                                        value={gitRepoUrl}
                                        onChange={e => setGitRepoUrl(e.target.value)}
                                        placeholder="https://github.com/org/repo.git"
                                    />
                                    <TextField label="Branch" size="small" fullWidth
                                        value={gitBranch}
                                        onChange={e => setGitBranch(e.target.value)}
                                        placeholder="main"
                                    />
                                </Box>
                            )}

                            {/* Create new */}
                            {gitMode === "create" && (
                                <Box display="flex" flexDirection="column" gap={1.5}>
                                    {createdRepo ? (
                                        /* ── Success state ─────────────────────────── */
                                        <Box sx={{
                                            border: "1px solid", borderColor: "success.light",
                                            bgcolor: "#f0fdf4", borderRadius: 1.5, p: 2,
                                            display: "flex", flexDirection: "column", gap: 0.5,
                                        }}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography fontSize={13} color="success.dark" fontWeight={600}>
                                                    ✓ Repository created
                                                </Typography>
                                            </Box>
                                            <Typography fontSize={12} color="text.secondary"
                                                sx={{ fontFamily: "monospace" }}>
                                                {createdRepo.full_name}
                                            </Typography>
                                            <Typography fontSize={11} color="text.disabled">
                                                Initialized with SDFX scaffold · branch: main
                                            </Typography>
                                            <Button size="small" variant="text" color="inherit"
                                                sx={{ mt: 0.5, alignSelf: "flex-start", p: 0, fontSize: 11 }}
                                                onClick={() => { setCreatedRepo(null); setGitRepoUrl(""); }}>
                                                ← Use a different repo
                                            </Button>
                                        </Box>
                                    ) : (
                                        /* ── Create form ────────────────────────────── */
                                        <>
                                            <TextField
                                                label="Repository name" size="small" fullWidth
                                                value={newRepoName}
                                                onChange={e => setNewRepoName(
                                                    e.target.value.toLowerCase()
                                                        .replace(/\s+/g, "-")
                                                        .replace(/[^a-z0-9-]/g, "")
                                                )}
                                                placeholder="my-sdfx-project"
                                                helperText="Lowercase letters, numbers and hyphens only"
                                            />
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        size="small"
                                                        checked={newRepoPrivate}
                                                        onChange={e => setNewRepoPrivate(e.target.checked)}
                                                    />
                                                }
                                                label={
                                                    <Typography fontSize={12}>
                                                        {newRepoPrivate ? "Private repository" : "Public repository"}
                                                    </Typography>
                                                }
                                            />
                                            <Alert severity="info" sx={{ fontSize: 11 }}>
                                                Creates a new GitHub repo pre-populated with an empty SDFX project scaffold
                                                (workflows, assets, .sdfx/project.json).
                                            </Alert>
                                            <Button
                                                variant="contained" size="small" disableElevation
                                                onClick={handleCreateRepo}
                                                disabled={creatingRepo || !githubAccountId || !newRepoName.trim()}
                                                startIcon={creatingRepo ? <CircularProgress size={12} /> : null}
                                            >
                                                {creatingRepo ? "Creating…" : "Create repository"}
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            )}
                        </Box>

                        {gitMode === "connect" && (
                            <Alert severity="info" sx={{ fontSize: 11 }}>
                                The repository will be cloned to your machine when you open the workspace.
                            </Alert>
                        )}
                    </Box>
                )}

                {/* ── Step 3 — Salesforce ────────────────────────────────────────── */}
                {step === 2 && (
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Typography fontSize={12} color="text.secondary">
                            Salesforce org (optional — can be configured later)
                        </Typography>
                        {sfAccounts.length === 0 ? (
                            <Alert severity="info" sx={{ fontSize: 12 }}>
                                No Salesforce orgs connected. You can skip this and configure later in Settings.
                            </Alert>
                        ) : (
                            sfAccounts.map(acc => (
                                <Box key={acc.id}
                                    onClick={() => setSfAccountId(sfAccountId === acc.id ? null : acc.id)}
                                    sx={{
                                        border: "1px solid",
                                        borderColor: sfAccountId === acc.id ? "primary.main" : "divider",
                                        borderRadius: 1.5, p: 1.5, cursor: "pointer",
                                        display: "flex", flexDirection: "column", gap: 0.25,
                                    }}
                                >
                                    <Typography fontSize={13}>{acc.account_name}</Typography>
                                    <Typography fontSize={11} color="text.secondary">{acc.instance_url}</Typography>
                                </Box>
                            ))
                        )}
                    </Box>
                )}

                {/* ── Step 4 — Review ────────────────────────────────────────────── */}
                {step === 3 && (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                        {[
                            {
                                label: "Jira",
                                rows: [
                                    ["Board", jiraBoard],
                                    ["Account", jiraAccounts.find(a => a.id === jiraAccountId)?.account_name ?? "—"],
                                ],
                            },
                            {
                                label: "GitHub",
                                rows: [
                                    ["Repo", gitRepoUrl || "Not configured"],
                                    ["Branch", gitBranch || "main"],
                                    ...(createdRepo ? [["Type", "New SDFX scaffold"]] : []),
                                ],
                            },
                            {
                                label: "Salesforce",
                                rows: [
                                    ["Org", sfAccounts.find(a => a.id === sfAccountId)?.account_name ?? "Not configured"],
                                ],
                            },
                        ].map(section => (
                            <Box key={section.label} sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 1.5 }}>
                                <Typography fontSize={10} fontWeight={600} color="text.disabled"
                                    sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mb: 1 }}>
                                    {section.label}
                                </Typography>
                                {section.rows.map(([k, v]) => (
                                    <Box key={k} display="flex" justifyContent="space-between" mb={0.5}>
                                        <Typography fontSize={12} color="text.secondary">{k}</Typography>
                                        <Typography fontSize={12} fontWeight={500}
                                            sx={{ fontFamily: k === "Repo" || k === "Branch" ? "monospace" : "inherit" }}>
                                            {v}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ px: 3, py: 1.5, justifyContent: "space-between" }}>
                <Typography fontSize={11} color="text.disabled">
                    Step {step + 1} of {STEPS.length}
                </Typography>
                <Box display="flex" gap={1}>
                    {step > 0 && (
                        <Button size="small" onClick={() => setStep(s => s - 1)}>← Back</Button>
                    )}
                    <Button size="small" onClick={handleClose}>Cancel</Button>
                    {step < 2 && (
                        <Button size="small" variant="contained" disableElevation onClick={handleNext}>
                            Next →
                        </Button>
                    )}
                    {step === 2 && (
                        <Button size="small" variant="text" color="inherit" onClick={() => setStep(3)}>
                            Skip for now
                        </Button>
                    )}
                    {step === 2 && sfAccountId && (
                        <Button size="small" variant="contained" disableElevation onClick={() => setStep(3)}>
                            Next →
                        </Button>
                    )}
                    {step === 3 && (
                        <Button size="small" variant="contained" disableElevation
                            onClick={handleSubmit} disabled={submitting}>
                            {submitting ? <CircularProgress size={14} /> : "Create workspace"}
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
}
"use client";
import { useEffect, useState, useCallback } from "react";
import {
    Box, Typography, CircularProgress, Alert,
    Select, MenuItem, FormControl, Tabs, Tab,
    IconButton, Tooltip, Chip,
} from "@mui/material";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace-context";
import RepoFileBrowser from "@/components/git/RepoFileBrowser";
import FileViewer from "@/components/git/FileViewer";
import PullRequestList from "@/components/git/PullRequestList";
import BranchList from "@/components/git/BranchList";

type TabId = "files" | "prs" | "branches";

export default function GitPage() {
    const { activeWorkspace } = useWorkspace();

    // Repo state
    const [repos, setRepos] = useState<any[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
    const [reposLoading, setReposLoading] = useState(false);
    const [reposError, setReposError] = useState("");

    // Branch
    const [branch, setBranch] = useState("main");
    const [branches, setBranches] = useState<any[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);

    // Tab
    const [tab, setTab] = useState<TabId>("files");

    // File tree
    const [tree, setTree] = useState<any[]>([]);
    const [treeLoading, setTreeLoading] = useState(false);
    const [treeError, setTreeError] = useState("");

    // File viewer
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // PRs
    const [prs, setPrs] = useState<any[]>([]);
    const [prsLoading, setPrsLoading] = useState(false);
    const [prsError, setPrsError] = useState("");

    // ─── Parse owner/repo from URL ────────────────────────────────────────────────
    const parseRepo = (url: string) => {
        try {
            const clean = url.replace(/\.git$/, "");
            const parts = new URL(clean).pathname.split("/").filter(Boolean);
            return parts.length >= 2 ? { owner: parts[0], repo: parts[1] } : null;
        } catch {
            return null;
        }
    };

    const accountId = activeWorkspace?.jira_account_id; // reuse workspace github account when available

    // ─── Load repos ───────────────────────────────────────────────────────────────
    useEffect(() => {
        setReposLoading(true);
        setReposError("");
        api.get("/github/repos?perPage=50")
            .then(r => {
                setRepos(r.data);
                // Pre-select the workspace repo if linked
                if (activeWorkspace?.git_repo_url) {
                    const parsed = parseRepo(activeWorkspace.git_repo_url);
                    if (parsed) {
                        const match = r.data.find(
                            (repo: any) => repo.owner.login === parsed.owner && repo.name === parsed.repo,
                        );
                        if (match) setSelectedRepo(match);
                    }
                }
            })
            .catch(() => setReposError("Failed to load repositories"))
            .finally(() => setReposLoading(false));
    }, [activeWorkspace?.git_repo_url]);

    // ─── Load branches ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedRepo) return;
        setBranchesLoading(true);
        api.get(`/github/repos/${selectedRepo.owner.login}/${selectedRepo.name}/branches`)
            .then(r => {
                setBranches(r.data);
                setBranch(selectedRepo.default_branch ?? "main");
            })
            .catch(() => { })
            .finally(() => setBranchesLoading(false));
    }, [selectedRepo]);

    // ─── Load file tree ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedRepo || !branch) return;
        setTreeLoading(true);
        setTreeError("");
        setSelectedFile(null);
        api.get(
            `/github/repos/${selectedRepo.owner.login}/${selectedRepo.name}/tree?branch=${branch}`,
        )
            .then(r => setTree(r.data.tree ?? []))
            .catch(e => setTreeError(e?.response?.data?.message ?? "Failed to load tree"))
            .finally(() => setTreeLoading(false));
    }, [selectedRepo, branch]);

    // ─── Load PRs ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedRepo || tab !== "prs") return;
        setPrsLoading(true);
        setPrsError("");
        api.get(`/github/repos/${selectedRepo.owner.login}/${selectedRepo.name}/pulls?state=open`)
            .then(r => setPrs(r.data))
            .catch(e => setPrsError(e?.response?.data?.message ?? "Failed to load pull requests"))
            .finally(() => setPrsLoading(false));
    }, [selectedRepo, tab]);

    // ─── No GitHub connected ──────────────────────────────────────────────────────
    if (!reposLoading && reposError === "" && repos.length === 0 && !reposLoading) {
        return (
            <Box p={4} display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Typography fontSize={32}>⎇</Typography>
                <Typography fontSize={14} fontWeight={500}>No GitHub account connected</Typography>
                <Typography fontSize={12} color="text.secondary">
                    Go to Settings → Connections to link your GitHub account.
                </Typography>
            </Box>
        );
    }

    const ownerRepo = selectedRepo
        ? { owner: selectedRepo.owner.login, repo: selectedRepo.name }
        : null;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Top bar ──────────────────────────────────────────────────────── */}
            <Box sx={{
                px: 3, py: 1.5, borderBottom: "1px solid", borderColor: "divider",
                display: "flex", alignItems: "center", gap: 2, flexShrink: 0,
                bgcolor: "background.paper",
            }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.7 }}>
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                </svg>

                {/* Repo selector */}
                <FormControl size="small" sx={{ minWidth: 260 }}>
                    <Select
                        value={selectedRepo?.full_name ?? ""}
                        displayEmpty
                        onChange={e => {
                            const r = repos.find(r => r.full_name === e.target.value);
                            setSelectedRepo(r ?? null);
                            setSelectedFile(null);
                        }}
                        sx={{ fontSize: 13 }}
                        renderValue={v => v || (
                            <Typography fontSize={13} color="text.disabled">Select repository…</Typography>
                        )}
                    >
                        {reposLoading ? (
                            <MenuItem disabled><CircularProgress size={14} sx={{ mr: 1 }} /> Loading…</MenuItem>
                        ) : (
                            repos.map(r => (
                                <MenuItem key={r.full_name} value={r.full_name}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <img src={r.owner.avatar_url} width={16} height={16}
                                            style={{ borderRadius: "50%" }} alt="" />
                                        <Typography fontSize={13}>{r.full_name}</Typography>
                                        {r.private && (
                                            <Chip label="private" size="small" sx={{ height: 16, fontSize: 9 }} />
                                        )}
                                    </Box>
                                </MenuItem>
                            ))
                        )}
                    </Select>
                </FormControl>

                {/* Branch selector */}
                {selectedRepo && (
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={branch}
                            onChange={e => setBranch(e.target.value)}
                            sx={{ fontSize: 13, fontFamily: "monospace" }}
                            startAdornment={
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
                                    style={{ marginRight: 6, opacity: 0.5 }}>
                                    <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
                                </svg>
                            }
                        >
                            {branchesLoading ? (
                                <MenuItem disabled>Loading…</MenuItem>
                            ) : (
                                branches.map(b => (
                                    <MenuItem key={b.name} value={b.name}>
                                        <Typography fontSize={12} sx={{ fontFamily: "monospace" }}>
                                            {b.name}
                                        </Typography>
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>
                )}

                {selectedRepo && (
                    <Tooltip title="Open on GitHub">
                        <IconButton
                            size="small"
                            component="a"
                            href={selectedRepo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ opacity: 0.6 }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                        </IconButton>
                    </Tooltip>
                )}

                {reposError && (
                    <Alert severity="error" sx={{ fontSize: 11, py: 0 }}>{reposError}</Alert>
                )}
            </Box>

            {!selectedRepo ? (
                <Box flex={1} display="flex" flexDirection="column"
                    alignItems="center" justifyContent="center" gap={2}>
                    <Typography fontSize={13} color="text.secondary">
                        Select a repository to get started
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>

                    {/* ── Left sidebar — file tree + branch/pr tabs ─────────────── */}
                    <Box sx={{
                        width: 260, flexShrink: 0, borderRight: "1px solid", borderColor: "divider",
                        display: "flex", flexDirection: "column", overflow: "hidden",
                    }}>
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            sx={{
                                minHeight: 36, flexShrink: 0,
                                borderBottom: "1px solid", borderColor: "divider",
                                "& .MuiTab-root": { minHeight: 36, fontSize: 11, textTransform: "none", py: 0 },
                            }}
                        >
                            <Tab value="files" label="Files" />
                            <Tab value="prs" label={
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    PRs
                                    {prs.length > 0 && (
                                        <Box sx={{
                                            bgcolor: "#ef4444", color: "white",
                                            borderRadius: 9, px: 0.5, fontSize: 9, fontWeight: 700,
                                            minWidth: 14, textAlign: "center",
                                        }}>
                                            {prs.length}
                                        </Box>
                                    )}
                                </Box>
                            } />
                            <Tab value="branches" label="Branches" />
                        </Tabs>

                        <Box sx={{ flex: 1, overflow: "auto" }}>
                            {tab === "files" && (
                                <RepoFileBrowser
                                    tree={tree}
                                    loading={treeLoading}
                                    error={treeError}
                                    selectedPath={selectedFile}
                                    onSelectFile={setSelectedFile}
                                />
                            )}
                            {tab === "prs" && (
                                <PullRequestList
                                    pullRequests={prs}
                                    loading={prsLoading}
                                    error={prsError}
                                />
                            )}
                            {tab === "branches" && (
                                <BranchList
                                    branches={branches}
                                    currentBranch={branch}
                                    defaultBranch={selectedRepo?.default_branch ?? "main"}
                                    loading={branchesLoading}
                                    onSelectBranch={b => { setBranch(b); setTab("files"); }}
                                />
                            )}
                        </Box>
                    </Box>

                    {/* ── Right panel — file viewer or empty state ──────────────── */}
                    <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        {selectedFile && ownerRepo ? (
                            <FileViewer
                                owner={ownerRepo.owner}
                                repo={ownerRepo.repo}
                                path={selectedFile}
                                branch={branch}
                                onClose={() => setSelectedFile(null)}
                            />
                        ) : (
                            <Box flex={1} display="flex" flexDirection="column"
                                alignItems="center" justifyContent="center" gap={1.5}
                                sx={{ color: "text.disabled" }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1.5" opacity={0.3}>
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                </svg>
                                <Typography fontSize={13} color="text.disabled">
                                    Select a file to view its contents
                                </Typography>
                                <Typography fontSize={11} color="text.disabled">
                                    {selectedRepo.full_name} · {branch}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
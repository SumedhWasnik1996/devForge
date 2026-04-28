"use client";
import { useEffect, useState } from "react";
import {
    Box, Typography, CircularProgress, Alert,
    IconButton, Tooltip,
} from "@mui/material";
import { api } from "@/lib/api";

interface Props {
    owner: string;
    repo: string;
    path: string;
    branch: string;
    accountId?: number;
    onClose?: () => void;
}

// Very lightweight syntax highlighter — no external dep needed.
// Adds <span> tokens via regex for common languages.
function highlight(code: string, lang: string): string {
    const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    let src = esc(code);

    if (["json"].includes(lang)) {
        src = src
            .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="hl-key">$1</span>:')
            .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="hl-str">$1</span>')
            .replace(/:\s*(\b(?:true|false|null)\b)/g, ': <span class="hl-kw">$1</span>')
            .replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span class="hl-num">$1</span>');
        return src;
    }

    if (["md", "markdown"].includes(lang)) {
        src = src
            .replace(/^(#{1,6} .+)$/gm, '<span class="hl-key">$1</span>')
            .replace(/(`[^`]+`)/g, '<span class="hl-str">$1</span>');
        return src;
    }

    // JS/TS/TSX/JSX/generic
    src = src
        // strings
        .replace(/(&#039;[^&#]*&#039;|"[^"]*"|`[^`]*`)/g, '<span class="hl-str">$1</span>')
        // comments
        .replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
        // keywords
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|from|async|await|new|this|typeof|interface|type|extends|implements|null|undefined|true|false|void|throw|try|catch|finally)\b/g,
            '<span class="hl-kw">$1</span>')
        // numbers
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hl-num">$1</span>');

    return src;
}

function langFromPath(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const MAP: Record<string, string> = {
        ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
        json: "json", md: "markdown", css: "css", html: "html",
        py: "python", rs: "rust", go: "go", sh: "shell",
        yml: "yaml", yaml: "yaml",
    };
    return MAP[ext] ?? ext;
}

function isBinary(path: string): boolean {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    return ["png", "jpg", "jpeg", "gif", "webp", "ico", "woff", "woff2", "ttf", "otf", "eot"].includes(ext);
}

function isImage(path: string): boolean {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

export default function FileViewer({ owner, repo, path, branch, accountId, onClose }: Props) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!path) return;
        setLoading(true);
        setError("");
        setContent(null);

        const params = new URLSearchParams({ path, branch });
        if (accountId) params.set("accountId", String(accountId));

        api.get(`/github/repos/${owner}/${repo}/file?${params}`)
            .then(r => {
                if (r.data.type === "file") setContent(r.data.content ?? "");
                else setContent("[Directory — select a file]");
            })
            .catch(e => setError(e?.response?.data?.message ?? "Failed to load file"))
            .finally(() => setLoading(false));
    }, [owner, repo, path, branch, accountId]);

    const handleCopy = async () => {
        if (!content) return;
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const fileName = path.split("/").pop() ?? path;
    const lang = langFromPath(path);
    const lines = content?.split("\n") ?? [];

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Header */}
            <Box sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider",
                bgcolor: "action.hover", flexShrink: 0,
            }}>
                <Box>
                    <Typography fontSize={12} fontWeight={600} sx={{ fontFamily: "monospace" }}>
                        {fileName}
                    </Typography>
                    <Typography fontSize={10} color="text.disabled" sx={{ fontFamily: "monospace" }}>
                        {path}
                    </Typography>
                </Box>
                <Box display="flex" gap={0.5} alignItems="center">
                    {lang && (
                        <Typography fontSize={10} color="text.disabled"
                            sx={{ bgcolor: "divider", px: 0.75, py: 0.25, borderRadius: 0.75 }}>
                            {lang}
                        </Typography>
                    )}
                    {content && (
                        <Tooltip title={copied ? "Copied!" : "Copy"}>
                            <IconButton size="small" onClick={handleCopy} sx={{ opacity: 0.6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    {copied
                                        ? <path d="M20 6L9 17l-5-5" />
                                        : <>
                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                        </>
                                    }
                                </svg>
                            </IconButton>
                        </Tooltip>
                    )}
                    {onClose && (
                        <Tooltip title="Close">
                            <IconButton size="small" onClick={onClose} sx={{ opacity: 0.6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
                {loading && (
                    <Box display="flex" alignItems="center" justifyContent="center" p={4}>
                        <CircularProgress size={20} />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ m: 2, fontSize: 12 }}>{error}</Alert>
                )}

                {!loading && !error && content !== null && (
                    <>
                        {isImage(path) ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <img src={`data:image/${lang};base64,${btoa(content)}`}
                                    alt={fileName} style={{ maxWidth: "100%" }} />
                            </Box>
                        ) : (
                            <>
                                {/* Syntax highlighted code */}
                                <style>{`
                                    .hl-kw    { color: #c792ea; }
                                    .hl-str   { color: #c3e88d; }
                                    .hl-num   { color: #f78c6c; }
                                    .hl-key   { color: #82aaff; }
                                    .hl-comment { color: #546e7a; font-style: italic; }
                                `}</style>
                                <Box
                                    component="table"
                                    sx={{
                                        width: "100%", borderCollapse: "collapse",
                                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                        fontSize: 12, lineHeight: 1.7,
                                    }}
                                >
                                    <tbody>
                                        {lines.map((line, i) => (
                                            <Box component="tr" key={i}
                                                sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                                                <Box component="td" sx={{
                                                    width: 40, textAlign: "right", pr: 2, pl: 1,
                                                    color: "text.disabled", fontSize: 11,
                                                    userSelect: "none", borderRight: "1px solid",
                                                    borderColor: "divider", position: "sticky", left: 0,
                                                    bgcolor: "background.paper",
                                                }}>
                                                    {i + 1}
                                                </Box>
                                                <Box component="td" sx={{ px: 2, whiteSpace: "pre" }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: highlight(line, lang)
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </tbody>
                                </Box>
                                {/* Status bar */}
                                <Box sx={{
                                    position: "sticky", bottom: 0,
                                    display: "flex", gap: 2, px: 2, py: 0.5,
                                    bgcolor: "background.paper",
                                    borderTop: "1px solid", borderColor: "divider",
                                    fontSize: 10, color: "text.disabled",
                                }}>
                                    <Typography fontSize={10} color="text.disabled">
                                        {lines.length} lines
                                    </Typography>
                                    <Typography fontSize={10} color="text.disabled">
                                        {content.length.toLocaleString()} chars
                                    </Typography>
                                    <Typography fontSize={10} color="text.disabled">
                                        {lang}
                                    </Typography>
                                </Box>
                            </>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}
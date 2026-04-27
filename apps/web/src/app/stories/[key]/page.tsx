"use client";
import {
    useEffect, useState, useRef, useCallback, ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace-context";
import {
    Box, Typography, CircularProgress, Alert,
    Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";

// ── Status chip colour ────────────────────────────────────────────────────────
const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
    "to do": { bg: "#e5e7eb", text: "#374151" },
    "in progress": { bg: "#dbeafe", text: "#1d4ed8" },
    "in dev": { bg: "#dbeafe", text: "#1d4ed8" },
    "dev": { bg: "#dbeafe", text: "#1d4ed8" },
    "qa": { bg: "#ede9fe", text: "#6d28d9" },
    "done": { bg: "#dcfce7", text: "#166534" },
    "complete": { bg: "#dcfce7", text: "#166534" },
    "cancelled": { bg: "#fee2e2", text: "#991b1b" },
    "blocked": { bg: "#fee2e2", text: "#991b1b" },
};
const statusStyle = (name: string) => {
    const k = name?.toLowerCase() ?? "";
    for (const [key, val] of Object.entries(STATUS_CHIP)) {
        if (k.includes(key)) return val;
    }
    return { bg: "#f3f4f6", text: "#6b7280" };
};

const PRIORITY_COLOR: Record<string, string> = {
    highest: "#dc2626", high: "#ea580c",
    medium: "#ca8a04", low: "#16a34a",
};
const priorityColor = (p: string) =>
    PRIORITY_COLOR[p?.toLowerCase()] ?? "#9ca3af";

// ── Jira ADF → plain text ─────────────────────────────────────────────────────
function adfToText(node: any): string {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    if (node.type === "paragraph")
        return (node.content ?? []).map(adfToText).join("") + "\n\n";
    if (node.type === "bulletList" || node.type === "orderedList")
        return (node.content ?? []).map((item: any, i: number) => {
            const bullet = node.type === "orderedList" ? `${i + 1}. ` : "• ";
            return bullet + (item.content ?? []).map(adfToText).join("").trim() + "\n";
        }).join("");
    if (node.type === "listItem")
        return (node.content ?? []).map(adfToText).join("");
    if (node.type === "heading") {
        const hashes = "#".repeat(node.attrs?.level ?? 1) + " ";
        return hashes + (node.content ?? []).map(adfToText).join("") + "\n\n";
    }
    if (node.content) return (node.content ?? []).map(adfToText).join("");
    return "";
}
const renderAdf = (field: any): string => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return adfToText(field).trim();
};

// ── Column panel ──────────────────────────────────────────────────────────────
function ColumnPanel({
    title, icon, collapsed, onToggle, children,
}: {
    title: string; icon: ReactNode; collapsed: boolean;
    onToggle: () => void; children: ReactNode;
}) {
    return (
        <Box sx={{
            height: "100%", display: "flex", flexDirection: "column",
            border: "1px solid", borderColor: "divider", borderRadius: 1.5,
            overflow: "hidden", bgcolor: "background.paper",
        }}>
            <Box
                onClick={onToggle}
                sx={{
                    display: "flex", alignItems: "center", gap: 1,
                    px: 2, py: 1.25, flexShrink: 0,
                    borderBottom: collapsed ? "none" : "1px solid",
                    borderColor: "divider",
                    cursor: "pointer", userSelect: "none",
                    bgcolor: "action.hover",
                    "&:hover": { bgcolor: "action.selected" },
                    transition: "background 0.15s",
                }}
            >
                <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
                <Typography fontSize={12} fontWeight={600}
                    sx={{ textTransform: "uppercase", letterSpacing: "0.06em", flex: 1, color: "text.primary" }}>
                    {title}
                </Typography>
                <Typography sx={{
                    color: "text.disabled", fontSize: 10,
                    transform: collapsed ? "rotate(-90deg)" : "none",
                    transition: "transform 0.2s",
                    lineHeight: 1,
                }}>▼</Typography>
            </Box>
            {!collapsed && (
                <Box sx={{ flex: 1, overflowY: "auto" }}>
                    {children}
                </Box>
            )}
        </Box>
    );
}

// ── Drag handle ───────────────────────────────────────────────────────────────
function DragHandle({ onDrag }: { onDrag: (dx: number) => void }) {
    const dragging = useRef(false);
    const lastX = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        lastX.current = e.clientX;
        e.preventDefault();
        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            const dx = ev.clientX - lastX.current;
            lastX.current = ev.clientX;
            onDrag(dx);
        };
        const onUp = () => {
            dragging.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <Box
            onMouseDown={onMouseDown}
            sx={{
                width: 6, flexShrink: 0, cursor: "col-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                "&:hover .drag-line, &:active .drag-line": { bgcolor: "primary.main" },
            }}
        >
            <Box className="drag-line" sx={{
                width: 2, height: "100%",
                bgcolor: "divider", transition: "background 0.15s",
            }} />
        </Box>
    );
}

// ── Jira accordion ────────────────────────────────────────────────────────────
function JiraAccordion({ title, content, defaultOpen = false }: {
    title: string; content: string; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Accordion
            expanded={open}
            onChange={() => setOpen(o => !o)}
            disableGutters elevation={0}
            sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}
        >
            <AccordionSummary
                expandIcon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                }
                sx={{ px: 2, minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.75 } }}
            >
                <Typography fontSize={11} fontWeight={700} color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {title}
                </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                {!content || content.trim() === "" ? (
                    <Typography fontSize={12} color="text.disabled" fontStyle="italic">
                        Not provided
                    </Typography>
                ) : (
                    <Typography fontSize={12} color="text.primary"
                        sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                        {content}
                    </Typography>
                )}
            </AccordionDetails>
        </Accordion>
    );
}

// ── Placeholder panel ─────────────────────────────────────────────────────────
function PlaceholderPanel({ icon, title, subtitle }: {
    icon: ReactNode; title: string; subtitle: string;
}) {
    return (
        <Box sx={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 1.5, px: 3,
        }}>
            <Box sx={{ opacity: 0.3, color: "text.secondary" }}>{icon}</Box>
            <Typography fontSize={13} fontWeight={500} color="text.secondary">
                {title}
            </Typography>
            <Typography fontSize={11} textAlign="center" color="text.disabled">
                {subtitle}
            </Typography>
            <Typography fontSize={11} color="text.disabled"
                sx={{
                    mt: 1, px: 2, py: 0.75,
                    border: "1px dashed", borderColor: "divider",
                    borderRadius: 1.5,
                }}>
                Coming soon — requires configuration
            </Typography>
        </Box>
    );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const JiraIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
);
const AiIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
);
const DiffIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const MIN_COL_PCT = 10;

export default function StoryPage() {
    const params = useParams();
    const router = useRouter();
    const { activeWorkspace } = useWorkspace();
    const containerRef = useRef<HTMLDivElement>(null);

    // Robustly extract the issue key regardless of Next.js folder name.
    // Supports: [key], [storyKey], [issueKey], [id], or any single dynamic segment.
    const issueKey: string = (() => {
        if (!params) return "";
        // Try common names first
        for (const name of ["key", "storyKey", "issueKey", "id", "slug"]) {
            if (params[name]) return String(params[name]);
        }
        // Fallback: take the first value in the params object
        const values = Object.values(params);
        return values.length > 0 ? String(values[0]) : "";
    })();

    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [widths, setWidths] = useState([25, 40, 35]);
    const [collapsed, setCollapsed] = useState([false, false, false]);

    useEffect(() => {
        if (!issueKey) return;
        const accountId = activeWorkspace?.jira_account_id;
        api.get(`/jira/stories/${issueKey}`, {
            params: accountId ? { accountId } : {},
        })
            .then(r => setStory(r.data))
            .catch(() => setError("Failed to load story."))
            .finally(() => setLoading(false));
    }, [issueKey]);

    const toggleCollapse = (i: number) =>
        setCollapsed(prev => prev.map((v, idx) => idx === i ? !v : v));

    const handleDrag = useCallback((handleIndex: number, dx: number) => {
        if (!containerRef.current) return;
        const totalW = containerRef.current.offsetWidth;
        const dpct = (dx / totalW) * 100;

        setWidths(prev => {
            const next = [...prev];
            next[handleIndex] += dpct;
            next[handleIndex + 1] -= dpct;

            if (next[handleIndex] < MIN_COL_PCT) {
                const over = MIN_COL_PCT - next[handleIndex];
                next[handleIndex] = MIN_COL_PCT;
                next[handleIndex + 1] -= over;
            }
            if (next[handleIndex + 1] < MIN_COL_PCT) {
                const over = MIN_COL_PCT - next[handleIndex + 1];
                next[handleIndex + 1] = MIN_COL_PCT;
                next[handleIndex] -= over;
            }

            const sum = next.reduce((a, b) => a + b, 0);
            next[handleIndex] += 100 - sum;
            return next;
        });
    }, []);

    if (loading) return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 4 }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading story…</Typography>
        </Box>
    );
    if (error) return (
        <Box p={4}><Alert severity="error">{error}</Alert></Box>
    );

    // ── Derive display values ─────────────────────────────────────────────────
    const f = story?.fields ?? {};
    const displayKey = story?.key ?? issueKey;
    const summary = f.summary ?? "";
    const statusName = f.status?.name ?? "";
    const statusSty = statusStyle(statusName);
    const priority = f.priority?.name ?? "";

    const description = renderAdf(f.description);
    const acceptanceCriteria = renderAdf(f.customfield_10016 ?? f.customfield_10014);

    const comments: any[] = f.comment?.comments ?? [];
    const solutionComment = comments.find((c: any) =>
        adfToText(c.body).toLowerCase().includes("[solution]")
    ) ?? comments[comments.length - 1];
    const solutionNotes = solutionComment ? renderAdf(solutionComment.body) : "";

    const sprintArr = f.customfield_10020;
    const sprintName = Array.isArray(sprintArr) && sprintArr.length > 0
        ? sprintArr[sprintArr.length - 1]?.name ?? null
        : null;

    return (
        <Box sx={{
            height: "100vh", display: "flex", flexDirection: "column",
            overflow: "hidden", bgcolor: "background.default",
        }}>

            {/* ── Header ── */}
            <Box sx={{
                flexShrink: 0,
                bgcolor: "background.paper",
                borderBottom: "1px solid", borderColor: "divider",
                px: 2.5, py: 1,
                display: "flex", alignItems: "center", gap: 1.5,
                minHeight: 44,
            }}>
                {/* Back */}
                <Box
                    onClick={() => router.push("/stories")}
                    sx={{
                        display: "flex", alignItems: "center", gap: 0.5,
                        cursor: "pointer", color: "text.secondary", flexShrink: 0,
                        "&:hover": { color: "primary.main" },
                        transition: "color 0.15s",
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <Typography fontSize={12} fontWeight={500} color="inherit">
                        Back
                    </Typography>
                </Box>

                {/* Vertical rule */}
                <Box sx={{
                    width: "1px", height: 18, bgcolor: "divider", flexShrink: 0,
                }} />

                {/* Issue key */}
                <Typography
                    fontSize={12} fontWeight={700} flexShrink={0}
                    sx={{ color: "primary.main", letterSpacing: "0.04em" }}
                >
                    {displayKey}
                </Typography>

                {/* Summary — fills available space, truncates */}
                <Typography
                    fontSize={13} fontWeight={500}
                    sx={{
                        flex: 1, minWidth: 0,
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", color: "text.primary",
                    }}
                >
                    {summary}
                </Typography>

                {/* Status badge */}
                {statusName && (
                    <Box sx={{
                        flexShrink: 0, px: 1.25, py: 0.3, borderRadius: 9,
                        bgcolor: statusSty.bg, color: statusSty.text,
                        fontSize: 11, fontWeight: 600, lineHeight: 1.6,
                    }}>
                        {statusName}
                    </Box>
                )}

                {/* Priority */}
                {priority && (
                    <Box sx={{
                        display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0,
                    }}>
                        <Box sx={{
                            width: 7, height: 7, borderRadius: "50%",
                            bgcolor: priorityColor(priority), flexShrink: 0,
                        }} />
                        <Typography fontSize={11} color="text.secondary">
                            {priority}
                        </Typography>
                    </Box>
                )}

                {/* Assignee */}
                {f.assignee?.displayName && (
                    <>
                        <Box sx={{ width: "1px", height: 14, bgcolor: "divider", flexShrink: 0 }} />
                        <Typography fontSize={11} color="text.disabled" flexShrink={0}>
                            {f.assignee.displayName}
                        </Typography>
                    </>
                )}

                {/* Sprint */}
                {sprintName && (
                    <>
                        <Box sx={{ width: "1px", height: 14, bgcolor: "divider", flexShrink: 0 }} />
                        <Typography fontSize={11} color="text.disabled" flexShrink={0}>
                            {sprintName}
                        </Typography>
                    </>
                )}
            </Box>

            {/* ── 3-column body ── */}
            <Box
                ref={containerRef}
                sx={{
                    flex: 1, display: "flex", overflow: "hidden",
                    p: 1.5, gap: 0,
                }}
            >
                {/* Column 0 — Jira */}
                <Box sx={{
                    flexShrink: 0, minWidth: 0,
                    width: collapsed[0] ? "40px" : `${widths[0]}%`,
                    transition: "width 0.2s",
                }}>
                    <ColumnPanel
                        title="Jira" icon={<JiraIcon />}
                        collapsed={collapsed[0]}
                        onToggle={() => toggleCollapse(0)}
                    >
                        {/* Meta strip */}
                        <Box sx={{
                            px: 2, py: 1.5, display: "flex", flexWrap: "wrap", gap: 2.5,
                            borderBottom: "1px solid", borderColor: "divider",
                            bgcolor: "action.hover",
                        }}>
                            {[
                                { label: "Assignee", value: f.assignee?.displayName ?? "Unassigned" },
                                { label: "Sprint", value: sprintName ?? "—" },
                                { label: "Priority", value: priority || "—" },
                            ].map(({ label, value }) => (
                                <Box key={label}>
                                    <Typography fontSize={10} color="text.disabled"
                                        sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.25 }}>
                                        {label}
                                    </Typography>
                                    <Typography fontSize={12} fontWeight={500} color="text.primary">
                                        {value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        <JiraAccordion title="Description" content={description} defaultOpen={true} />
                        <JiraAccordion title="Acceptance Criteria" content={acceptanceCriteria} defaultOpen={true} />
                        <JiraAccordion title="Solution Notes" content={solutionNotes} defaultOpen={false} />
                    </ColumnPanel>
                </Box>

                {/* Handle 0→1 */}
                {!collapsed[0] && !collapsed[1] && (
                    <DragHandle onDrag={dx => handleDrag(0, dx)} />
                )}

                {/* Column 1 — AI */}
                <Box sx={{
                    minWidth: 0,
                    width: collapsed[1] ? "40px" : `${widths[1]}%`,
                    transition: "width 0.2s",
                    mx: 0.75,
                }}>
                    <ColumnPanel
                        title="AI Agent" icon={<AiIcon />}
                        collapsed={collapsed[1]}
                        onToggle={() => toggleCollapse(1)}
                    >
                        <PlaceholderPanel
                            icon={
                                <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                                </svg>
                            }
                            title="AI Agent"
                            subtitle="The AI agent will assist with code generation, analysis, and suggestions based on this story."
                        />
                    </ColumnPanel>
                </Box>

                {/* Handle 1→2 */}
                {!collapsed[1] && !collapsed[2] && (
                    <DragHandle onDrag={dx => handleDrag(1, dx)} />
                )}

                {/* Column 2 — Diff */}
                <Box sx={{
                    flexShrink: 0, minWidth: 0,
                    width: collapsed[2] ? "40px" : `${widths[2]}%`,
                    transition: "width 0.2s",
                }}>
                    <ColumnPanel
                        title="File Diff" icon={<DiffIcon />}
                        collapsed={collapsed[2]}
                        onToggle={() => toggleCollapse(2)}
                    >
                        <PlaceholderPanel
                            icon={
                                <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                                    <polyline points="16 18 22 12 16 6" />
                                    <polyline points="8 6 2 12 8 18" />
                                </svg>
                            }
                            title="File Diff"
                            subtitle="Files changed by the AI agent will appear here with a diff view."
                        />
                    </ColumnPanel>
                </Box>
            </Box>
        </Box>
    );
}
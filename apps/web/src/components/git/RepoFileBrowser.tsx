"use client";
import { useState, useMemo } from "react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";

interface TreeNode {
    path: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
}

interface Props {
    tree: TreeNode[];
    loading: boolean;
    error?: string;
    selectedPath: string | null;
    onSelectFile: (path: string) => void;
}

interface FolderNode {
    name: string;
    fullPath: string;
    type: "tree";
    children: Record<string, FolderNode | FileNode>;
}

interface FileNode {
    name: string;
    fullPath: string;
    type: "blob";
    size?: number;
}

function buildTree(flatItems: TreeNode[]): Record<string, FolderNode | FileNode> {
    const root: Record<string, FolderNode | FileNode> = {};

    for (const item of flatItems) {
        const parts = item.path.split("/");
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const fullPath = parts.slice(0, i + 1).join("/");
            const isLast = i === parts.length - 1;

            if (isLast) {
                current[part] = { name: part, fullPath: item.path, type: item.type, size: item.size } as any;
            } else {
                if (!current[part]) {
                    current[part] = { name: part, fullPath, type: "tree", children: {} } as FolderNode;
                }
                current = (current[part] as FolderNode).children;
            }
        }
    }

    return root;
}

const FILE_ICON: Record<string, string> = {
    ts: "󰛦", tsx: "󰜈", js: "󰌞", jsx: "󰜈",
    json: "󰘦", md: "󰍔", css: "󰌜", html: "󰌝",
    py: "󰌠", rs: "󱘗", go: "󰟓", sh: "󰆍",
    yml: "󰗇", yaml: "󰗇", gitignore: "󰊢",
    txt: "󰦪", svg: "󰜡", png: "󰋩", jpg: "󰋩",
};

function fileIcon(name: string): string {
    if (name.startsWith(".git")) return "󰊢";
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    return FILE_ICON[ext] ?? "󰈙";
}

function TreeNodeRow({
    node, depth, selectedPath, onSelectFile,
}: {
    node: FolderNode | FileNode;
    depth: number;
    selectedPath: string | null;
    onSelectFile: (path: string) => void;
}) {
    const [open, setOpen] = useState(depth < 2);

    if (node.type === "tree") {
        const folder = node as FolderNode;
        const entries = Object.values(folder.children).sort((a, b) => {
            if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        return (
            <Box>
                <Box
                    onClick={() => setOpen(o => !o)}
                    sx={{
                        display: "flex", alignItems: "center", gap: 0.75,
                        pl: 1 + depth * 1.5,
                        py: 0.4, pr: 1,
                        cursor: "pointer", borderRadius: 0.75,
                        "&:hover": { bgcolor: "action.hover" },
                        userSelect: "none",
                    }}
                >
                    <Typography fontSize={11} sx={{ opacity: 0.5, minWidth: 12 }}>
                        {open ? "▾" : "▸"}
                    </Typography>
                    <Typography fontSize={11} sx={{ opacity: 0.6 }}>📁</Typography>
                    <Typography fontSize={12} color="text.primary" noWrap>{folder.name}</Typography>
                </Box>
                {open && entries.map(child => (
                    <TreeNodeRow key={child.fullPath} node={child} depth={depth + 1}
                        selectedPath={selectedPath} onSelectFile={onSelectFile} />
                ))}
            </Box>
        );
    }

    const file = node as FileNode;
    const isSelected = selectedPath === file.fullPath;

    return (
        <Box
            onClick={() => onSelectFile(file.fullPath)}
            sx={{
                display: "flex", alignItems: "center", gap: 0.75,
                pl: 1 + depth * 1.5, py: 0.4, pr: 1,
                cursor: "pointer", borderRadius: 0.75,
                bgcolor: isSelected ? "primary.50" : "transparent",
                borderLeft: isSelected ? "2px solid" : "2px solid transparent",
                borderColor: isSelected ? "primary.main" : "transparent",
                "&:hover": { bgcolor: isSelected ? "primary.50" : "action.hover" },
                userSelect: "none",
            }}
        >
            <Typography fontSize={11} sx={{ minWidth: 14, opacity: 0.5 }}>
                {fileIcon(file.name)}
            </Typography>
            <Typography fontSize={12} noWrap
                color={isSelected ? "primary.main" : "text.primary"}
                sx={{ flex: 1, fontFamily: "monospace", fontWeight: isSelected ? 600 : 400 }}>
                {file.name}
            </Typography>
            {file.size != null && (
                <Typography fontSize={10} color="text.disabled" sx={{ flexShrink: 0 }}>
                    {file.size < 1024 ? `${file.size}B` : `${(file.size / 1024).toFixed(1)}K`}
                </Typography>
            )}
        </Box>
    );
}

export default function RepoFileBrowser({ tree, loading, error, selectedPath, onSelectFile }: Props) {
    const treeMap = useMemo(() => buildTree(tree), [tree]);

    const entries = useMemo(() =>
        Object.values(treeMap).sort((a, b) => {
            if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
            return a.name.localeCompare(b.name);
        }),
        [treeMap],
    );

    if (loading) return (
        <Box display="flex" alignItems="center" justifyContent="center" p={3}>
            <CircularProgress size={18} />
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ m: 1, fontSize: 11 }}>{error}</Alert>
    );

    if (tree.length === 0) return (
        <Box p={2}>
            <Typography fontSize={12} color="text.disabled">No files</Typography>
        </Box>
    );

    return (
        <Box sx={{ overflowY: "auto", height: "100%", py: 0.5 }}>
            {entries.map(node => (
                <TreeNodeRow key={node.fullPath} node={node} depth={0}
                    selectedPath={selectedPath} onSelectFile={onSelectFile} />
            ))}
        </Box>
    );
}
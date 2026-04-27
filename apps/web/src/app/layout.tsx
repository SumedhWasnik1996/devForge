"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThemeContextProvider, useThemeMode } from "@/lib/theme-context";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "@/lib/mui-theme";
import Sidebar from "@/components/Sidebar";

// ── One-time boot redirect ────────────────────────────────────────────────────
// Only fires once when the app first loads on /workspace.
// After that it never interferes with user navigation.
function AutoRedirect() {
    const router = useRouter();
    const pathname = usePathname();
    const { activeWorkspace } = useWorkspace();
    const hasRedirected = useRef(false);

    useEffect(() => {
        if (hasRedirected.current) return;
        if (pathname !== "/workspace") return;
        if (activeWorkspace) {
            hasRedirected.current = true;
            router.replace("/dashboard");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeWorkspace]);   // intentionally omit pathname/router — boot-only

    return null;
}

// ── Workspace footer bar ──────────────────────────────────────────────────────
function WorkspaceFooter() {
    const { activeWorkspace } = useWorkspace();

    if (!activeWorkspace) return null;

    const sfOrgType = activeWorkspace.sf_instance_url
        ? (activeWorkspace.sf_instance_url.includes("sandbox") ||
            activeWorkspace.sf_instance_url.includes("test.")
            ? "Sandbox" : "Production")
        : null;

    const segments = [
        {
            icon: (
                // Workspace / grid icon
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                </svg>
            ),
            label: activeWorkspace.name,
            color: "var(--footer-text-primary)",
        },
        {
            icon: (
                // Jira / ticket icon
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
            ),
            label: activeWorkspace.jira_account_name
                ? `${activeWorkspace.jira_account_name} · ${activeWorkspace.jira_board}`
                : activeWorkspace.jira_board,
            color: "var(--footer-text-secondary)",
        },
        // Only show SF segments when an org is linked
        ...(activeWorkspace.sf_account_id && sfOrgType ? [{
            icon: (
                // Cloud icon for Salesforce
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                </svg>
            ),
            label: sfOrgType,
            color: sfOrgType === "Sandbox" ? "var(--footer-badge-sandbox)" : "var(--footer-badge-prod)",
            badge: true,
        }] : []),
        ...(activeWorkspace.sf_account_name ? [{
            icon: (
                // User icon
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
            label: activeWorkspace.sf_account_name,
            color: "var(--footer-text-secondary)",
        }] : []),
    ];

    return (
        <div style={{
            position: "fixed",
            bottom: 0,
            left: 56,   // flush with sidebar right edge
            right: 0,
            height: 28,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            paddingRight: 16,
            gap: 0,
            background: "var(--footer-bg)",
            borderTop: "1px solid var(--footer-border)",
            zIndex: 90,
            userSelect: "none",
        }}>
            {segments.map((seg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    {/* Separator — not before first item */}
                    {i > 0 && (
                        <span style={{
                            margin: "0 10px",
                            color: "var(--footer-separator)",
                            fontSize: 12,
                            lineHeight: 1,
                        }}>
                            ·
                        </span>
                    )}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: seg.color,
                    }}>
                        <span style={{ opacity: 0.7, display: "flex", alignItems: "center" }}>
                            {seg.icon}
                        </span>
                        {(seg as any).badge ? (
                            // Org type pill badge
                            <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                padding: "1px 6px",
                                borderRadius: 9,
                                background: sfOrgType === "Sandbox"
                                    ? "var(--footer-badge-sandbox-bg)"
                                    : "var(--footer-badge-prod-bg)",
                                color: seg.color,
                                border: `1px solid ${sfOrgType === "Sandbox"
                                    ? "var(--footer-badge-sandbox-border)"
                                    : "var(--footer-badge-prod-border)"}`,
                            }}>
                                {seg.label}
                            </span>
                        ) : (
                            <span style={{ fontSize: 11, fontWeight: i === 0 ? 600 : 400 }}>
                                {seg.label}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── App shell ─────────────────────────────────────────────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
    const { mode } = useThemeMode();
    const { activeWorkspace } = useWorkspace();
    const theme = buildTheme(mode);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div style={{ display: "flex", height: "100vh" }}>
                <Sidebar />
                <main style={{
                    marginLeft: 56,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    // Push content up when footer is visible so nothing is hidden under it
                    paddingBottom: activeWorkspace ? 28 : 0,
                    minHeight: "100vh",
                    overflow: "auto",
                }}>
                    <AutoRedirect />
                    {children}
                </main>
            </div>
            <WorkspaceFooter />
        </ThemeProvider>
    );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <ThemeContextProvider>
                    <WorkspaceProvider>
                        <AppShell>{children}</AppShell>
                    </WorkspaceProvider>
                </ThemeContextProvider>
            </body>
        </html>
    );
}
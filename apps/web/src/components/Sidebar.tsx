"use client";
import { usePathname, useRouter } from "next/navigation";
import { Tooltip } from "@mui/material";

const NAV = [
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
        ),
        label: "Dashboard", href: "/dashboard",
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
            </svg>
        ),
        label: "All Stories", href: "/stories",
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                <path d="M6 9v6" /><path d="M15.7 16.3L8.3 9.7" /><path d="M18 15V9a3 3 0 0 0-3-3H9" />
            </svg>
        ),
        label: "Git", href: "/git",
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
        label: "Logs", href: "/logs",
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <aside style={{
            width: 56, minWidth: 56, height: "100vh",
            display: "flex", flexDirection: "column", alignItems: "center",
            borderRight: "1px solid var(--sidebar-border)",
            background: "var(--sidebar-bg)",
            paddingTop: 12, paddingBottom: 12,
            position: "fixed", left: 0, top: 0, zIndex: 100,
        }}>

            {/* Logo */}
            <Tooltip title="DevForge" placement="right">
                <div style={{
                    width: 32, height: 32, borderRadius: 8, marginBottom: 24,
                    background: "#2563eb", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#fff", fontWeight: 700,
                    fontSize: 13, cursor: "pointer", flexShrink: 0,
                }}
                    onClick={() => router.push("/dashboard")}
                >
                    DF
                </div>
            </Tooltip>

            {/* Nav items */}
            <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                {NAV.map(({ icon, label, href }) => {
                    const active = pathname.startsWith(href);
                    return (
                        <Tooltip key={href} title={label} placement="right">
                            <button
                                onClick={() => router.push(href)}
                                style={{
                                    width: 36, height: 36, borderRadius: 8, border: "none",
                                    background: active ? "var(--sidebar-active-bg)" : "transparent",
                                    color: active ? "var(--sidebar-active-color)" : "var(--sidebar-icon-color)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", transition: "background 0.15s, color 0.15s",
                                }}
                                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--sidebar-hover-bg)"; }}
                                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                            >
                                {icon}
                            </button>
                        </Tooltip>
                    );
                })}
            </nav>

            {/* Settings at bottom */}
            <Tooltip title="Settings" placement="right">
                <button
                    onClick={() => router.push("/settings")}
                    style={{
                        width: 36, height: 36, borderRadius: 8, border: "none",
                        background: pathname.startsWith("/settings") ? "var(--sidebar-active-bg)" : "transparent",
                        color: pathname.startsWith("/settings") ? "var(--sidebar-active-color)" : "var(--sidebar-icon-color)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "background 0.15s, color 0.15s",
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>
            </Tooltip>
        </aside>
    );
}
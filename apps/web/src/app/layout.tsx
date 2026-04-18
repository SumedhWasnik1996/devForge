"use client";
import { ThemeContextProvider, useThemeMode } from "@/lib/theme-context";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "@/lib/mui-theme";
import Sidebar from "@/components/Sidebar";
//import type { Metadata } from "next";

//export const metadata: Metadata = { title: "DevForge" };

function AppShell({ children }: { children: React.ReactNode }) {
    const { mode } = useThemeMode();
    const theme    = buildTheme(mode);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div style={{ display: "flex" }}>
                <Sidebar />
                <main style={{ marginLeft: 56, flex: 1, minHeight: "100vh" }}>
                    {children}
                </main>
            </div>
        </ThemeProvider>
    );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <ThemeContextProvider>
                    <AppShell>{children}</AppShell>
                </ThemeContextProvider>
            </body>
        </html>
    );
}

//export default function RootLayout({ children }: { children: React.ReactNode }) {
//    return (
//        <html lang="en">

//            <body style={{ margin: 0, display: "flex", height: "100vh", overflow: "hidden" }}>
//                <Sidebar />
//                <main style={{ marginLeft: 56, flex: 1, overflow: "auto" }}>
//                    {children}
//                </main>
//            </body>
//        </html>
//    );
//}
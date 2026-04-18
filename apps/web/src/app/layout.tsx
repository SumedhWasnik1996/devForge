import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = { title: "DevForge" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body style={{ margin: 0, display: "flex", height: "100vh", overflow: "hidden" }}>
                <Sidebar />
                <main style={{ marginLeft: 56, flex: 1, overflow: "auto" }}>
                    {children}
                </main>
            </body>
        </html>
    );
}
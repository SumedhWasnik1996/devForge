import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "DevForge",
    description: "Local Salesforce Developer Workstation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}

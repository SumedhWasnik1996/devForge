import { createTheme } from "@mui/material/styles";

export const buildTheme = (mode: "light" | "dark") =>
    createTheme({
        palette: {
            mode,
            ...(mode === "dark" ? {
                background: {
                    default: "#0f1117",
                    paper: "#1a1d27",   // ← this fixes your white card headers
                },
                divider: "#ffffff14",
            } : {
                background: {
                    default: "#f5f6fa",
                    paper: "#ffffff",
                },
                divider: "#e0e0e0",
            }),
        },
        components: {
            MuiCard: {
                styleOverrides: {
                    root: { backgroundImage: "none" }, // stops MUI elevation overlay
                },
            },
            MuiCardHeader: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: theme.palette.background.paper,
                    }),
                },
            },
        },
    });
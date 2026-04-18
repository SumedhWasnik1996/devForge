"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Mode = "light" | "dark";

const ThemeContext = createContext<{ mode: Mode; toggle: () => void }>({
    mode: "dark",
    toggle: () => { },
});

export function ThemeContextProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<Mode>("dark");

    useEffect(() => {
        const saved = localStorage.getItem("theme") as Mode | null;
        if (saved) setMode(saved);
    }, []);

    const toggle = () => {
        setMode(prev => {
            const next = prev === "dark" ? "light" : "dark";
            localStorage.setItem("theme", next);
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ mode, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useThemeMode = () => useContext(ThemeContext);
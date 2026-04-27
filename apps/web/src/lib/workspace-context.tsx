"use client";
import {
    createContext, useContext, useState, useEffect,
    useCallback, ReactNode,
} from "react";

export interface ActiveWorkspace {
    id: number;
    name: string;
    jira_board: string;
    jira_account_id: number;
    jira_account_name: string | null;
    jira_account_email: string | null;
    git_repo_url: string | null;
    git_branch: string | null;
    sf_account_id: number | null;
    sf_account_name: string | null;
    sf_instance_url: string | null;
}

interface WorkspaceContextValue {
    activeWorkspace: ActiveWorkspace | null;
    setActiveWorkspace: (ws: ActiveWorkspace | null) => void;
    clearActiveWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
    activeWorkspace: null,
    setActiveWorkspace: () => { },
    clearActiveWorkspace: () => { },
});

const STORAGE_KEY = "devforge_active_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [activeWorkspace, setActiveWorkspaceState] = useState<ActiveWorkspace | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on first mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                setActiveWorkspaceState(parsed);
                // Also keep sessionStorage in sync for any code still reading it
                sessionStorage.setItem("activeWorkspace", raw);
            }
        } catch {
            // corrupt data — ignore
        } finally {
            setHydrated(true);
        }
    }, []);

    const setActiveWorkspace = useCallback((ws: ActiveWorkspace | null) => {
        setActiveWorkspaceState(ws);
        if (ws) {
            const raw = JSON.stringify(ws);
            localStorage.setItem(STORAGE_KEY, raw);
            sessionStorage.setItem("activeWorkspace", raw);
        } else {
            localStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem("activeWorkspace");
        }
    }, []);

    const clearActiveWorkspace = useCallback(() => {
        setActiveWorkspace(null);
    }, [setActiveWorkspace]);

    // Don't render children until we've read localStorage
    // (prevents flash of "no workspace" state)
    if (!hydrated) return null;

    return (
        <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace, clearActiveWorkspace }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export const useWorkspace = () => useContext(WorkspaceContext);
// Demo fixtures are opt-in only. Production builds must use persisted backend data.
export const isDemoMode = import.meta.env.VITE_ENABLE_DEMO_DATA === "true";

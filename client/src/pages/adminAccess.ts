export type AdminAccessState = "loading" | "unauthenticated" | "forbidden" | "allowed";

export function getAdminAccessState(input: {
  loading: boolean;
  isAuthenticated: boolean;
  role?: string | null;
}): AdminAccessState {
  if (input.loading) return "loading";
  if (!input.isAuthenticated) return "unauthenticated";
  return input.role === "admin" ? "allowed" : "forbidden";
}

export function getAdminAccessMessage(state: Exclude<AdminAccessState, "loading" | "allowed">) {
  if (state === "unauthenticated") return "Your administrator session is required to continue.";
  return "Your account does not have administrator access.";
}


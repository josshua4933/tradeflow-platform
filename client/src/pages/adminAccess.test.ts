import { describe, expect, it } from "vitest";
import { getAdminAccessMessage, getAdminAccessState } from "./adminAccess";

describe("admin access state", () => {
  it("keeps the loading state while auth is unresolved", () => {
    expect(getAdminAccessState({ loading: true, isAuthenticated: false })).toBe("loading");
  });

  it("identifies unauthenticated visitors", () => {
    const state = getAdminAccessState({ loading: false, isAuthenticated: false });
    expect(state).toBe("unauthenticated");
    expect(getAdminAccessMessage(state)).toContain("administrator session");
  });

  it("identifies authenticated standard users as forbidden", () => {
    const state = getAdminAccessState({ loading: false, isAuthenticated: true, role: "user" });
    expect(state).toBe("forbidden");
    expect(getAdminAccessMessage(state)).toContain("administrator access");
  });

  it("allows only authenticated administrators", () => {
    expect(getAdminAccessState({ loading: false, isAuthenticated: true, role: "admin" })).toBe("allowed");
  });
});

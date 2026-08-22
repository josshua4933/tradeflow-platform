import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRouter } from "./routers/admin";

const mocks = vi.hoisted(() => ({
  getAllTraderProfilesForAdmin: vi.fn(),
  updateTraderProfileByAdmin: vi.fn(),
  logAudit: vi.fn(),
}));

const { getAllTraderProfilesForAdmin, updateTraderProfileByAdmin, logAudit } = mocks;

vi.mock("./db", () => mocks);

const makeContext = (role: "admin" | "user") => ({
  user: { id: 99, role, name: "Test User", email: "test@example.com" },
  req: { protocol: "https", headers: {} },
  res: {},
}) as any;

describe("admin leaderboard management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns leaderboard profiles only through the admin procedure", async () => {
    const profiles = [{ id: 7, userId: 12, displayName: "Atlas", monthlyReturn: "12.5000" }];
    getAllTraderProfilesForAdmin.mockResolvedValue(profiles);

    const result = await adminRouter.createCaller(makeContext("admin")).getLeaderboardProfiles({ limit: 25 });

    expect(result).toEqual(profiles);
    expect(getAllTraderProfilesForAdmin).toHaveBeenCalledWith(25);
    await expect(adminRouter.createCaller(makeContext("user")).getLeaderboardProfiles({ limit: 25 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects empty edits and invalid performance ranges", async () => {
    const caller = adminRouter.createCaller(makeContext("admin"));

    await expect(caller.updateLeaderboardProfile({ profileId: 7 })).rejects.toThrow("Provide at least one leaderboard field to update");
    await expect(caller.updateLeaderboardProfile({ profileId: 7, winRate: 101 })).rejects.toThrow();
    expect(updateTraderProfileByAdmin).not.toHaveBeenCalled();
  });

  it("persists admin changes as normalized decimals and records an audit entry", async () => {
    const before = { id: 7, displayName: "Atlas", monthlyReturn: "2.0000" };
    const after = { ...before, displayName: "Atlas Prime", monthlyReturn: "12.3456" };
    updateTraderProfileByAdmin.mockResolvedValue({ before, after });

    const result = await adminRouter.createCaller(makeContext("admin")).updateLeaderboardProfile({
      profileId: 7,
      displayName: " Atlas Prime ",
      monthlyReturn: 12.3456,
      winRate: 76.5,
      totalProfit: 987.12,
      totalTrades: 42,
      isPublic: true,
      allowCopying: true,
    });

    expect(result).toEqual({ success: true, profile: after });
    expect(updateTraderProfileByAdmin).toHaveBeenCalledWith({
      profileId: 7,
      displayName: "Atlas Prime",
      monthlyReturn: "12.3456",
      winRate: "76.50",
      totalProfit: "987.12000000",
      totalTrades: 42,
      isPublic: true,
      allowCopying: true,
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      userId: 99,
      action: "admin.update_leaderboard_profile",
      entity: "trader_profile",
      entityId: "7",
      details: expect.objectContaining({ before, after }),
    }));
    await expect(adminRouter.createCaller(makeContext("user")).updateLeaderboardProfile({ profileId: 7, displayName: "Blocked" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

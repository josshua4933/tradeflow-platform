import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  runSettlementSweep: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./settlementSweep", () => ({ runSettlementSweep: mocks.runSettlementSweep }));

import { handleSettlementSweep } from "./scheduledSettlement";

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  } as any;
  response.status.mockReturnValue(response);
  return response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task_123" });
  mocks.runSettlementSweep.mockResolvedValue({ accountsScanned: 2, accountsSettled: 2, positionsClosed: 1, liquidations: 0 });
});

describe("scheduled settlement handler", () => {
  it("accepts a cron caller and returns an idempotent sweep summary", async () => {
    const response = makeResponse();
    await handleSettlementSweep({ originalUrl: "/api/scheduled/settleAccounts" } as any, response);

    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, taskUid: "task_123", accountsScanned: 2 }));
  });

  it("rejects authenticated non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false, taskUid: undefined });
    const response = makeResponse();

    await handleSettlementSweep({ originalUrl: "/api/scheduled/settleAccounts" } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(mocks.runSettlementSweep).not.toHaveBeenCalled();
  });

  it("returns structured diagnostics when the sweep fails", async () => {
    mocks.runSettlementSweep.mockRejectedValue(new Error("database unavailable"));
    const response = makeResponse();

    await handleSettlementSweep({ originalUrl: "/api/scheduled/settleAccounts" } as any, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: "database unavailable", context: { url: "/api/scheduled/settleAccounts", taskUid: "task_123" } }));
  });
});

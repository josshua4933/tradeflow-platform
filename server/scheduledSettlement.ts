import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runSettlementSweep } from "./settlementSweep";

export async function handleSettlementSweep(req: Request, res: Response) {
  let taskUid: string | undefined;

  try {
    const user = await sdk.authenticateRequest(req);
    taskUid = user.taskUid;
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const result = await runSettlementSweep();
    return res.json({
      ok: true,
      taskUid: user.taskUid,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SettlementSweep] Failed:", error);
    return res.status(500).json({
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        url: req.originalUrl,
        taskUid,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  getUserLessonProgress: vi.fn(),
  getUserQuizScores: vi.fn(),
  saveUserQuizScore: vi.fn(),
  setUserLessonProgress: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { educationRouter } from "./routers/education";

function makeContext(): TrpcContext {
  return {
    user: { id: 42 } as TrpcContext["user"],
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("education router", () => {
  beforeEach(() => {
    dbMock.getUserLessonProgress.mockReset().mockResolvedValue([]);
    dbMock.getUserQuizScores.mockReset().mockResolvedValue([]);
    dbMock.saveUserQuizScore.mockReset().mockResolvedValue(undefined);
    dbMock.setUserLessonProgress.mockReset().mockResolvedValue(undefined);
  });

  it("returns the curriculum with the current user's completion and score history", async () => {
    dbMock.getUserLessonProgress.mockResolvedValue([
      { lessonId: "introduction-to-forex-trading", isCompleted: true },
      { lessonId: "leverage-and-margin", isCompleted: false },
    ]);
    dbMock.getUserQuizScores.mockResolvedValue([
      { lessonId: "introduction-to-forex-trading", score: 2, totalQuestions: 2, passed: true },
    ]);

    const result = await educationRouter.createCaller(makeContext()).curriculum();

    expect(result.lessons.length).toBe(12);
    expect(result.completedLessonIds).toEqual(["introduction-to-forex-trading"]);
    expect(result.quizScores).toHaveLength(1);
    expect(dbMock.getUserLessonProgress).toHaveBeenCalledWith(42);
    expect(dbMock.getUserQuizScores).toHaveBeenCalledWith(42);
  });

  it("persists a lesson completion update for the authenticated user", async () => {
    const result = await educationRouter.createCaller(makeContext()).setLessonCompleted({
      lessonId: "reading-candlestick-charts",
      isCompleted: true,
    });

    expect(result).toEqual({ success: true, lessonId: "reading-candlestick-charts", isCompleted: true });
    expect(dbMock.setUserLessonProgress).toHaveBeenCalledWith(42, "reading-candlestick-charts", true);
  });

  it("scores quiz answers on the server and records passing attempts", async () => {
    const result = await educationRouter.createCaller(makeContext()).submitQuiz({
      lessonId: "introduction-to-forex-trading",
      answers: [1, 0],
    });

    expect(result).toMatchObject({ lessonId: "introduction-to-forex-trading", score: 2, totalQuestions: 2, passed: true, passingScore: 2 });
    expect(dbMock.saveUserQuizScore).toHaveBeenCalledWith({ userId: 42, lessonId: "introduction-to-forex-trading", score: 2, totalQuestions: 2, passed: true });
    expect(dbMock.setUserLessonProgress).toHaveBeenCalledWith(42, "introduction-to-forex-trading", true);
  });

  it("rejects incomplete quiz submissions before recording a result", async () => {
    await expect(educationRouter.createCaller(makeContext()).submitQuiz({
      lessonId: "introduction-to-forex-trading",
      answers: [1],
    })).rejects.toThrow("Submit one answer for every quiz question");

    expect(dbMock.saveUserQuizScore).not.toHaveBeenCalled();
  });
});

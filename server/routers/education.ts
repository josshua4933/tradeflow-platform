import { z } from "zod";
import { getEducationLesson, EDUCATION_LESSONS } from "../../shared/education";
import {
  getUserLessonProgress,
  getUserQuizScores,
  saveUserQuizScore,
  setUserLessonProgress,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

function requireLesson(lessonId: string) {
  const lesson = getEducationLesson(lessonId);
  if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Education lesson not found" });
  return lesson;
}

export const educationRouter = router({
  curriculum: protectedProcedure.query(async ({ ctx }) => {
    const [progress, scores] = await Promise.all([
      getUserLessonProgress(ctx.user.id),
      getUserQuizScores(ctx.user.id),
    ]);

    return {
      lessons: EDUCATION_LESSONS,
      completedLessonIds: progress.filter((item) => item.isCompleted).map((item) => item.lessonId),
      quizScores: scores,
    };
  }),

  lesson: protectedProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .query(({ input }) => requireLesson(input.lessonId)),

  setLessonCompleted: protectedProcedure
    .input(z.object({ lessonId: z.string().min(1), isCompleted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireLesson(input.lessonId);
      await setUserLessonProgress(ctx.user.id, input.lessonId, input.isCompleted);
      return { success: true, lessonId: input.lessonId, isCompleted: input.isCompleted };
    }),

  submitQuiz: protectedProcedure
    .input(z.object({ lessonId: z.string().min(1), answers: z.array(z.number().int().min(0)) }))
    .mutation(async ({ ctx, input }) => {
      const lesson = requireLesson(input.lessonId);
      if (input.answers.length !== lesson.quiz.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Submit one answer for every quiz question" });
      }

      const score = lesson.quiz.reduce((total, question, index) => total + (question.correctIndex === input.answers[index] ? 1 : 0), 0);
      const passed = score >= Math.ceil(lesson.quiz.length * 0.7);
      await saveUserQuizScore({
        userId: ctx.user.id,
        lessonId: lesson.id,
        score,
        totalQuestions: lesson.quiz.length,
        passed,
      });
      if (passed) await setUserLessonProgress(ctx.user.id, lesson.id, true);

      return {
        lessonId: lesson.id,
        score,
        totalQuestions: lesson.quiz.length,
        passed,
        passingScore: Math.ceil(lesson.quiz.length * 0.7),
      };
    }),
});

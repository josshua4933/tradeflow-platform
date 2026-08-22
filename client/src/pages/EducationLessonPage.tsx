import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, CircleHelp, ExternalLink, Loader2, RotateCcw, Trophy } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TradingLayout from "@/components/TradingLayout";
import { trpc } from "@/lib/trpc";

const levelStyles = {
  Beginner: "bg-emerald-50 text-emerald-700",
  Intermediate: "bg-amber-50 text-amber-700",
  Advanced: "bg-rose-50 text-rose-700",
} as const;

export default function EducationLessonPage() {
  const [, params] = useRoute<{ lessonId: string }>("/education/:lessonId");
  const [, navigate] = useLocation();
  const lessonId = params?.lessonId ?? "";
  const utils = trpc.useUtils();
  const lessonQuery = trpc.education.lesson.useQuery({ lessonId }, { enabled: Boolean(lessonId) });
  const curriculumQuery = trpc.education.curriculum.useQuery();
  const completionMutation = trpc.education.setLessonCompleted.useMutation({
    onSuccess: () => utils.education.curriculum.invalidate(),
  });
  const quizMutation = trpc.education.submitQuiz.useMutation({
    onSuccess: () => utils.education.curriculum.invalidate(),
  });
  const lesson = lessonQuery.data;
  const [answers, setAnswers] = useState<number[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const scoreResult = quizMutation.data;
  const completed = useMemo(() => Boolean(curriculumQuery.data?.completedLessonIds.includes(lessonId)), [curriculumQuery.data?.completedLessonIds, lessonId]);
  const selectedCount = answers.filter((answer) => answer !== undefined).length;

  if (lessonQuery.isLoading || curriculumQuery.isLoading) {
    return <TradingLayout><div className="flex min-h-full items-center justify-center gap-2 bg-[#f7f5f0] text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading lesson…</div></TradingLayout>;
  }

  if (lessonQuery.isError || !lesson) {
    return <TradingLayout><div className="flex min-h-full flex-col items-center justify-center bg-[#f7f5f0] px-6 text-center"><h1 className="font-serif text-2xl font-bold text-slate-900">Lesson not found</h1><p className="mt-2 text-sm text-slate-600">This learning lesson is not available.</p><Button className="mt-5 bg-slate-900" onClick={() => navigate("/education")}>Back to education</Button></div></TradingLayout>;
  }

  const handleSubmitQuiz = () => {
    if (answers.length !== lesson.quiz.length || answers.some((answer) => answer === undefined)) return;
    setHasSubmitted(true);
    quizMutation.mutate({ lessonId: lesson.id, answers });
  };

  return <TradingLayout>
    <div className="min-h-full bg-[#f7f5f0] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/education" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to education</Link>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main>
            <div className="border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{lesson.category}</span><Badge variant="outline" className={`border-0 ${levelStyles[lesson.level]}`}>{lesson.level}</Badge><span className="text-xs text-slate-500">{lesson.durationMinutes} min lesson</span></div>
              <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title}</h1>
              <p className="mt-3 text-base leading-7 text-slate-600">{lesson.objective}</p>
              <div className="mt-6 border-l-2 border-slate-900 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"><strong>Learning objective:</strong> {lesson.objective}</div>
              <div className="mt-8 space-y-8">
                {lesson.sections.map((section) => <section key={section.heading}><h2 className="font-serif text-xl font-bold">{section.heading}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>{section.bullets && <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-2"><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />{bullet}</li>)}</ul>}</section>)}
              </div>
              <div className="mt-8 border-t border-slate-200 pt-6"><h2 className="font-serif text-xl font-bold">Key takeaways</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{lesson.keyTakeaways.map((takeaway) => <div key={takeaway} className="bg-slate-50 p-3 text-xs leading-5 text-slate-600">{takeaway}</div>)}</div></div>
            </div>

            <section className="mt-6 border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"><CircleHelp className="h-4 w-4" />Knowledge check</div><h2 className="mt-2 font-serif text-2xl font-bold">Test your understanding</h2><p className="mt-1 text-sm text-slate-600">Answer every question. A score of 70% or higher completes the lesson.</p></div>{scoreResult && <div className={`text-right ${scoreResult.passed ? "text-emerald-700" : "text-rose-700"}`}><div className="text-2xl font-bold">{scoreResult.score}/{scoreResult.totalQuestions}</div><div className="text-xs font-medium">{scoreResult.passed ? "Passed" : "Try again"}</div></div>}</div>
              <div className="mt-6 space-y-5">{lesson.quiz.map((question, questionIndex) => <fieldset key={question.id} className="border-t border-slate-100 pt-5"><legend className="text-sm font-semibold text-slate-900">{questionIndex + 1}. {question.prompt}</legend><div className="mt-3 grid gap-2">{question.options.map((option, optionIndex) => { const isSelected = answers[questionIndex] === optionIndex; const isCorrect = scoreResult && optionIndex === question.correctIndex; const isWrongSelection = scoreResult && isSelected && !isCorrect; return <button key={option} type="button" onClick={() => { if (!hasSubmitted || scoreResult) { const next = [...answers]; next[questionIndex] = optionIndex; setAnswers(next); setHasSubmitted(false); if (scoreResult) quizMutation.reset(); } }} className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left text-sm transition ${isCorrect ? "border-emerald-400 bg-emerald-50 text-emerald-800" : isWrongSelection ? "border-rose-300 bg-rose-50 text-rose-800" : isSelected ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 hover:border-slate-400"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${isSelected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"}`}>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>; })}</div>{scoreResult && <p className="mt-2 text-xs leading-5 text-slate-600">{question.explanation}</p>}</fieldset>)}</div>
              <div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={handleSubmitQuiz} disabled={selectedCount !== lesson.quiz.length || quizMutation.isPending} className="gap-2 bg-slate-900">{quizMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}Submit answers</Button>{scoreResult && <Button variant="outline" onClick={() => { setAnswers([]); setHasSubmitted(false); quizMutation.reset(); }} className="gap-2 bg-white"><RotateCcw className="h-4 w-4" />Try again</Button>}</div>
              {scoreResult && <div className={`mt-4 flex items-start gap-2 border px-3 py-3 text-sm ${scoreResult.passed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{scoreResult.passed ? "Great work. The lesson is now marked complete." : `You need at least ${scoreResult.passingScore} correct answers. Review the explanations and try again.`}</div>}
            </section>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lesson status</div><div className="mt-3 flex items-center gap-2 text-sm font-semibold">{completed ? <><CheckCircle2 className="h-5 w-5 text-emerald-600" />Completed</> : <><BookOpenIcon />In progress</>}</div><Button variant={completed ? "outline" : "default"} onClick={() => completionMutation.mutate({ lessonId: lesson.id, isCompleted: !completed })} disabled={completionMutation.isPending} className="mt-4 w-full gap-2 bg-slate-900"><CheckCircle2 className="h-4 w-4" />{completed ? "Mark incomplete" : "Mark lesson complete"}</Button></div>
            {lesson.practiceHref && <div className="border border-slate-200 bg-slate-900 p-5 text-white shadow-sm"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Practise now</div><p className="mt-2 text-sm leading-6 text-slate-300">Apply this lesson in the relevant TradeFlow tool, then return to complete the knowledge check.</p><Link href={lesson.practiceHref} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">{lesson.practiceLabel ?? "Open tool"}<ExternalLink className="h-4 w-4" /></Link></div>}
            <div className="border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Study plan</div><p className="mt-2 text-sm leading-6 text-slate-600">Read the lesson, practise without risking more than planned, and record what you learned.</p><Link href="/education" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900 hover:underline">Browse all lessons <ChevronRight className="h-4 w-4" /></Link></div>
          </aside>
        </div>
      </div>
    </div>
  </TradingLayout>;
}

function BookOpenIcon() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500">•</span>;
}

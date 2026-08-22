import { useMemo, useState } from "react";
import { Award, BookOpen, CheckCircle2, ChevronRight, Clock3, GraduationCap, Loader2, Sparkles, Target } from "lucide-react";
import { Link } from "wouter";
import TradingLayout from "@/components/TradingLayout";
import CertificateModal from "@/components/CertificateModal";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const levelStyles = {
  Beginner: "bg-emerald-50 text-emerald-700",
  Intermediate: "bg-amber-50 text-amber-700",
  Advanced: "bg-rose-50 text-rose-700",
} as const;

export default function EducationPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc.education.curriculum.useQuery();
  const claimMutation = trpc.education.claimCertificate.useMutation({
    onSuccess: () => {
      utils.education.curriculum.invalidate();
      toast.success("Congratulations! Your graduation certificate has been issued.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const lessons = data?.lessons ?? [];
  const completedIds = new Set(data?.completedLessonIds ?? []);
  const completedCount = completedIds.size;
  const progressPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const allCompleted = lessons.length > 0 && completedCount >= lessons.length;
  const certificate = data?.certificate ?? null;

  const groupedLessons = useMemo(() => {
    const grouped = new Map<string, typeof lessons>();
    lessons.forEach((lesson) => grouped.set(lesson.category, [...(grouped.get(lesson.category) ?? []), lesson]));
    return Array.from(grouped.entries());
  }, [lessons]);

  return (
    <TradingLayout>
      <div className="min-h-full bg-[#f7f5f0] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"><span className="h-px w-7 bg-slate-400" />Learning center</div>
              <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Education & Certification</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Master market mechanics, risk management, and platform tools to earn your official TradeFlow diploma.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="border border-slate-200 bg-white px-3 py-3 shadow-sm"><div className="text-[10px] uppercase tracking-wider text-slate-500">Lessons</div><div className="mt-1 text-xl font-bold">{lessons.length}</div></div>
              <div className="border border-slate-200 bg-white px-3 py-3 shadow-sm"><div className="text-[10px] uppercase tracking-wider text-slate-500">Completed</div><div className="mt-1 text-xl font-bold text-emerald-700">{completedCount}</div></div>
              <div className="border border-slate-200 bg-white px-3 py-3 shadow-sm"><div className="text-[10px] uppercase tracking-wider text-slate-500">Progress</div><div className="mt-1 text-xl font-bold">{progressPercent}%</div></div>
            </div>
          </div>

          <div className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-slate-500" />Your learning path</div><span className="text-xs text-slate-500">{completedCount} of {lessons.length} lessons complete</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progressPercent}%` }} /></div>
              <p className="mt-3 text-xs text-slate-500">Complete all curriculum lessons and pass their knowledge checks to unlock your official diploma.</p>
            </div>

            <div className={`border p-4 shadow-sm transition flex items-center justify-between gap-4 ${certificate || allCompleted ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${certificate || allCompleted ? "border-amber-300 bg-amber-100 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Graduation Badge</div>
                  <div className="text-sm font-bold text-slate-900">{certificate ? "Diploma Unlocked" : allCompleted ? "Ready to Claim" : `${completedCount}/${lessons.length} Complete`}</div>
                </div>
              </div>
              <Button onClick={() => setIsModalOpen(true)} size="sm" className={`gap-1.5 ${certificate || allCompleted ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-slate-900"}`}>
                <Sparkles className="h-3.5 w-3.5" />
                {certificate ? "View Diploma" : allCompleted ? "Claim Diploma" : "View Status"}
              </Button>
            </div>
          </div>

          {isLoading && <div className="flex min-h-56 items-center justify-center gap-2 border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your curriculum…</div>}
          {isError && <div className="border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">We could not load your education progress. Refresh the page and try again.</div>}

          {!isLoading && !isError && <div className="space-y-8">
            {groupedLessons.map(([category, categoryLessons]) => (
              <section key={category}>
                <div className="mb-3 flex items-end justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Module</div><h2 className="mt-1 font-serif text-2xl font-bold">{category}</h2></div><span className="text-xs text-slate-500">{categoryLessons.length} lessons</span></div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {categoryLessons.map((lesson) => {
                    const isCompleted = completedIds.has(lesson.id);
                    return <Link key={lesson.id} href={`/education/${lesson.id}`} className="group border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 sm:p-5">
                      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-700"><BookOpen className="h-4 w-4" /></div><div className="min-w-0"><h3 className="font-semibold text-slate-900 group-hover:underline">{lesson.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{lesson.description}</p></div></div>{isCompleted ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />}</div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-2 py-1 font-medium ${levelStyles[lesson.level]}`}>{lesson.level}</span><span className="inline-flex items-center gap-1 text-slate-500"><Clock3 className="h-3.5 w-3.5" />{lesson.durationMinutes} min</span><span className="inline-flex items-center gap-1 text-slate-500"><Target className="h-3.5 w-3.5" />{lesson.quiz.length} questions</span></div>
                    </Link>;
                  })}
                </div>
              </section>
            ))}
          </div>}

          <CertificateModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            certificate={certificate}
            allCompleted={allCompleted}
            onClaim={() => claimMutation.mutate()}
            isClaiming={claimMutation.isPending}
          />
        </div>
      </div>
    </TradingLayout>
  );
}

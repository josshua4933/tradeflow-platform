import { Award, CheckCircle2, Download, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CertificateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    certificateCode: string;
    courseTitle: string;
    recipientName: string;
    issuedAt: Date | string;
  } | null;
  allCompleted: boolean;
  onClaim: () => void;
  isClaiming: boolean;
};

export default function CertificateModal({ isOpen, onClose, certificate, allCompleted, onClaim, isClaiming }: CertificateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        {certificate ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              <Award className="h-7 w-7" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Official Graduation Certificate</div>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-slate-900">TradeFlow Academy</h2>
            <p className="mt-3 text-xs text-slate-500">This certifies that</p>
            <p className="mt-1 font-serif text-2xl font-bold text-slate-900">{certificate.recipientName}</p>
            <p className="mt-2 text-xs text-slate-500">has successfully mastered all curriculum requirements and completed the</p>
            <p className="mt-1 font-semibold text-slate-800">{certificate.courseTitle}</p>

            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
              <div>Certificate ID: <span className="font-mono font-semibold text-slate-800">{certificate.certificateCode}</span></div>
              <div>Issued: <span className="font-medium text-slate-800">{new Date(certificate.issuedAt).toLocaleDateString()}</span></div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button onClick={() => window.print()} variant="outline" className="gap-2 bg-white"><Download className="h-4 w-4" />Print / Save PDF</Button>
              <Button onClick={onClose} className="bg-slate-900">Close</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200">
              <Award className="h-7 w-7" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Achievement Badge & Certificate</div>
            <h2 className="mt-1 font-serif text-2xl font-bold text-slate-900">TradeFlow Masterclass Diploma</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              {allCompleted
                ? "You have completed all curriculum lessons and passed your knowledge checks! Claim your official graduation certificate now."
                : "Complete all curriculum lessons across Fundamentals, Technical Analysis, and Advanced Topics to unlock your official TradeFlow diploma."}
            </p>

            <div className="mt-6">
              {allCompleted ? (
                <Button onClick={onClaim} disabled={isClaiming} className="gap-2 bg-slate-900 px-6">
                  {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-400" />}
                  Claim Graduation Certificate
                </Button>
              ) : (
                <Button variant="outline" disabled className="gap-2 bg-slate-50 text-slate-400">
                  <CheckCircle2 className="h-4 w-4" /> Complete remaining lessons to unlock
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

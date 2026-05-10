import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, User, Key, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function KYCSection() {
  const { data: kycDocs } = trpc.account.kycDocuments.useQuery();
  const { data: me } = trpc.auth.me.useQuery();
  const submitKyc = trpc.account.submitKyc.useMutation({
    onSuccess: () => toast.success("KYC documents submitted for review"),
    onError: (err) => toast.error(err.message),
  });
  const [docType, setDocType] = useState("passport");
  const [docUrl, setDocUrl] = useState("");
  const [country, setCountry] = useState("US");

  const kycStatus = me?.kycStatus ?? "not_submitted";
  const latestDoc = kycDocs?.[kycDocs.length - 1];

  const statusIcon: Record<string, React.ReactNode> = {
    not_submitted: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
    submitted: <Clock className="h-5 w-5 text-yellow-500" />,
    approved: <CheckCircle2 className="h-5 w-5 text-bull" />,
    rejected: <AlertCircle className="h-5 w-5 text-bear" />,
  };

  return (
    <div className="space-y-4">
      <div className="border border-border p-4 flex items-center gap-3">
        {statusIcon[kycStatus] ?? statusIcon.not_submitted}
        <div>
          <div className="font-semibold text-sm">KYC Status: <span className="capitalize">{kycStatus.replace("_", " ")}</span></div>
          <div className="text-xs text-muted-foreground">
            {kycStatus === "approved" ? "Your identity has been verified." :
             kycStatus === "submitted" ? "Documents under review (1-2 business days)." :
             kycStatus === "rejected" ? `Rejected: Please resubmit with valid documents.` :
             "Submit documents to unlock full trading features."}
          </div>
        </div>
      </div>

      {(kycStatus === "not_submitted" || kycStatus === "rejected") && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Document Type</Label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-border bg-background px-3 py-2 text-sm rounded">
              <option value="passport">Passport</option>
              <option value="national_id">National ID</option>
              <option value="drivers_license">Driver's License</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Document URL (upload link)</Label>
            <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." />
            <p className="text-xs text-muted-foreground mt-1">Upload your document to a secure storage service and paste the link here.</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Country of Issue</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" maxLength={2} />
          </div>
          <Button onClick={() => submitKyc.mutate({ documentType: docType as any, documentUrl: docUrl, country })}
            disabled={submitKyc.isPending || !docUrl}>
            {submitKyc.isPending ? "Submitting..." : "Submit KYC Documents"}
          </Button>
        </div>
      )}
    </div>
  );
}

function TwoFASection() {
  const { data: me } = trpc.auth.me.useQuery();
  const twoFa = { enabled: me?.twoFactorEnabled ?? false };
  const setup = trpc.account.setup2FA.useMutation();
  const verify = trpc.account.verify2FA.useMutation({
    onSuccess: () => toast.success("2FA enabled successfully"),
    onError: (err) => toast.error(err.message),
  });
  const disable = trpc.account.disable2FA.useMutation({
    onSuccess: () => toast.success("2FA disabled"),
    onError: (err) => toast.error(err.message),
  });
  const [token, setToken] = useState("");

  return (
    <div className="space-y-4">
      <div className="border border-border p-4 flex items-center gap-3">
        <Shield className={`h-5 w-5 ${twoFa?.enabled ? "text-bull" : "text-muted-foreground"}`} />
        <div>
          <div className="font-semibold text-sm">Two-Factor Authentication: {twoFa?.enabled ? "Enabled" : "Disabled"}</div>
          <div className="text-xs text-muted-foreground">
            {twoFa?.enabled ? "Your account is protected with 2FA." : "Enable 2FA for enhanced account security."}
          </div>
        </div>
      </div>

      {!twoFa?.enabled && (
        <div className="space-y-3">
          {!setup.data ? (
            <Button variant="outline" onClick={() => setup.mutate()} disabled={setup.isPending}>
              {setup.isPending ? "Generating..." : "Set Up 2FA"}
            </Button>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">Scan this QR code with your authenticator app:</div>
              <div className="border border-border p-4 inline-block bg-white">
                <QRCodeSVG value={setup.data.otpauth} size={160} />
              </div>
              <div className="text-xs text-muted-foreground">Or enter manually: <code className="font-mono bg-secondary px-1 py-0.5 rounded">{setup.data.secret}</code></div>
              <div className="flex gap-2">
                <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="max-w-40" />
                <Button onClick={() => verify.mutate({ token })} disabled={verify.isPending || token.length !== 6}>Verify</Button>
              </div>
            </>
          )}
        </div>
      )}

      {twoFa?.enabled && (
        <div className="flex gap-2">
          <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter code to disable" maxLength={6} className="max-w-40" />
          <Button variant="destructive" onClick={() => disable.mutate({ token })} disabled={disable.isPending || token.length !== 6}>
            Disable 2FA
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AccountSettings() {
  const { user } = useAuth();
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-6 bg-foreground/30"></div>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Settings</span>
        </div>
        <h1 className="font-serif text-3xl font-bold">Account</h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="kyc"><FileText className="h-3.5 w-3.5 mr-1.5" />KYC</TabsTrigger>
          <TabsTrigger value="security"><Key className="h-3.5 w-3.5 mr-1.5" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="border border-border p-5 bg-card space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center text-2xl font-bold font-serif">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div>
                <div className="font-serif text-xl font-bold">{user?.name ?? "Trader"}</div>
                <div className="text-sm text-muted-foreground">{user?.email ?? "No email"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Account Type:</span> <span className="font-medium">Standard</span></div>
              <div><span className="text-muted-foreground">Member Since:</span> <span className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kyc">
          <KYCSection />
        </TabsContent>

        <TabsContent value="security">
          <TwoFASection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

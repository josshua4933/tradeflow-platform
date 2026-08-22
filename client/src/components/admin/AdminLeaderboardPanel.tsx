import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

type LeaderboardProfile = {
  id: number;
  userId: number;
  displayName: string;
  bio: string | null;
  isPublic: boolean;
  allowCopying: boolean;
  totalTrades: number | null;
  winRate: string | number | null;
  totalProfit: string | number | null;
  monthlyReturn: string | number | null;
  maxDrawdown: string | number | null;
  followersCount: number | null;
  email: string | null;
  userName: string | null;
};

type FormState = {
  displayName: string;
  bio: string;
  isPublic: boolean;
  allowCopying: boolean;
  totalTrades: string;
  winRate: string;
  totalProfit: string;
  monthlyReturn: string;
  maxDrawdown: string;
  followersCount: string;
};

const profileToForm = (profile: LeaderboardProfile): FormState => ({
  displayName: profile.displayName ?? "",
  bio: profile.bio ?? "",
  isPublic: Boolean(profile.isPublic),
  allowCopying: Boolean(profile.allowCopying),
  totalTrades: String(profile.totalTrades ?? 0),
  winRate: String(profile.winRate ?? 0),
  totalProfit: String(profile.totalProfit ?? 0),
  monthlyReturn: String(profile.monthlyReturn ?? 0),
  maxDrawdown: String(profile.maxDrawdown ?? 0),
  followersCount: String(profile.followersCount ?? 0),
});

export default function AdminLeaderboardPanel() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const { data: profiles, isLoading, isFetching, refetch } = trpc.admin.getLeaderboardProfiles.useQuery({ limit: 100 });
  const utils = trpc.useUtils();
  const updateProfile = trpc.admin.updateLeaderboardProfile.useMutation({
    onSuccess: async () => {
      toast.success("Leaderboard profile updated and audit recorded");
      await Promise.all([
        utils.admin.getLeaderboardProfiles.invalidate(),
        utils.social.leaderboard.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const selectedProfile = useMemo(
    () => (profiles as LeaderboardProfile[] | undefined)?.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  useEffect(() => {
    if (selectedId === null && profiles?.[0]) setSelectedId(profiles[0].id);
  }, [profiles, selectedId]);

  useEffect(() => {
    if (selectedProfile) setForm(profileToForm(selectedProfile));
  }, [selectedProfile]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const submit = () => {
    if (!selectedProfile || !form) return;
    const numericFields = [
      ["total trades", Number(form.totalTrades)],
      ["win rate", Number(form.winRate)],
      ["total profit", Number(form.totalProfit)],
      ["monthly return", Number(form.monthlyReturn)],
      ["maximum drawdown", Number(form.maxDrawdown)],
      ["followers", Number(form.followersCount)],
    ] as const;
    const invalidField = numericFields.find(([, value]) => !Number.isFinite(value));
    if (invalidField) {
      toast.error(`Enter a valid ${invalidField[0]}`);
      return;
    }
    if (Number(form.totalTrades) % 1 !== 0 || Number(form.followersCount) % 1 !== 0) {
      toast.error("Total trades and followers must be whole numbers");
      return;
    }
    if (!form.displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    updateProfile.mutate({
      profileId: selectedProfile.id,
      displayName: form.displayName.trim(),
      bio: form.bio.trim() || null,
      isPublic: form.isPublic,
      allowCopying: form.allowCopying,
      totalTrades: Number(form.totalTrades),
      winRate: Number(form.winRate),
      totalProfit: Number(form.totalProfit),
      monthlyReturn: Number(form.monthlyReturn),
      maxDrawdown: Number(form.maxDrawdown),
      followersCount: Number(form.followersCount),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div><CardTitle>Leaderboard entries ({profiles?.length ?? 0})</CardTitle><p className="mt-1 text-sm text-muted-foreground">Edit visibility, copy-trading access, profile text, and displayed performance metrics.</p></div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching} className="gap-2"><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        </CardHeader>
        <CardContent>
          {profiles?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-3 py-3">Trader</th><th className="px-3 py-3">Return</th><th className="px-3 py-3">Win rate</th><th className="px-3 py-3">Visibility</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>{(profiles as LeaderboardProfile[]).map((profile) => <tr key={profile.id} className={`border-b last:border-0 ${selectedId === profile.id ? "bg-muted/50" : ""}`}><td className="px-3 py-3"><div className="font-medium">{profile.displayName}</div><div className="text-xs text-muted-foreground">{profile.email ?? profile.userName ?? `User ${profile.userId}`}</div></td><td className={`px-3 py-3 font-semibold tabular-nums ${Number(profile.monthlyReturn ?? 0) >= 0 ? "text-bull" : "text-bear"}`}>{Number(profile.monthlyReturn ?? 0) >= 0 ? "+" : ""}{Number(profile.monthlyReturn ?? 0).toFixed(2)}%</td><td className="px-3 py-3 tabular-nums">{Number(profile.winRate ?? 0).toFixed(1)}%</td><td className="px-3 py-3">{profile.isPublic && profile.allowCopying ? <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">Published</span> : <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">Hidden</span>}</td><td className="px-3 py-3 text-right"><Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(profile.id)} className="gap-1"><Pencil className="h-3.5 w-3.5" />Edit</Button></td></tr>)}</tbody></table></div> : <div className="py-10 text-center text-sm text-muted-foreground">No trader profiles are available to edit.</div>}
        </CardContent>
      </Card>

      {selectedProfile && form && <Card>
        <CardHeader><CardTitle>Edit leaderboard · {selectedProfile.displayName}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label htmlFor="leaderboard-display-name">Display name</Label><Input id="leaderboard-display-name" value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} maxLength={64} /></div>
            <div><Label htmlFor="leaderboard-bio">Bio</Label><Textarea id="leaderboard-bio" value={form.bio} onChange={(event) => updateField("bio", event.target.value)} maxLength={500} rows={2} /></div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublic} onChange={(event) => updateField("isPublic", event.target.checked)} className="accent-primary" />Publish profile</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.allowCopying} onChange={(event) => updateField("allowCopying", event.target.checked)} className="accent-primary" />Allow copy trading</label></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label htmlFor="leaderboard-total-trades">Total trades</Label><Input id="leaderboard-total-trades" type="number" min="0" step="1" value={form.totalTrades} onChange={(event) => updateField("totalTrades", event.target.value)} /></div>
            <div><Label htmlFor="leaderboard-win-rate">Win rate (%)</Label><Input id="leaderboard-win-rate" type="number" min="0" max="100" step="0.01" value={form.winRate} onChange={(event) => updateField("winRate", event.target.value)} /></div>
            <div><Label htmlFor="leaderboard-monthly-return">Monthly return (%)</Label><Input id="leaderboard-monthly-return" type="number" step="0.0001" value={form.monthlyReturn} onChange={(event) => updateField("monthlyReturn", event.target.value)} /></div>
            <div><Label htmlFor="leaderboard-total-profit">Total profit</Label><Input id="leaderboard-total-profit" type="number" step="0.00000001" value={form.totalProfit} onChange={(event) => updateField("totalProfit", event.target.value)} /></div>
            <div><Label htmlFor="leaderboard-drawdown">Maximum drawdown (%)</Label><Input id="leaderboard-drawdown" type="number" min="0" step="0.0001" value={form.maxDrawdown} onChange={(event) => updateField("maxDrawdown", event.target.value)} /></div>
            <div><Label htmlFor="leaderboard-followers">Followers</Label><Input id="leaderboard-followers" type="number" min="0" step="1" value={form.followersCount} onChange={(event) => updateField("followersCount", event.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4"><p className="text-xs text-muted-foreground">Every admin update is recorded in the audit log with previous and new profile values.</p><Button type="button" onClick={submit} disabled={updateProfile.isPending} className="gap-2">{updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{updateProfile.isPending ? "Saving…" : "Save leaderboard"}</Button></div>
        </CardContent>
      </Card>}
    </div>
  );
}

export { profileToForm };
export type { FormState as LeaderboardFormState, LeaderboardProfile };

"use client";

import { useEffect, useState } from "react";
import { BADGES } from "@/lib/gamification-defs";
import { useGamification } from "@/lib/state/GamificationContext";
import { cn } from "@/lib/cn";

const NEXT_MILESTONES = [
  { reports: 3, label: "Penjaga Aksesibilitas", icon: "🛡️" },
  { reports: 5, label: "Pahlawan Trotoar", icon: "🏅" },
];

export function GamificationSummary() {
  const { state, sync } = useGamification();
  const [serverStats, setServerStats] = useState<{
    reports: number;
    verifiedReports: number;
    points: number;
    badges: string[];
  } | null>(null);

  useEffect(() => {
    if (!state.reporterId) return;
    let cancelled = false;
    void fetch(`/api/gamification?reporterId=${encodeURIComponent(state.reporterId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { ok?: boolean; data?: { stats?: unknown } } | null) => {
        if (cancelled || !body?.ok || !body.data?.stats) return;
        const stats = body.data.stats as typeof serverStats;
        if (!stats) return;
        setServerStats(stats);
        if (stats.points >= state.points && stats.reports >= state.reports) {
          sync({ ...stats, reporterId: state.reporterId, reporterName: null, newlyEarned: [], pointsEarned: 0 });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.reporterId, state.reports, state.points, sync]);

  const reports = Math.max(state.reports, serverStats?.reports ?? 0);
  const points = Math.max(state.points, serverStats?.points ?? 0);
  const verifiedReports = Math.max(state.verifiedReports, serverStats?.verifiedReports ?? 0);
  const earnedBadges = state.badges.length > 0 ? state.badges : (serverStats?.badges ?? []);

  const nextMilestone = NEXT_MILESTONES.find((m) => reports < m.reports) ?? null;
  const progressToNext = nextMilestone
    ? Math.min(100, Math.round((reports / nextMilestone.reports) * 100))
    : 100;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-3 text-center">
        <StatCard label="Poin" value={points} emphasis />
        <StatCard label="Laporan" value={reports} />
        <StatCard label="Terverifikasi" value={verifiedReports} />
      </dl>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Lencana">
        {BADGES.map((badge) => {
          const earned = earnedBadges.includes(badge.id);
          return (
            <li
              key={badge.id}
              className={cn(
                "rounded-20 border-2 p-4 text-center shadow-card",
                earned ? "border-primary bg-primary-soft/60" : "border-border bg-background opacity-70",
              )}
            >
              <span aria-hidden="true" className={cn("block text-4xl leading-none", !earned && "grayscale opacity-50")}>
                {badge.icon}
              </span>
              <p className={cn("mt-2 text-sm font-black", earned ? "text-foreground" : "text-muted-foreground")}>
                {badge.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{badge.description}</p>
              <p className={cn("mt-2 text-xs font-bold", earned ? "text-primary" : "text-muted-foreground")}>
                {earned ? "Diperoleh" : "Terkunci"}
              </p>
            </li>
          );
        })}
      </ul>

      {nextMilestone ? (
        <div className="rounded-20 border-2 border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-bold text-muted-foreground">
              <span aria-hidden="true">{nextMilestone.icon}</span> Lencana berikutnya: {nextMilestone.label}
            </p>
            <p className="font-black text-primary">
              {reports}/{nextMilestone.reports} laporan
            </p>
          </div>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full border border-border bg-muted"
            role="progressbar"
            aria-valuenow={progressToNext}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progres menuju ${nextMilestone.label}`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressToNext}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-sm font-bold text-primary">🏆 Semua lencana laporan telah kamu dapatkan!</p>
      )}

      <p className="text-xs text-muted-foreground">
        Poin & lencana tersimpan di perangkat ini via identitas pelapor anonim. Poin berbasis kategori: kondisi
        berbahaya, foto, dan keparahan tinggi memberi poin lebih.
      </p>
    </div>
  );
}

function StatCard({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-20 border-2 p-4 shadow-card",
        emphasis ? "border-primary bg-primary-soft/60" : "border-border bg-background",
      )}
    >
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 text-h3 font-black", emphasis ? "text-primary" : "text-foreground")}>{value}</dd>
    </div>
  );
}
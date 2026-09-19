import type { Metadata } from "next";
import { BadgeCheck, Clock3, FileText, HeartHandshake, MapIcon, Megaphone } from "lucide-react";
import Link from "next/link";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import type { ReportStub } from "@/types";

export const metadata: Metadata = { title: "Komunitas" };

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8080";

async function fetchReportStats(): Promise<{ total: number; verified: number; inProgress: number }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/reports`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return { total: 0, verified: 0, inProgress: 0 };
    const body = (await response.json()) as {
      ok: boolean;
      data?: { reports: ReportStub[] };
    };
    const reports = body.data?.reports ?? [];
    return {
      total: reports.length,
      verified: reports.filter((r) => r.status === "VERIFIED").length,
      inProgress: reports.filter((r) => r.status === "PENDING" || r.status === "ACTIVE").length,
    };
  } catch {
    return { total: 0, verified: 0, inProgress: 0 };
  }
}

export default async function CommunityPage() {
  const stats = await fetchReportStats();

  const statCards = [
    { icon: FileText, value: stats.total, label: "Laporan masuk" },
    { icon: BadgeCheck, value: stats.verified, label: "Terverifikasi" },
    { icon: Clock3, value: stats.inProgress, label: "Sedang ditindaklanjuti" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="overflow-hidden rounded-24 border border-border shadow-card">
        <div className="grad-primary p-6 text-white sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-uppercase text-[11px] font-bold text-white/80">Saling menjaga</p>
              <h1 className="mt-1 text-h1 font-black">Komunitas ANAPSI</h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/90">
                Teman-teman di sekitarmu saling melaporkan jalan mana yang aman, mana yang berisiko, dan mana yang
                telah diperbaiki. Kamu juga bisa ikut membantu.
              </p>
            </div>
            <span aria-hidden="true" className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-20 bg-white/10 text-white sm:flex">
              <HeartHandshake className="h-7 w-7" />
            </span>
          </div>
          <ul className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {statCards.map((stat) => (
              <li key={stat.label} className="rounded-16 bg-white/10 px-2 py-3 text-center">
                <stat.icon className="mx-auto h-5 w-5 text-white/80" aria-hidden="true" />
                <p className="mt-1 text-h3 font-black">{stat.value}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/80">{stat.label}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
          Terima kasih untuk semua pelapor — satu laporan bisa menyelamatkan seseorang dari kecelakaan.
        </p>
      </header>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/report"
          className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-16 primary-solid px-5 font-black text-primary-foreground shadow-card hover:opacity-90"
        >
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          Bantu laporkan hambatan
        </Link>
        <Link
          href="/map"
          className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-16 border-2 border-border bg-card px-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <MapIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Lihat lokasi di peta
        </Link>
      </div>

      <CommunityFeed />
    </div>
  );
}
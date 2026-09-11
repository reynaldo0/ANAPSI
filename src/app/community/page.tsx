import type { Metadata } from "next";
import { HeartHandshake, Megaphone } from "lucide-react";
import Link from "next/link";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { listReports } from "@/lib/data/reports";

export const metadata: Metadata = { title: "Komunitas" };

export default async function CommunityPage() {
  const { data } = await listReports();
  const verified = data.filter((r) => r.status === "VERIFIED").length;
  const inProgress = data.filter((r) => r.status === "PENDING" || r.status === "ACTIVE").length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="overflow-hidden rounded-24 border-2 border-primary/50 bg-card shadow-card">
        <div className="bg-primary-soft/60 p-6 pb-5">
          <p className="label-uppercase text-[11px] text-primary">Saling menjaga</p>
          <h1 className="mt-1 text-h1 font-black">Komunitas BLINDSPOT</h1>
          <p className="mt-2 text-muted-foreground">
            Teman-teman di sekitarmu saling melaporkan jalan mana yang aman, mana yang berisiko, dan mana yang telah
            diperbaiki. Kamu juga bisa ikut membantu.
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-card">
          <div className="p-4 text-center">
            <p className="text-h3 font-black text-primary">{data.length}</p>
            <p className="text-xs text-muted-foreground">Laporan masuk</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-h3 font-black text-success">{verified}</p>
            <p className="text-xs text-muted-foreground">Terverifikasi</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-h3 font-black text-warning">{inProgress}</p>
            <p className="text-xs text-muted-foreground">Sedang ditindaklanjuti</p>
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/report"
          className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-16 primary-solid px-5 font-black text-primary-foreground shadow-card hover:opacity-90"
        >
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          Bantu laporkan hambatan
        </Link>
        <p className="inline-flex flex-1 items-center justify-center gap-2 rounded-16 border-2 border-border bg-card px-5 text-sm font-semibold text-muted-foreground">
          <HeartHandshake className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Setiap laporan membantu sesama.
        </p>
      </div>

      <CommunityFeed />
    </div>
  );
}
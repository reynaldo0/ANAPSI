"use client";

import { useCallback, useRef, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { announceLiveRegion } from "@/lib/announcement";
import { useAuth } from "@/lib/state/AuthContext";
import { cn } from "@/lib/cn";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminReportsTab } from "@/components/admin/AdminReportsTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminLocationsTab } from "@/components/admin/AdminLocationsTab";

const TABS = [
  { id: "ringkasan", label: "Ringkasan", icon: "📊", description: "Statistik umum & pemantauan cepat" },
  { id: "laporan", label: "Laporan", icon: "🗂", description: "Moderasi laporan aksesibilitas" },
  { id: "pengguna", label: "Pengguna", icon: "👥", description: "Kelola akun, peran & aktivitas" },
  { id: "lokasi", label: "Pemantauan Lokasi", icon: "📍", description: "Lokasi pengguna yang berbagi lokasi secara langsung" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("ringkasan");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = useCallback((id: TabId) => {
    tabRefs.current[id]?.focus();
  }, []);

  const selectTab = useCallback((id: TabId) => {
    setActiveTab(id);
    const meta = TABS.find((t) => t.id === id);
    announceLiveRegion(`Tab ${meta?.label ?? id} aktif.`);
  }, []);

  const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      const target = TABS[next].id as TabId;
      setActiveTab(target);
      focusTab(target);
    }
  };

  // Auth check
  if (authLoading) {
    return <LoadingState label="Memeriksa sesi…" />;
  }

  if (!user) {
    return (
      <div className="rounded-16 border-2 border-danger bg-danger-soft p-6 text-center">
        <p className="text-lg font-bold text-danger">Kamu belum masuk.</p>
        <p className="mt-1 text-muted-foreground">
          Masuk dengan akun admin untuk mengakses panel ini.
        </p>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="rounded-16 border-2 border-danger bg-danger-soft p-6 text-center">
        <p className="text-lg font-bold text-danger">✕ Akses ditolak</p>
        <p className="mt-1 text-muted-foreground">
          Halaman ini hanya tersedia untuk admin ANAPSI.
        </p>
      </div>
    );
  }

  const activeMeta = TABS.find((t) => t.id === activeTab);

  return (
    <div>
      {/* Tab list */}
      <div role="tablist" aria-label="Menu panel admin" className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={onTabKeyDown}
              className={cn(
                "inline-flex items-center gap-2 rounded-12 border-2 px-4 py-2.5 text-base font-bold transition-colors focus-visible:outline-offset-2",
                selected
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 mb-5 text-lg text-muted-foreground" aria-live="polite">
        {activeMeta?.description}
      </p>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="focus-visible:outline-offset-2 rounded-12 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {activeTab === "ringkasan" ? <AdminOverviewTab /> : null}
        {activeTab === "laporan" ? <AdminReportsTab /> : null}
        {activeTab === "pengguna" ? <AdminUsersTab /> : null}
        {activeTab === "lokasi" ? <AdminLocationsTab /> : null}
      </div>
    </div>
  );
}
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { announceLiveRegion } from "@/lib/announcement";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/state/AuthContext";
import type { AdminUser } from "@/types";

function relativeTime(iso: string | null): string {
  if (!iso) return "Belum ada aktivitas";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

function scoreRole(role: "USER" | "ADMIN") {
  return role === "ADMIN"
    ? { label: "Admin", tone: "success" as const }
    : { label: "Pengguna", tone: "neutral" as const };
}

export function AdminUsersTab() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { signal: ac.signal });
      const body = await res.json();
      if (!body.ok) throw new Error(body.error?.message ?? "Gagal memuat pengguna.");
      setUsers(body.data.users as AdminUser[]);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Gagal memuat pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchUsers(), 0);
    return () => window.clearTimeout(id);
  }, [fetchUsers]);

  const patchUser = useCallback(
    async (id: string, payload: { role?: string; activityEnabled?: boolean }) => {
      setBusyId(id);
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!body.ok) throw new Error(body.error?.message ?? "Gagal memperbarui pengguna.");
        setUsers((prev) => prev.map((u) => (u.id === id ? (body.data.user as AdminUser) : u)));
        announceLiveRegion("Pengguna diperbarui.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal memperbarui pengguna.";
        toast({ tone: "danger", title: "Gagal", message: msg });
        announceLiveRegion(msg, { assertive: true });
        void fetchUsers();
      } finally {
        setBusyId(null);
      }
    },
    [toast, fetchUsers],
  );

  const deleteUser = useCallback(
    async (id: string, displayName: string) => {
      setBusyId(id);
      try {
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        const body = await res.json();
        if (!body.ok) throw new Error(body.error?.message ?? "Gagal menghapus pengguna.");
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast({ tone: "success", title: "Pengguna dihapus", message: `Akun ${displayName} dihapus.` });
        announceLiveRegion(`Akun ${displayName} dihapus.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menghapus pengguna.";
        toast({ tone: "danger", title: "Gagal", message: msg });
        announceLiveRegion(msg, { assertive: true });
      } finally {
        setBusyId(null);
        setConfirmId(null);
      }
    },
    [toast],
  );

  if (loading) return <LoadingState label="Memuat pengguna…" />;

  if (error) {
    return (
      <div className="rounded-16 border-2 border-danger bg-danger-soft p-6 text-center">
        <p className="text-lg font-bold text-danger">Gagal memuat pengguna</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void fetchUsers()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (users.length === 0) {
    return <EmptyState title="Belum ada pengguna" description="Pengguna yang mendaftar akan muncul di sini." />;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {users.length} pengguna terdaftar · Tampilkan detail untuk melihat aktivitas terakhir & agen pengguna.
      </p>
      <ul className="space-y-3" aria-label="Daftar pengguna">
        {users.map((u) => {
          const role = scoreRole(u.role);
          const isSelf = me?.id === u.id;
          const isExpanded = expanded === u.id;
          return (
            <li key={u.id} className="rounded-16 border-2 border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{u.displayName}</p>
                    {isSelf ? (
                      <Badge tone="warning" symbol="★">
                        Kamu
                      </Badge>
                    ) : null}
                    <Badge tone={role.tone} symbol={u.role === "ADMIN" ? "🛡" : "👤"}>
                      {role.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{u.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Terakhir aktif: <strong className="text-foreground">{relativeTime(u.lastActivityAt)}</strong>
                    {u.lastPage ? ` · ${u.lastPage}` : ""}
                    {u.lastIP ? ` · IP ${u.lastIP}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {u.reportsCount} laporan · {u.verifications} verifikasi · {u.points} poin
                    {u.badges.length > 0 ? ` · ${u.badges.length} lencana` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`user-detail-${u.id}`}
                  onClick={() => setExpanded(isExpanded ? null : u.id)}
                  className="shrink-0 rounded-8 border-2 border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {isExpanded ? "Tutup ▲" : "Detail ▼"}
                </button>
              </div>

              {isExpanded ? (
                <div id={`user-detail-${u.id}`} className="mt-3 border-t border-border pt-3 space-y-3">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-12 bg-muted px-3 py-2">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Bergabung
                      </span>
                      {u.createdAt ? new Date(u.createdAt).toLocaleString("id-ID") : "—"}
                    </div>
                    <div className="rounded-12 bg-muted px-3 py-2">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Aktivitas terakhir
                      </span>
                      {u.lastActivityAt ? new Date(u.lastActivityAt).toLocaleString("id-ID") : "—"}
                    </div>
                    <div className="rounded-12 bg-muted px-3 py-2">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Koordinat terakhir
                      </span>
                      {u.lastLat != null && u.lastLng != null
                        ? `${u.lastLat.toFixed(5)}, ${u.lastLng.toFixed(5)}`
                        : "Tidak berbagi lokasi"}
                    </div>
                    <div className="rounded-12 bg-muted px-3 py-2">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Agen pengguna
                      </span>
                      <span className="line-clamp-2">{u.lastUserAgent || "—"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2" role="group" aria-label={`Kelola ${u.displayName}`}>
                    <Button
                      size="sm"
                      variant={u.role === "ADMIN" ? "secondary" : "outline"}
                      disabled={isSelf || busyId === u.id || u.role !== "ADMIN"}
                      onClick={() => void patchUser(u.id, { role: "USER" })}
                    >
                      Jadikan pengguna
                    </Button>
                    <Button
                      size="sm"
                      variant={u.role === "USER" ? "secondary" : "outline"}
                      disabled={isSelf || busyId === u.id || u.role !== "USER"}
                      onClick={() => void patchUser(u.id, { role: "ADMIN" })}
                    >
                      Angkat jadi admin
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyId === u.id}
                      onClick={() => void patchUser(u.id, { activityEnabled: !u.activityEnabled })}
                    >
                      {u.activityEnabled ? "Matikan berbagi lokasi" : "Aktifkan berbagi lokasi"}
                    </Button>
                  </div>

                  <div className="border-t border-border pt-3">
                    {confirmId === u.id ? (
                      <div className="rounded-12 border-2 border-danger bg-danger-soft p-3" role="alert">
                        <p className="text-sm font-semibold text-danger">
                          Hapus akun “{u.displayName}” permanen? Laporan komunitasnya tetap tersimpan.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            loading={busyId === u.id}
                            onClick={() => void deleteUser(u.id, u.displayName)}
                          >
                            Ya, hapus akun
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
                            Batalkan
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSelf}
                        onClick={() => setConfirmId(u.id)}
                      >
                        🗑 Hapus akun
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
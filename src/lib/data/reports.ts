import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { readJsonFile, writeJsonFile } from "@/lib/file-storage";
import { demoPlaces, demoReports } from "@/lib/data/demo-data";
import { reportCategoryLabel } from "@/lib/constants";
import { structureReportTranscript } from "@/lib/voice/report-structurer";
import { markReportVerified, type GamificationStats } from "@/lib/data/gamification";
import type {
  AffectedProfile,
  PublicUser,
  ReportCategory,
  ReportDetail,
  ReportMediaInfo,
  ReportStatus,
  ReportVerificationInfo,
  Severity,
  SubmitReportInput,
  VerificationStatus,
  VerificationType,
} from "@/types";

export interface ReportVerificationRecord extends ReportVerificationInfo {
  type: VerificationType;
  /** Kunci verifikator aman sisi-server (untuk cegah verifikasi ganda/anonym). */
  verifierKey?: string | null;
}

export interface ReportListFilters {
  placeId?: string;
  mine?: boolean;
  profile?: AffectedProfile;
  authorId?: string;
}

interface StoredReport {
  detail: ReportDetail;
  authorId?: string | null;
  reporterId?: string | null;
  verifications: ReportVerificationRecord[];
}

const STORAGE_FILE = "reports";
const MAX_VERIFICATIONS_PER_REPORT = 30;
const MAX_PHOTOS_PER_REPORT = 5;

let reports: StoredReport[] | null = null;

function persistReports(): void {
  if (reports) writeJsonFile(STORAGE_FILE, reports);
}

function seedFromDemo(): StoredReport[] {
  const seeded: StoredReport[] = [];
  for (const report of demoReports) {
    const place = demoPlaces.find((p) => p.id === report.placeId);
    const structured = structureReportTranscript(report.title);
    const seedVerifications: ReportVerificationRecord[] =
      report.verification === "VERIFIED" && report.agree > 0
        ? [
            {
              id: `${report.id}-seed-ver`,
              type: "CONFIRMED",
              comment: null,
              userName: report.authorName,
              at: report.createdAt,
            },
          ]
        : [];
    seeded.push({
      authorId: null,
      reporterId: null,
      detail: {
        id: report.id,
        category: structured.category,
        categoryLabel: reportCategoryLabel(structured.category),
        description: report.excerpt,
        severity: structured.severity,
        affectedProfiles: structured.affectedProfiles.length > 0 ? structured.affectedProfiles : [],
        placeId: report.placeId,
        placeName: place?.name ?? null,
        latitude: place?.lat ?? null,
        longitude: place?.lng ?? null,
        address: place ? `${place.address}, ${place.city}` : null,
        reporterName: report.authorName,
        status: report.status as ReportStatus,
        verification: report.verification as VerificationStatus,
        createdAt: report.createdAt,
        updatedAt: report.createdAt,
        media: [],
        verificationCount: seedVerifications.length,
        lastVerifiedAt: seedVerifications[0]?.at ?? null,
        verifications: seedVerifications,
        aiSuggested: false,
        moderationNotes: null,
        source: "demo",
      },
      verifications: seedVerifications,
    });
  }
  return seeded;
}

/** Memuat penyimpanan laporan (dari file bila ada, dari demo bila kosong). */
function loadReports(): StoredReport[] {
  if (reports) return reports;
  const fromFile = readJsonFile<StoredReport[]>(STORAGE_FILE, []);
  if (fromFile.length > 0) {
    reports = fromFile;
    return fromFile;
  }
  reports = seedFromDemo();
  persistReports();
  return reports;
}

function categoryIsValid(category: string): category is ReportCategory {
  return [
    "STAIRS",
    "DAMAGED_RAMP",
    "RAMP",
    "GUIDING_BLOCK",
    "DAMAGED_SIDEWALK",
    "OBSTACLE",
    "ELEVATOR",
    "ACCESSIBLE_FACILITY",
    "OTHER",
  ].includes(category);
}

export function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && categoryIsValid(value);
}

export async function listReports(filters: ReportListFilters = {}): Promise<{
  data: ReportDetail[];
  source: string;
}> {
  const db = getDb();
  if (!db) {
    const stored = loadReports().filter((s) => {
      if (filters.placeId && s.detail.placeId !== filters.placeId) return false;
      if (filters.mine && s.authorId !== filters.authorId) return false;
      if (
        filters.profile &&
        filters.profile !== "BOTH" &&
        !s.detail.affectedProfiles.includes(filters.profile)
      ) {
        return false;
      }
      return true;
    });
    const data = stored
      .map((s) => s.detail)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { data, source: "demo" };
  }

  const rows = await db.accessibilityReport.findMany({
    where: {
      placeId: filters.placeId ?? undefined,
      authorId: filters.mine ? { not: null } : undefined,
      affectedProfiles: filters.profile && filters.profile !== "BOTH" ? { has: filters.profile } : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      place: true,
      author: true,
      media: true,
      verifications: { orderBy: { verifiedAt: "desc" } },
    },
    take: 50,
  });

  return { data: rows.map(toDetail), source: "database" };
}

/**
 * Daftar laporan untuk admin (semua laporan, termasuk yang dilaporkan komunitas),
 * opsional difilter berdasarkan status. Mengembalikan ringkasan yang mencakup
 * moderationNotes agar admin dapat melihat catatan moderasi sebelumnya.
 */
export async function listReportsAdmin(status?: ReportStatus | null): Promise<{
  data: ReportDetail[];
  source: string;
}> {
  const db = getDb();
  if (!db) {
    const all = loadReports().map((s) => s.detail);
    const filtered = status ? all.filter((r) => r.status === status) : all;
    return { data: filtered, source: "demo" };
  }

  const rows = await db.accessibilityReport.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      place: true,
      author: true,
      media: true,
      verifications: { orderBy: { verifiedAt: "desc" } },
    },
    take: 100,
  });
  return { data: rows.map(toDetail), source: "database" };
}

export async function getReportDetail(id: string): Promise<{ data: ReportDetail | null; source: string }> {
  const db = getDb();
  if (!db) {
    const stored = loadReports().find((s) => s.detail.id === id);
    return { data: stored?.detail ?? null, source: "demo" };
  }

  const row = await db.accessibilityReport.findUnique({
    where: { id },
    include: {
      place: true,
      author: true,
      media: true,
      verifications: { orderBy: { verifiedAt: "desc" } },
    },
  });
  return { data: row ? toDetail(row) : null, source: "database" };
}

interface VerificationRow {
  id: string;
  verificationType: string;
  comment: string | null;
  verifiedAt: Date | null;
  user?: { displayName: string } | null;
}

function isVerificationType(value: string): value is VerificationType {
  return value === "CONFIRMED" || value === "CHANGED" || value === "RESOLVED";
}

function toVerificationInfo(row: VerificationRow): ReportVerificationInfo {
  return {
    id: row.id,
    type: isVerificationType(row.verificationType) ? row.verificationType : "CONFIRMED",
    comment: row.comment,
    userName: row.user?.displayName ?? null,
    at: (row.verifiedAt ?? new Date()).toISOString(),
  };
}

function toDetail(
  row: {
    id: string;
    category: string;
    title?: string | null;
    body: string;
    severity: string;
    affectedProfiles: string[];
    aiGenerated: boolean;
    latitude: number | null;
    longitude: number | null;
    status: string;
    moderationNotes?: string | null;
    createdAt: Date;
    updatedAt: Date;
    place?: { id: string; name: string; address?: string | null; city: string } | null;
    author?: { displayName: string } | null;
    media?: { id: string; kind: string; url: string; caption: string | null }[];
    verifications?: VerificationRow[];
  },
): ReportDetail {
  const category = categoryIsValid(row.category) ? row.category : "OTHER";
  const verifications = (row.verifications ?? []).filter((v): v is VerificationRow => Boolean(v.verificationType));
  const lastVerified = verifications[0]?.verifiedAt ?? null;
  const lastType = verifications[0]?.verificationType ?? null;
  return {
    id: row.id,
    category,
    categoryLabel: reportCategoryLabel(category),
    description: row.body,
    severity: (["HIGH", "MEDIUM", "LOW"].includes(row.severity) ? row.severity : "MEDIUM") as Severity,
    affectedProfiles: row.affectedProfiles.filter(
      (value): value is AffectedProfile => value === "BOTH" || value === "WHEELCHAIR_MOBILITY" || value === "VISUAL_NAVIGATION",
    ),
    placeId: row.place?.id ?? null,
    placeName: row.place?.name ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.place ? `${row.place.address ?? ""}${row.place.address ? ", " : ""}${row.place.city}` : null,
    reporterName: row.author?.displayName ?? null,
    status: row.status as ReportStatus,
    verification: (lastType ? "VERIFIED" : "UNKNOWN") as VerificationStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    media: (row.media ?? []).map((m) => ({
      id: m.id,
      kind: "photo",
      url: m.url,
      caption: m.caption,
    })) satisfies ReportMediaInfo[],
    verificationCount: verifications.length,
    lastVerifiedAt: lastVerified ? lastVerified.toISOString() : null,
    verifications: verifications.map(toVerificationInfo),
    aiSuggested: row.aiGenerated,
    moderationNotes: row.moderationNotes ?? null,
    source: "database",
  };
}

export async function createReport(
  input: SubmitReportInput,
  author: PublicUser | null,
): Promise<{ data: ReportDetail; source: string }> {
  const db = getDb();
  const media = (input.media ?? []).slice(0, MAX_PHOTOS_PER_REPORT);
  if (!db) {
    const now = new Date().toISOString();
    const place = input.placeId ? demoPlaces.find((p) => p.id === input.placeId) : undefined;
    const detail: ReportDetail = {
      id: `rep-${Date.now()}`,
      category: input.category,
      categoryLabel: reportCategoryLabel(input.category),
      description: input.description,
      severity: input.severity,
      affectedProfiles: input.affectedProfiles,
      placeId: input.placeId ?? null,
      placeName: place?.name ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      address: input.address ?? (place ? `${place.address}, ${place.city}` : null),
      reporterName: author?.displayName ?? "Anonim",
      status: "PENDING",
      verification: "UNKNOWN",
      createdAt: now,
      updatedAt: now,
      media: media.map((m, index) => ({
        id: `media-${Date.now()}-${index}`,
        kind: "photo",
        url: m.url,
        caption: m.caption ?? "Foto hambatan aksesibilitas.",
      })),
      verificationCount: 0,
      lastVerifiedAt: null,
      verifications: [],
      aiSuggested: input.aiSuggested ?? false,
      moderationNotes: null,
      source: "user",
    };
    loadReports().push({ detail, authorId: author?.id ?? null, reporterId: input.reporterId ?? null, verifications: [] });
    persistReports();
    return { data: detail, source: "user" };
  }

  const created = await db.accessibilityReport.create({
    data: {
      placeId: input.placeId ?? null,
      authorId: author?.id ?? null,
      category: input.category,
      title: reportCategoryLabel(input.category),
      body: input.description,
      severity: input.severity,
      affectedProfiles: input.affectedProfiles,
      aiGenerated: input.aiSuggested ?? false,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      media: media.length > 0 ? { create: media.map((m) => ({ kind: "photo", url: m.url, caption: m.caption ?? null })) } : undefined,
    },
    include: {
      place: true,
      author: true,
      media: true,
      verifications: { orderBy: { verifiedAt: "desc" } },
    },
  });

  return { data: toDetail(created), source: "database" };
}

export interface ReportPatch {
  category?: ReportCategory;
  description?: string;
  severity?: Severity;
  affectedProfiles?: AffectedProfile[];
  status?: ReportStatus;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  moderationNotes?: string | null;
}

export async function updateReport(id: string, patch: ReportPatch): Promise<{ data: ReportDetail | null; source: string }> {
  const db = getDb();
  if (!db) {
    const stored = loadReports().find((s) => s.detail.id === id);
    if (!stored) return { data: null, source: "demo" };
    const next = {
      ...stored.detail,
      ...(patch.category !== undefined
        ? { category: patch.category, categoryLabel: reportCategoryLabel(patch.category) }
        : {}),
      description: patch.description ?? stored.detail.description,
      severity: patch.severity ?? stored.detail.severity,
      affectedProfiles: patch.affectedProfiles ?? stored.detail.affectedProfiles,
      status: patch.status ?? stored.detail.status,
      latitude: patch.latitude === undefined ? stored.detail.latitude : patch.latitude,
      longitude: patch.longitude === undefined ? stored.detail.longitude : patch.longitude,
      address: patch.address === undefined ? stored.detail.address : patch.address,
      moderationNotes:
        patch.moderationNotes === undefined ? stored.detail.moderationNotes : patch.moderationNotes,
      updatedAt: new Date().toISOString(),
    };
    stored.detail = next;
    persistReports();
    return { data: next, source: "demo" };
  }

  const updated = await db.accessibilityReport.update({
    where: { id },
    data: {
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.description !== undefined ? { body: patch.description } : {}),
      ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
      ...(patch.affectedProfiles !== undefined ? { affectedProfiles: patch.affectedProfiles } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
      ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
      ...(patch.moderationNotes !== undefined ? { moderationNotes: patch.moderationNotes } : {}),
    },
    include: {
      place: true,
      author: true,
      media: true,
      verifications: { orderBy: { verifiedAt: "desc" } },
    },
  });
  return { data: toDetail(updated), source: "database" };
}

export function applyLifecycle(status: ReportStatus, type: VerificationType): ReportStatus {
  switch (type) {
    case "CONFIRMED":
      return "ACTIVE";
    case "CHANGED":
      return "OUTDATED";
    case "RESOLVED":
      return "RESOLVED";
  }
}

/**
 * Identitas pembuat laporan untuk kontrol akses dan atribusi poin.
 * Kunci `reporterKey` adalah identitas aman sisi-server (user atau hash IP).
 */
export async function getReportAuthorIdentity(id: string): Promise<{
  authorId: string | null;
  reporterKey: string | null;
  found: boolean;
}> {
  const db = getDb();
  if (!db) {
    const stored = loadReports().find((s) => s.detail.id === id);
    return {
      authorId: stored?.authorId ?? null,
      reporterKey: stored?.reporterId ?? null,
      found: Boolean(stored),
    };
  }
  const row = await db.accessibilityReport.findUnique({
    where: { id },
    select: { authorId: true },
  });
  return {
    authorId: row?.authorId ?? null,
    reporterKey: row?.authorId ? `user:${row.authorId}` : null,
    found: Boolean(row),
  };
}

function assertNotSelfVerification(
  callerKey: string | null | undefined,
  authorId: string | null | undefined,
  reporterKey: string | null | undefined,
): void {
  if (!callerKey) return;
  const authorKey = authorId ? `user:${authorId}` : reporterKey ?? null;
  if (authorKey && callerKey === authorKey) {
    throw new ApiError(
      409,
      "SELF_VERIFICATION",
      "Kamu tidak dapat memverifikasi laporanmu sendiri. Ekspektasi: verifikasi datang dari pengguna lain.",
    );
  }
}

export async function addReportVerification(
  id: string,
  type: VerificationType,
  comment: string | null,
  user: PublicUser | null,
  callerKey?: string | null,
): Promise<{ data: ReportDetail | null; source: string; gamification?: GamificationStats }> {
  const db = getDb();
  if (!db) {
    const stored = loadReports().find((s) => s.detail.id === id);
    if (!stored) return { data: null, source: "demo" };

    assertNotSelfVerification(callerKey, stored.authorId, stored.reporterId);

    if (stored.verifications.length >= MAX_VERIFICATIONS_PER_REPORT) {
      throw new ApiError(
        409,
        "VERIFICATION_LIMIT",
        `Laporan sudah menerima ${MAX_VERIFICATIONS_PER_REPORT} verifikasi.`,
      );
    }
    if (
      callerKey &&
      stored.verifications.some(
        (v) => v.verifierKey && v.verifierKey === callerKey && v.type === type,
      )
    ) {
      throw new ApiError(409, "ALREADY_VERIFIED", "Kamu sudah memverifikasi kondisi ini.");
    }

    const at = new Date().toISOString();
    stored.verifications.unshift({
      id: `ver-${Date.now()}`,
      type,
      comment,
      userName: user?.displayName ?? null,
      at,
      verifierKey: callerKey ?? null,
    });
    const nextStatus = applyLifecycle(stored.detail.status, type);
    stored.detail = {
      ...stored.detail,
      status: nextStatus,
      verification: type === "CHANGED" ? "COMMUNITY_REPORTED" : "VERIFIED",
      verificationCount: stored.verifications.length,
      lastVerifiedAt: at,
      verifications: stored.verifications,
      updatedAt: at,
    };
    persistReports();

    // Poin "kontribusi terkonfirmasi" hanya untuk konfirmasi dari komunitas
    // (bukan laporan milik sendiri, sudah diblokir di atas).
    let gamification: GamificationStats | undefined;
    if (stored.reporterId && type === "CONFIRMED") {
      gamification = markReportVerified(stored.reporterId);
    }
    return { data: stored.detail, source: "demo", gamification };
  }

  const current = await db.accessibilityReport.findUnique({
    where: { id },
    select: { status: true, authorId: true },
  });
  if (!current) return { data: null, source: "database" };

  assertNotSelfVerification(user?.id ? `user:${user.id}` : callerKey, current.authorId, null);

  const verificationCount = await db.reportVerification.count({ where: { reportId: id } });
  if (verificationCount >= MAX_VERIFICATIONS_PER_REPORT) {
    throw new ApiError(
      409,
      "VERIFICATION_LIMIT",
      `Laporan sudah menerima ${MAX_VERIFICATIONS_PER_REPORT} verifikasi.`,
    );
  }
  if (user) {
    const duplicate = await db.reportVerification.findFirst({
      where: { reportId: id, userId: user.id, verificationType: type },
    });
    if (duplicate) {
      throw new ApiError(409, "ALREADY_VERIFIED", "Kamu sudah memverifikasi kondisi ini.");
    }
  }

  const nextStatus = applyLifecycle(current.status as ReportStatus, type);
  await db.reportVerification.create({
    data: {
      reportId: id,
      userId: user?.id ?? null,
      verificationType: type,
      comment: comment ?? null,
      verifiedAt: new Date(),
      result: type === "CHANGED" ? "COMMUNITY_REPORTED" : "VERIFIED",
    },
  });

  const updated = await db.accessibilityReport.update({
    where: { id },
    data: { status: nextStatus },
    include: {
      place: true,
      author: true,
      media: true,
      verifications: { orderBy: { verifiedAt: "desc" } },
    },
  });

  let gamification: GamificationStats | undefined;
  if (current.authorId && type === "CONFIRMED") {
    gamification = markReportVerified(`user:${current.authorId}`);
  }
  return { data: toDetail(updated), source: "database", gamification };
}
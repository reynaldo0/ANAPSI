import { LAYERS, statusMeta } from "@/lib/data/layers";
import { demoMapFeatures, demoPlaces, demoReports } from "@/lib/data/demo-data";
import { placeEvaluation } from "@/lib/data/places-core";
import { REPORT_STATUS_META } from "@/lib/report-status";
import type { DemoFeature, DemoPlace } from "@/lib/data/demo-data";
import type { AccessibilityProfileType, ReportStatus, VerificationStatus } from "@/types";

export type AssistantIntent =
  | "wheelchair_place"
  | "visual_place"
  | "barriers_toward"
  | "facility_with"
  | "feature_status"
  | "ambiguous"
  | "unknown";

export type AssistantSourceType = "place" | "feature" | "report" | "score";

export interface AssistantSource {
  type: AssistantSourceType;
  title: string;
  detail: string;
  reliability: VerificationStatus;
  href?: string;
}

export interface AssistantAnswer {
  intent: AssistantIntent;
  subjectPlace: { id: string; name: string } | null;
  answerText: string;
  bullets: string[];
  sources: AssistantSource[];
  followUps: { label: string; query: string }[];
}

export interface AssistantRequest {
  message: string;
}

export const UNKNOWN_DATA_TEXT = "Belum tersedia cukup data untuk memastikan kondisi tersebut.";

export const ASSISTANT_DISCLAIMER =
  "Asisten menjawab dari data ANAPSI (saat ini data demo untuk pengembangan, RULE 1) dan tidak mengarang kondisi aksesibilitas. Bedakan: terverifikasi / dilaporkan komunitas / belum terverifikasi.";

const ALL_NOUNS: readonly string[] = [
  "ramp",
  "toilet",
  "musala",
  "guiding block",
  "guiding",
  "taktil",
  "elevator",
  "lift",
  "tangga",
  "escalator",
  "eskalator",
];

const NOUN_KIND: Record<string, "ramp" | "toilet" | "guiding_block" | "elevator" | "stairs" | "crossing"> = {
  ramp: "ramp",
  toilet: "toilet",
  musala: "toilet",
  "guiding block": "guiding_block",
  guiding: "guiding_block",
  taktil: "guiding_block",
  elevator: "elevator",
  lift: "elevator",
  tangga: "stairs",
  escalator: "stairs",
  eskalator: "stairs",
};

const PLACE_ALIASES: ReadonlyArray<readonly [readonly string[], string]> = [
  [["halte", "transjakarta"], "place-halte"],
  [["stasiun", "lrt", "velodrome"], "place-stasiun"],
  [["masjid"], "place-masjid"],
  [["cafe", "kafe", "marison"], "place-marison"],
  [["puskesmas"], "place-puskesmas"],
  [["perpustakaan", "library"], "place-library"],
  [["rptra"], "place-rptra"],
  [["universitas", "unj"], "place-unj"],
];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[?.,!]/g, " ");
}

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
}

function reliabilityLabel(verification: VerificationStatus): string {
  if (verification === "VERIFIED") return "terverifikasi";
  if (verification === "COMMUNITY_REPORTED") return "dilaporkan komunitas";
  return "belum terverifikasi";
}

function detectFeatureNoun(message: string): { noun: string; kind: keyof typeof NOUN_KIND } | null {
  const hit = ALL_NOUNS.find((noun) => message.includes(noun));
  return hit ? { noun: hit, kind: NOUN_KIND[hit] } : null;
}

export function findPlacesByQuery(message: string): DemoPlace[] {
  const q = normalize(message);
  const matchedIds = new Set<string>();

  for (const place of demoPlaces) {
    const name = place.name.toLowerCase();
    const address = `${place.address} ${place.city}`.toLowerCase();
    if (name.includes(q) || (q.length >= 4 && address.includes(q))) matchedIds.add(place.id);
  }

  for (const [aliases, id] of PLACE_ALIASES) {
    for (const alias of aliases) {
      const wordMatch = hasWord(q, alias);
      const contained = q.includes(alias) && alias.length >= 6;
      if (wordMatch || contained) {
        const byId = demoPlaces.find((p) => p.id === id);
        if (byId) matchedIds.add(byId.id);
        break;
      }
    }
  }

  return demoPlaces.filter((p) => matchedIds.has(p.id));
}

function hasVerification(features: DemoFeature[], verification: VerificationStatus): boolean {
  return features.some((f) => f.verification === verification);
}

function featureSentence(feature: DemoFeature): string {
  const meta = statusMeta(feature.kind, feature.status);
  const label = feature.stepCount ? `${meta.label} (${feature.stepCount} anak tangga)` : meta.label;
  return `${meta.symbol} ${LAYERS[feature.kind].label} — ${label} (${reliabilityLabel(feature.verification)})`;
}

function featureSource(feature: DemoFeature): AssistantSource {
  const meta = statusMeta(feature.kind, feature.status);
  const place = feature.placeId ? demoPlaces.find((p) => p.id === feature.placeId) : undefined;
  return {
    type: "feature",
    title: `${LAYERS[feature.kind].label}: ${meta.label}`,
    detail: `${place ? `${place.name}` : "area"}: ${reliabilityLabel(feature.verification)}`,
    reliability: feature.verification,
    href: place ? `/places/${place.id}` : "/map",
  };
}

function reportSource(report: (typeof demoReports)[number]): AssistantSource {
  const statusLabel = REPORT_STATUS_META[report.status as ReportStatus]?.label ?? report.status;
  return {
    type: "report",
    title: report.title,
    detail: `${statusLabel} · laporan ${reliabilityLabel(report.verification)} oleh ${report.authorName}`,
    reliability: report.verification,
    href: `/report/${report.id}`,
  };
}

function placeSources(place: DemoPlace): AssistantSource[] {
  const features = demoMapFeatures.filter((f) => f.placeId === place.id);
  const reports = demoReports.filter((r) => r.placeId === place.id);
  return [...features.map(featureSource), ...reports.map(reportSource)];
}

function scoreSource(place: DemoPlace, profile: AccessibilityProfileType): AssistantSource {
  const evaluation = placeEvaluation(place, profile);
  const features = demoMapFeatures.filter((f) => f.placeId === place.id);
  const reports = demoReports.filter((r) => r.placeId === place.id);
  const reliability: VerificationStatus =
    hasVerification(features, "VERIFIED") || reports.some((r) => r.verification === "VERIFIED")
      ? "VERIFIED"
      : features.length > 0 || reports.length > 0
        ? "COMMUNITY_REPORTED"
        : "UNKNOWN";
  return {
    type: "score",
    title: `Skor aksesibilitas ${profile === "WHEELCHAIR_MOBILITY" ? "kursi roda" : "navigasi visual"}: ${evaluation.score ?? "belum tersedia"}/100`,
    detail: `${evaluation.label} · ${reliabilityLabel(reliability)}`,
    reliability,
    href: `/places/${place.id}`,
  };
}

function entranceSummary(place: DemoPlace, profile: AccessibilityProfileType): string[] {
  if (profile !== "WHEELCHAIR_MOBILITY") return [];
  const main = place.entrances.find((e) => e.type === "MAIN") ?? place.entrances[0];
  if (!main) return ["Belum ada data pintu masuk."];
  const lines = [`Pintu masuk utama "${main.name}": ${main.steps === 0 ? "tanpa tangga" : `${main.steps} anak tangga`}, ${main.hasRamp ? "dengan ramp" : "tanpa ramp"}.`];
  const flat = place.entrances.find((e) => e.id !== main.id && e.steps === 0 && e.type !== "SERVICE");
  if (flat) lines.push(`Alternatif rata tanpa tangga tersedia: "${flat.name}".`);
  return lines;
}

function ambiguousAnswer(candidates: DemoPlace[]): AssistantAnswer {
  return {
    intent: "ambiguous",
    subjectPlace: null,
    answerText:
      "Kamu menyebut beberapa kemungkinan tempat. Bisa perjelas dengan menyebut nama lengkapnya.",
    bullets: candidates.map((p) => p.name),
    sources: candidates.map((p) => ({
      type: "place" as const,
      title: p.name,
      detail: p.city,
      reliability: "UNKNOWN" as const,
      href: `/places/${p.id}`,
    })),
    followUps: [],
  };
}

function noDataAnswer(): AssistantAnswer {
  return {
    intent: "unknown",
    subjectPlace: null,
    answerText: UNKNOWN_DATA_TEXT,
    bullets: [
      "Coba sebutkan nama tempat yang lebih spesifik, atau tanyakan fasilitas (misalnya: 'Di mana fasilitas yang memiliki ramp?').",
    ],
    sources: [],
    followUps: [
      { label: "Cari ramp", query: "Di mana fasilitas yang memiliki ramp?" },
    ],
  };
}

function answerFor(
  intent: AssistantIntent,
  place: DemoPlace,
  profile: AccessibilityProfileType,
  featureNoun: { noun: string; kind: keyof typeof NOUN_KIND } | null,
): AssistantAnswer {
  if (intent === "facility_with") {
    return facilityAnswer(featureNoun);
  }

  const evaluation = placeEvaluation(place, profile);
  const features = demoMapFeatures.filter((f) => f.placeId === place.id);
  const reports = demoReports.filter((r) => r.placeId === place.id);

  if (intent === "feature_status") {
    return featureStatusAnswer(place, featureNoun, features, reports);
  }

  if (intent === "barriers_toward") {
    const relevantKinds: string[] =
      profile === "WHEELCHAIR_MOBILITY"
        ? ["ramp", "stairs", "elevator", "path_width", "surface_condition", "accessible_entrance", "obstacle"]
        : ["guiding_block", "pedestrian_crossing", "audio_crossing_signal", "obstacle", "surface_hazard"];
    const barriers = features
      .filter((f) => relevantKinds.includes(f.kind))
      .filter((f) => statusMeta(f.kind, f.status).tone !== "success")
      .sort((a, b) => {
        const aTone = statusMeta(a.kind, a.status).tone;
        const bTone = statusMeta(b.kind, b.status).tone;
        if (aTone === "danger" && bTone !== "danger") return -1;
        if (bTone === "danger" && aTone !== "danger") return 1;
        return 0;
      });
    const sentences: string[] = [];
    if (barriers.length === 0 && reports.length === 0) {
      sentences.push(
        `Tidak ada hambatan yang dilaporkan di area ${place.name} untuk navigasi ${profile === "WHEELCHAIR_MOBILITY" ? "kursi roda" : "visual"}.`,
      );
    } else {
      sentences.push(`Menurut data yang tersedia, hambatan di area ${place.name}:`);
    }
    return {
      intent,
      subjectPlace: { id: place.id, name: place.name },
      answerText: sentences.join(" "),
      bullets: barriers.map(featureSentence),
      sources: [...barriers.map(featureSource), ...reports.map(reportSource)],
      followUps: [
        { label: "Cek aksesibilitas kursi roda", query: `Apakah ${place.name} aksesibel untuk kursi roda?` },
        { label: "Lihat detail tempat", query: `Menuju ${place.name}` },
      ],
    };
  }

  if (intent === "wheelchair_place" || intent === "visual_place") {
    const sentences = [evaluation.score == null ? `Belum ada fitur yang dilaporkan untuk menilai ${place.name}.` : `Menurut data saat ini, ${place.name} memiliki skor aksesibilitas ${profile === "WHEELCHAIR_MOBILITY" ? "kursi roda" : "visual"} ${evaluation.score} dari 100 (${evaluation.label}).`];
    if (intent === "wheelchair_place") sentences.push(...entranceSummary(place, profile));
    return {
      intent,
      subjectPlace: { id: place.id, name: place.name },
      answerText: sentences.join(" "),
      bullets: [...entranceSummary(place, profile), ...evaluation.factors.map((f) => f.label)],
      sources: [scoreSource(place, profile), ...placeSources(place)],
      followUps: [
        { label: "Hambatan utama", query: `Apa hambatan utama menuju ${place.name}?` },
        { label: "Detail tempat", query: `Ke ${place.name}` },
      ],
    };
  }

  return noDataAnswer();
}

function featureStatusAnswer(
  place: DemoPlace,
  featureNoun: { noun: string; kind: keyof typeof NOUN_KIND } | null,
  features: DemoFeature[],
  reports: (typeof demoReports)[number][],
): AssistantAnswer {
  const noun = featureNoun?.noun ?? null;
  const matchReports = noun ? reports.filter((r) => `${r.title} ${r.excerpt}`.toLowerCase().includes(noun)) : [];
  const matchFeatures =
    featureNoun?.kind === "ramp"
      ? features.filter((f) => f.kind === "ramp")
      : featureNoun?.kind === "elevator"
        ? features.filter((f) => f.kind === "elevator")
        : featureNoun?.kind === "guiding_block"
          ? features.filter((f) => f.kind === "guiding_block")
          : featureNoun?.kind === "stairs"
            ? features.filter((f) => f.kind === "stairs")
            : featureNoun?.kind === "toilet"
              ? []
              : [];

  const rampEntrances =
    featureNoun?.kind === "ramp" || noun?.includes("ramp")
      ? place.entrances.filter((e) => e.hasRamp)
      : [];
  const toiletReports = noun && /toilet|wc|musala/.test(noun) ? reports.filter((r) => /toilet|wc|musala/i.test(`${r.title} ${r.excerpt}`)) : [];

  const bullets = [...matchFeatures.map(featureSentence)];
  for (const entrance of rampEntrances) {
    bullets.push(`Pintu masuk "${entrance.name}" memiliki ramp (data tempat).`);
  }
  for (const report of toiletReports) {
    bullets.push(`Laporan: ${report.title} (${reliabilityLabel(report.verification)}).`);
  }

  if (bullets.length === 0) {
    return {
      intent: "feature_status",
      subjectPlace: { id: place.id, name: place.name },
      answerText: UNKNOWN_DATA_TEXT,
      bullets: [`Tidak ada data ${noun ?? "fitur"} tersebut untuk ${place.name}.`],
      sources: [...features.map(featureSource), ...reports.map(reportSource)],
      followUps: [{ label: "Cek tempat", query: `Apakah ${place.name} aksesibel untuk kursi roda?` }],
    };
  }

  const answerText = noun
    ? `Untuk ${noun} di ${place.name}, data yang tersedia:`
    : `Data untuk ${place.name}:`;
  return {
    intent: "feature_status",
    subjectPlace: { id: place.id, name: place.name },
    answerText,
    bullets,
    sources: [...matchFeatures.map(featureSource), ...matchReports.map(reportSource)],
    followUps: [{ label: "Hambatan utama", query: `Apa hambatan utama menuju ${place.name}?` }],
  };
}

function facilityAnswer(featureNoun: { noun: string; kind: keyof typeof NOUN_KIND } | null): AssistantAnswer {
  const kind = featureNoun?.kind ?? null;

  if (kind === "ramp") {
    const placesWithRamp = demoPlaces.filter((p) => p.entrances.some((e) => e.hasRamp));
    const features = demoMapFeatures.filter((f) => f.kind === "ramp");
    if (placesWithRamp.length === 0) return noDataAnswer();
    return {
      intent: "facility_with",
      subjectPlace: null,
      answerText: "Tempat berikut memiliki ramp pada area atau pintu masuknya.",
      bullets: placesWithRamp.map((p) => `${p.name} — data tempat (pintu masuk ber-ramp)`),
      sources: [...placesWithRamp.map((p) => ({
        type: "place" as const,
        title: p.name,
        detail: "Pintu masuk dengan ramp",
        reliability: "UNKNOWN" as const,
        href: `/places/${p.id}`,
      })), ...features.map(featureSource)],
      followUps: [{ label: "Cek halte", query: "Apakah Halte Transjakarta Rawamangun aksesibel untuk kursi roda?" }],
    };
  }

  if (kind === "toilet") {
    const reports = demoReports.filter((r) => /toilet|wc|musala/i.test(`${r.title} ${r.excerpt}`));
    if (reports.length === 0) return noDataAnswer();
    const places = demoPlaces.filter((p) => reports.some((r) => r.placeId === p.id));
    return {
      intent: "facility_with",
      subjectPlace: null,
      answerText: "Fasilitas toilet ramah aksesibilitas yang dilaporkan komunitas:",
      bullets: reports.map((r) => `${r.title} di ${places.find((p) => p.id === r.placeId)?.name ?? "tempat terkait"} (${reliabilityLabel(r.verification)})`),
      sources: reports.map(reportSource),
      followUps: [],
    };
  }

  if (kind === "guiding_block") {
    const good = demoMapFeatures.filter((f) => f.kind === "guiding_block" && f.status === "available");
    if (good.length === 0) return noDataAnswer();
    return {
      intent: "facility_with",
      subjectPlace: null,
      answerText: "Guiding block tersedia di tempat/kawasan berikut:",
      bullets: good.map(featureSentence),
      sources: good.map(featureSource),
      followUps: [{ label: "Cek UNJ", query: "Apakah Universitas Negeri Jakarta aksesibel untuk tunanetra?" }],
    };
  }

  if (kind === "elevator") {
    const features = demoMapFeatures.filter((f) => f.kind === "elevator");
    if (features.length === 0) return noDataAnswer();
    return {
      intent: "facility_with",
      subjectPlace: null,
      answerText: "Kondisi elevator yang dilaporkan saat ini:",
      bullets: features.map(featureSentence),
      sources: features.map(featureSource),
      followUps: [],
    };
  }

  return noDataAnswer();
}

export function askAssistant(request: AssistantRequest): AssistantAnswer {
  const message = request.message.trim();
  const q = normalize(message);

  const featureNoun = detectFeatureNoun(q);
  const candidates = findPlacesByQuery(q);

  const isFacilityQuestion = hasAny(q, ["fasilitas"]) && featureNoun !== null;
  const isFeatureWithLocation =
    featureNoun !== null &&
    hasAny(q, ["beroperasi", "tersedia", "ada", "berfungsi", "matang", "kurang", "bagaimana kondisi", "kondisi"]);
  const isBarrierQuestion = hasAny(q, ["hambatan"]);
  const isWheelchair = hasAny(q, ["kursi roda", "wheelchair", "ramah kursi", "disabilitas duduk"]);
  const isVisual = hasAny(q, ["tunanetra", "netra", "buta", "low vision", "visual", "tongkat"]);

  let intent: AssistantIntent;
  if (isFacilityQuestion) intent = "facility_with";
  else if (isFeatureWithLocation && candidates.length > 0 && featureNoun) intent = "feature_status";
  else if (isBarrierQuestion && candidates.length > 0) intent = "barriers_toward";
  else if (isWheelchair && candidates.length > 0) intent = "wheelchair_place";
  else if (isVisual && candidates.length > 0) intent = "visual_place";
  else if (isWheelchair && candidates.length === 0 && !featureNoun) {
    return {
      intent: "wheelchair_place",
      subjectPlace: null,
      answerText: UNKNOWN_DATA_TEXT,
      bullets: ["Sebutkan nama tempat yang spesifik agar asisten bisa mencarikan datanya."],
      sources: [],
      followUps: [{ label: "Cari ramp", query: "Di mana fasilitas yang memiliki ramp?" }],
    };
  } else if (isFacilityQuestion || featureNoun) {
    return facilityAnswer(featureNoun);
  } else if (candidates.length > 1) {
    return ambiguousAnswer(candidates);
  } else if (candidates.length === 1) {
    intent = isBarrierQuestion ? "barriers_toward" : isVisual ? "visual_place" : "wheelchair_place";
  } else {
    return noDataAnswer();
  }

  const place = candidates[0];
  const profile: AccessibilityProfileType =
    intent === "visual_place" ? "VISUAL_NAVIGATION" : "WHEELCHAIR_MOBILITY";
  return answerFor(intent, place, profile, featureNoun);
}
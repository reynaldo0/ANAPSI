import type { LayerKind } from "@/lib/data/layers";
import type {
  AccessibilityEvaluation,
  AccessibilityFactor,
  AccessibilityProfileType,
  ConfidenceLevel,
} from "@/types";

export interface EntranceEvidence {
  name: string;
  steps: number;
  hasRamp: boolean;
  widthCm: number | null;
}

export interface FeatureEvidence {
  kind: LayerKind;
  status: string;
  stepCount?: number | null;
  verification?: "VERIFIED" | "COMMUNITY_REPORTED" | "UNKNOWN";
}

export interface ScoreInput {
  profile: AccessibilityProfileType;
  entrances: EntranceEvidence[];
  features: FeatureEvidence[];
  freshness: string;
}

export interface PlaceScaleScores {
  visual: AccessibilityEvaluation;
  mobility: AccessibilityEvaluation;
}

const BASE_SCORE = 50;
const VISUAL_KINDS: LayerKind[] = [
  "guiding_block",
  "pedestrian_crossing",
  "audio_crossing_signal",
  "obstacle",
  "surface_hazard",
];
const MOBILITY_FEATURE_KINDS: LayerKind[] = [
  "ramp",
  "stairs",
  "elevator",
  "path_width",
  "surface_condition",
  "accessible_entrance",
];

export function scoreLabel(score: number | null): AccessibilityEvaluation["label"] {
  if (score == null) return "Data Belum Tersedia";
  if (score >= 80) return "Sangat Aksesibel";
  if (score >= 60) return "Aksesibel Sebagian";
  if (score >= 40) return "Aksesibilitas Terbatas";
  return "Hambatan Signifikan";
}

export function scoreLevel(score: number | null): AccessibilityEvaluation["level"] {
  if (score == null) return "unknown";
  if (score >= 80) return "accessible";
  if (score >= 40) return "limited";
  return "not-accessible";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceFor(count: number, hasVerified: boolean): ConfidenceLevel | null {
  if (count === 0) return null;
  if (count >= 4 && hasVerified) return "high";
  if (count >= 2) return "medium";
  return "low";
}

function entranceDeltas(entrance: EntranceEvidence): { delta: number; factors: AccessibilityFactor[] } {
  if (entrance.steps === 0) {
    return {
      delta: 1,
      factors: [{ label: `${entrance.name}: tanpa tangga`, kind: "positive" }],
    };
  }
  if (entrance.hasRamp && entrance.steps <= 2) {
    return {
      delta: 0.5,
      factors: [{ label: `${entrance.name}: ${entrance.steps} anak tangga dengan ramp`, kind: "neutral" }],
    };
  }
  return {
    delta: -1,
    factors: [{ label: `${entrance.name}: ${entrance.steps} anak tangga tanpa ramp`, kind: "negative" }],
  };
}

function entranceWidthFactor(entrance: EntranceEvidence): AccessibilityFactor[] {
  if (entrance.widthCm == null) return [];
  if (entrance.widthCm >= 120) {
    return [{ label: `${entrance.name}: pintu aksesibel ${entrance.widthCm} cm`, kind: "positive" }];
  }
  return [{ label: `${entrance.name}: pintu sempit ${entrance.widthCm} cm`, kind: "negative" }];
}

interface FeatureRule {
  kinds: LayerKind[];
  adjust: (feature: FeatureEvidence) => { delta: number; factors: AccessibilityFactor[] };
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

const MOBILITY_RULES: FeatureRule[] = [
  {
    kinds: ["ramp"],
    adjust: (f) =>
      f.status === "available"
        ? { delta: 1.2, factors: [{ label: "Ramp tersedia di area sekitar", kind: "positive" }] }
        : { delta: -1.2, factors: [{ label: "Ramp rusak di area sekitar", kind: "negative" }] },
  },
  {
    kinds: ["stairs"],
    adjust: (f) => ({
      delta: -1.5,
      factors: [
        {
          label: numberOrNull(f.stepCount) != null ? `Tangga ${f.stepCount} anak tangga` : "Ada tangga di jalur",
          kind: "negative",
        },
      ],
    }),
  },
  {
    kinds: ["elevator"],
    adjust: (f) =>
      f.status === "available"
        ? { delta: 1.2, factors: [{ label: "Elevator tersedia", kind: "positive" }] }
        : f.status === "out_of_service"
          ? { delta: -1.2, factors: [{ label: "Elevator sedang diperbaiki", kind: "negative" }] }
          : { delta: -1, factors: [{ label: "Elevator tidak tersedia", kind: "negative" }] },
  },
  {
    kinds: ["path_width"],
    adjust: (f) =>
      f.status === "accessible"
        ? { delta: 1, factors: [{ label: "Lebar jalur aksesibel", kind: "positive" }] }
        : f.status === "limited"
          ? { delta: -0.8, factors: [{ label: "Lebar jalur terbatas", kind: "neutral" }] }
          : { delta: -1.2, factors: [{ label: "Jalur terlalu sempit", kind: "negative" }] },
  },
  {
    kinds: ["surface_condition"],
    adjust: (f) =>
      f.status === "good"
        ? { delta: 0.8, factors: [{ label: "Permukaan jalur baik", kind: "positive" }] }
        : f.status === "uneven"
          ? { delta: -0.8, factors: [{ label: "Permukaan tidak rata", kind: "neutral" }] }
          : { delta: -1, factors: [{ label: "Permukaan jalur rusak", kind: "negative" }] },
  },
  {
    kinds: ["accessible_entrance"],
    adjust: (f) =>
      f.status === "accessible"
        ? { delta: 1.2, factors: [{ label: "Akses masuk aksesibel", kind: "positive" }] }
        : f.status === "partially_accessible"
          ? { delta: 0, factors: [{ label: "Akses masuk sebagian aksesibel", kind: "neutral" }] }
          : { delta: -1.5, factors: [{ label: "Akses masuk tidak aksesibel", kind: "negative" }] },
  },
];

const VISUAL_RULES: FeatureRule[] = [
  {
    kinds: ["guiding_block"],
    adjust: (f) =>
      f.status === "available"
        ? { delta: 1.2, factors: [{ label: "Guiding block tersedia", kind: "positive" }] }
        : f.status === "damaged"
          ? { delta: -1, factors: [{ label: "Guiding block rusak", kind: "negative" }] }
          : { delta: -1.2, factors: [{ label: "Guiding block terputus", kind: "negative" }] },
  },
  {
    kinds: ["pedestrian_crossing"],
    adjust: (f) =>
      f.status === "signalized" || f.status === "available"
        ? { delta: 1, factors: [{ label: "Zebra crossing dengan lampu", kind: "positive" }] }
        : f.status === "non_signalized"
          ? { delta: -0.5, factors: [{ label: "Zebra crossing tanpa lampu", kind: "neutral" }] }
          : { delta: -0.8, factors: [{ label: "Zebra crossing tidak tersedia", kind: "negative" }] },
  },
  {
    kinds: ["audio_crossing_signal"],
    adjust: (f) =>
      f.status === "available"
        ? { delta: 1.2, factors: [{ label: "Sinyal suara penyeberangan tersedia", kind: "positive" }] }
        : { delta: -1, factors: [{ label: "Sinyal suara penyeberangan tidak tersedia", kind: "negative" }] },
  },
  {
    kinds: ["obstacle"],
    adjust: (f) => ({
      delta: -1,
      factors: [{ label: `Hambatan di jalur (${f.status})`, kind: "negative" }],
    }),
  },
  {
    kinds: ["surface_hazard"],
    adjust: (f) => ({
      delta: -1,
      factors: [{ label: `Bahaya permukaan: ${f.status}`, kind: "negative" }],
    }),
  },
];

export function evaluateAccessibility(input: ScoreInput): AccessibilityEvaluation {
  const { profile, entrances, features, freshness } = input;
  const rules = profile === "WHEELCHAIR_MOBILITY" ? MOBILITY_RULES : VISUAL_RULES;
  const featureKinds = profile === "WHEELCHAIR_MOBILITY" ? MOBILITY_FEATURE_KINDS : VISUAL_KINDS;

  let delta = 0;
  const factors: AccessibilityFactor[] = [];
  let verifiedCount = 0;

  if (profile === "WHEELCHAIR_MOBILITY") {
    for (const entrance of entrances) {
      const entranceResult = entranceDeltas(entrance);
      delta += entranceResult.delta;
      factors.push(...entranceResult.factors, ...entranceWidthFactor(entrance));
    }
  }

  const relevant = features.filter((f) => featureKinds.includes(f.kind));
  for (const feature of relevant) {
    for (const rule of rules) {
      if (!rule.kinds.includes(feature.kind)) continue;
      const result = rule.adjust(feature);
      delta += result.delta;
      factors.push(...result.factors);
      if (feature.verification === "VERIFIED") verifiedCount += 1;
      break;
    }
  }

  const score = relevant.length + (profile === "WHEELCHAIR_MOBILITY" ? entrances.length : 0) === 0 ? null : clamp(BASE_SCORE + delta);
  const confidence = confidenceFor(
    factors.length,
    verifiedCount > 0,
  );

  return {
    score,
    label: scoreLabel(score),
    level: scoreLevel(score),
    factors,
    confidence,
    freshness,
    scale: 100,
  };
}
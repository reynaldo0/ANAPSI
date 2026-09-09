export interface LatLng {
  lat: number;
  lng: number;
}

export type AccessibilityProfileType = "VISUAL_NAVIGATION" | "WHEELCHAIR_MOBILITY";

export enum AudioPriority {
  CriticalWarning = 1,
  NavigationInstruction = 2,
  UserRequestedInformation = 3,
  GeneralUiFeedback = 4,
}

export type AudioStatus = "idle" | "speaking" | "paused" | "stopped" | "unavailable";

export interface AudioRequest {
  id: string;
  text: string;
  priority: AudioPriority;
}

export type ToastTone = "success" | "warning" | "danger" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
}

export type AppearanceTheme = "system" | "light" | "dark";

export interface AppearanceSettings {
  theme: AppearanceTheme;
  highContrast: boolean;
  reduceMotion: boolean;
  textSize: number;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "system",
  highContrast: false,
  reduceMotion: false,
  textSize: 1,
};

export type ReportStatus = "PENDING" | "VERIFIED" | "ACTIVE" | "OUTDATED" | "RESOLVED" | "REJECTED";

export type VerificationStatus = "VERIFIED" | "COMMUNITY_REPORTED" | "UNKNOWN";

export type VerificationType = "CONFIRMED" | "CHANGED" | "RESOLVED";

export const VERIFICATION_TYPES: readonly VerificationType[] = [
  "CONFIRMED",
  "CHANGED",
  "RESOLVED",
];

export type ReportCategory =
  | "STAIRS"
  | "DAMAGED_RAMP"
  | "RAMP"
  | "GUIDING_BLOCK"
  | "DAMAGED_SIDEWALK"
  | "OBSTACLE"
  | "ELEVATOR"
  | "ACCESSIBLE_FACILITY"
  | "OTHER";

export type AffectedProfile = AccessibilityProfileType | "BOTH";

export type Severity = "HIGH" | "MEDIUM" | "LOW";

export interface ReportMediaInfo {
  id: string;
  kind: "photo" | "audio";
  url: string;
  caption: string | null;
}

export interface ReportVerificationInfo {
  id: string;
  type: VerificationType;
  comment: string | null;
  userName: string | null;
  at: string;
}

export interface ReportDetail {
  id: string;
  category: ReportCategory;
  categoryLabel: string;
  description: string;
  severity: Severity;
  affectedProfiles: AffectedProfile[];
  placeId: string | null;
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  reporterName: string | null;
  status: ReportStatus;
  verification: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  media: ReportMediaInfo[];
  verificationCount: number;
  lastVerifiedAt: string | null;
  verifications: ReportVerificationInfo[];
  aiSuggested: boolean;
  moderationNotes: string | null;
  source: "demo" | "database" | "user";
}

export interface SubmitReportMedia {
  kind: "photo";
  url: string;
  caption?: string | null;
}

export interface SubmitReportInput {
  category: ReportCategory;
  description: string;
  severity: Severity;
  affectedProfiles: AffectedProfile[];
  placeId?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  media?: SubmitReportMedia[];
  aiSuggested?: boolean;
  /** Identitas anonim yang stabil dari perangkat (untuk poin & lencana). */
  reporterId?: string | null;
  reporterName?: string | null;
}

export interface GamificationStats {
  reporterId: string;
  reporterName: string | null;
  reports: number;
  verifiedReports: number;
  points: number;
  badges: string[];
  newlyEarned: string[];
  pointsEarned: number;
}

export interface PlaceStub {
  id: string;
  name: string;
  address?: string;
  score?: number | null;
}

export interface Announcement {
  id: string;
  message: string;
  assertive: boolean;
}

export type ScoreLevel = "accessible" | "limited" | "not-accessible" | "unknown";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface AccessibilityFactor {
  label: string;
  kind: "positive" | "negative" | "neutral";
}

export interface AccessibilityEvaluation {
  score: number | null;
  label: string;
  level: ScoreLevel;
  factors: AccessibilityFactor[];
  confidence: ConfidenceLevel | null;
  freshness: string;
  scale: 100;
}

export interface ReportStub {
  id: string;
  title: string;
  excerpt: string;
  status: ReportStatus;
  verification: VerificationStatus;
  authorName: string;
  createdAt: string;
  agree?: number;
  disagree?: number;
}

export interface RouteStub {
  id: string;
  fromName: string;
  toName: string;
  distanceLabel: string;
  durationLabel: string;
  stepsCount?: number | null;
  accessibleLabel: string;
  warnings: string[];
}

export type FeatureTone = "success" | "warning" | "danger" | "neutral";

export interface RouteBarrierInfo {
  id: string;
  kind: string;
  label: string;
  symbol: string;
  tone: "warning" | "danger";
  distanceMeters: number;
  verification: VerificationStatus;
}

export interface RouteFacilityInfo {
  id: string;
  kind: string;
  label: string;
  symbol: string;
  tone: "success" | "warning";
  distanceMeters: number;
}

export interface RouteStepInfo {
  id: string;
  instruction: string;
  distanceMeters: number;
  barrierLabel: string | null;
  facilityLabel: string | null;
  isArrival?: boolean;
}

export interface RouteOption {
  id: string;
  fromName: string;
  toName: string;
  destinationId: string;
  label: "Most Accessible Route" | "Fastest Route";
  recommended: boolean;
  distanceKm: number;
  distanceLabel: string;
  durationMinutes: number;
  durationLabel: string;
  accessibilityScore: number | null;
  scoreLabel: string;
  reasoning: string[];
  warnings: string[];
  barriers: RouteBarrierInfo[];
  facilities: RouteFacilityInfo[];
  geometry: LatLng[];
  steps: RouteStepInfo[];
  honestNote: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
}

export interface UserProfile {
  displayName: string;
  accessibility: AccessibilityProfileType | null;
}

export interface PlaceSummary {
  id: string;
  name: string;
  address: string;
  city: string;
  category: string;
  lat: number;
  lng: number;
  score: { visual: number | null; mobility: number | null } | null;
  distanceLabel?: string;
  distanceKm?: number;
}

export interface EntranceInfo {
  id: string;
  name: string;
  type: "MAIN" | "ALTERNATE" | "SERVICE";
  steps: number;
  hasRamp: boolean;
  widthCm: number | null;
  notes: string | null;
  formattedSteps: string;
  formattedWidth: string;
  recommended: boolean;
}

export interface MapFeatureReturn {
  id: string;
  kind: string;
  status: string;
  symbol: string;
  label: string;
  statusLabel: string;
  tone: "success" | "warning" | "danger" | "neutral";
  lat: number;
  lng: number;
  placeId?: string | null;
  placeName?: string | null;
  verification: VerificationStatus;
  stepCount?: number | null;
}

export interface MapLineFeature {
  id: string;
  kind: "guiding_block";
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  points: LatLng[];
  verification: VerificationStatus;
}

export interface PlaceDetail {
  summary: PlaceSummary;
  description: string;
  score: { visual: number | null; mobility: number | null } | null;
  factors: AccessibilityFactor[];
  entrances: EntranceInfo[];
  reports: ReportStub[];
  freshness: string;
}

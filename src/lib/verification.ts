import type { VerificationStatus } from "@/types";

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  VERIFIED: "Terverifikasi",
  COMMUNITY_REPORTED: "Dilaporkan komunitas",
  UNKNOWN: "Belum terverifikasi",
};

export function verificationLabel(status: VerificationStatus): string {
  return VERIFICATION_LABELS[status];
}
-- Phase 5: Community Verification — verifikator laporan (FR-019).
ALTER TABLE "ReportVerification"
  ADD COLUMN "verificationType" TEXT NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "comment" TEXT;
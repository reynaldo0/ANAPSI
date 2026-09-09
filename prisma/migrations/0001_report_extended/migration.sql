-- Phase 4: Report System — tambah metadata laporan (FR-015/016/017/021).
ALTER TABLE "AccessibilityReport"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "affectedProfiles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ALTER COLUMN "placeId" DROP NOT NULL;
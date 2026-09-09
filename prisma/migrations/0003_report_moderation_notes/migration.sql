-- Add moderation notes to accessibility reports (admin moderation, FR-031).

ALTER TABLE "AccessibilityReport" ADD "moderationNotes" TEXT;
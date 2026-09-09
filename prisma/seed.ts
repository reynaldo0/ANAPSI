import { PrismaClient, ProfileType, ReportStatus, VerificationStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

/**
 * SEED DATA — DEMO / "MOCK" HANYA UNTUK PENGEMBANGAN.
 * Seluruh data berikut TIDAK boleh mengaku sebagai kondisi nyata.
 * Jalankan: npm run db:seed
 */
const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.savedPlace.deleteMany();
  await prisma.accessibilityScore.deleteMany();
  await prisma.reportVerification.deleteMany();
  await prisma.reportMedia.deleteMany();
  await prisma.accessibilityReport.deleteMany();
  await prisma.accessibilityFeature.deleteMany();
  await prisma.entrance.deleteMany();
  await prisma.place.deleteMany();
  await prisma.accessibilityProfile.deleteMany();
  await prisma.user.deleteMany();

  const demoPassword = await hashPassword("blindspot-demo");

  const [demoVisual, demoMobility] = await Promise.all([
    prisma.user.create({
      data: {
        email: "demo.tunanetra@blindspot.dev",
        displayName: "Demo Tunanetra",
        passwordHash: demoPassword,
        accessibilityProfile: {
          create: { type: ProfileType.VISUAL_NAVIGATION },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "demo.kursiroda@blindspot.dev",
        displayName: "Demo Kursi Roda",
        passwordHash: demoPassword,
        accessibilityProfile: {
          create: { type: ProfileType.WHEELCHAIR_MOBILITY },
        },
      },
    }),
  ]);

  const unc = await prisma.place.create({
    data: {
      name: "Universitas Negeri Jakarta",
      address: "Jl. Rawamangun Muka Raya No. 11",
      city: "Jakarta",
      latitude: -6.2012,
      longitude: 106.8741,
      category: "Pendidikan",
      description: "Kampus utama UNJ, area Gedung Dekanat.",
      score: {
        create: { visualValue: 3.1, mobilityValue: 3.8, rating: 3.4 },
      },
      entrances: {
        create: [
          { name: "Pintu Depan", type: "MAIN", stepCount: 3, hasRamp: true, widthCm: 120 },
          { name: "Gerbang Samping", type: "ALTERNATE", stepCount: 0, hasRamp: true, widthCm: 150 },
        ],
      },
      features: {
        create: [
          { type: "RAMP", present: true },
          { type: "TACTILE", present: true, notes: "Guidance block di sekitar gedung A" },
          { type: "ELEVATOR", present: true },
          { type: "BRAILLE", present: false },
        ],
      },
    },
  });

  const marison = await prisma.place.create({
    data: {
      name: "Marison Cafe Rawamangun",
      address: "Jl. Pemuda No. 58",
      city: "Jakarta",
      latitude: -6.1998,
      longitude: 106.8755,
      category: "Kuliner",
      description: "Cafe dengan area outdoor dan indoor.",
      score: {
        create: { visualValue: 4.2, mobilityValue: 3.6, rating: 3.9 },
      },
      entrances: {
        create: [{ name: "Pintu Utama", type: "MAIN", stepCount: 1, hasRamp: false, widthCm: 90 }],
      },
      features: {
        create: [
          { type: "AUTOMATIC_DOOR", present: false },
          { type: "STAIRS", present: true },
        ],
      },
    },
  });

  await prisma.accessibilityReport.create({
    data: {
      placeId: unc.id,
      authorId: demoVisual.id,
      title: "Trotoar keluar kampus rusak",
      body:
        "Trotoar di depan pintu samping ada lubang besar setelah hujan. " +
        "CARA MENDAPATKAN DATA INI: ini data DEMO, bukan kondisi nyata.",
      status: ReportStatus.VERIFIED,
      verifications: {
        create: [{ result: VerificationStatus.VERIFIED, verificationType: "CONFIRMED", yesVotes: 3, noVotes: 0 }],
      },
    },
  });

  await prisma.accessibilityReport.create({
    data: {
      placeId: marison.id,
      authorId: demoMobility.id,
      title: "Toilet ramah kursi roda tersedia",
      body:
        "Tersedia toilet khusus aksesibel di lantai 1. " +
        "CARA MENDAPATKAN DATA INI: ini data DEMO, bukan kondisi nyata.",
      status: ReportStatus.ACTIVE,
      verifications: {
        create: [{ result: VerificationStatus.COMMUNITY_REPORTED, verificationType: "CHANGED", yesVotes: 2, noVotes: 1 }],
      },
    },
  });

  await prisma.savedPlace.create({
    data: { userId: demoVisual.id, placeId: unc.id },
  });

  console.log("Seed selesai. Data DEMO/MOCK, bukan kondisi nyata.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

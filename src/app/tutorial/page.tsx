"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { OnboardingStoryboard } from "@/components/onboarding/OnboardingStoryboard";
import { startGuideTour } from "@/lib/guide-tour";

export default function TutorialPage() {
  const router = useRouter();
  const { userType } = useAccessibilityProfile();
  const isBlind = userType === "VISUAL_NAVIGATION";

  const tryLiveTour = () => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") {
      router.push("/");
      window.setTimeout(() => startGuideTour("home"), 800);
    } else {
      startGuideTour("home");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-[2rem] font-black leading-none tracking-tight">
        Cara <span className="text-grad">Pakai</span>
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        Tutorial singkat {isBlind ? "yang dibacakan untukmu" : "sesuai kebutuhanmu"}.
      </p>
      <div className="mt-6">
        <OnboardingStoryboard profile={userType} autoSpeak={isBlind} />
      </div>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={tryLiveTour}
          className="inline-flex h-13 items-center gap-2 rounded-full primary-solid px-6 font-black text-primary-foreground shadow-card hover:opacity-90"
        >
          <BookOpenText className="h-5 w-5" aria-hidden="true" /> Coba tour langsung di aplikasi
        </button>
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Profilmu aktif{" "}
        <Link href="/profile" className="font-bold text-primary underline-offset-2 hover:underline">
          bisa diganti di halaman Profil
        </Link>
        {" "}atau{" "}
        <Link href="/onboarding" className="font-bold text-primary underline-offset-2 hover:underline">
          atur ulang dari awal
        </Link>
        .
      </p>
    </div>
  );
}
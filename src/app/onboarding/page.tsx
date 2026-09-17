"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Volume2, PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileSwitcher } from "@/components/profile/ProfileSwitcher";
import { OnboardingStoryboard } from "@/components/onboarding/OnboardingStoryboard";
import { announceLiveRegion } from "@/lib/announcement";
import { isDisabilityUserType, ONBOARDING_CHOICES } from "@/lib/constants";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { useAuth } from "@/lib/state/AuthContext";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { useToast } from "@/components/ui/Toast";
import { AudioPriority } from "@/types";
import { cn } from "@/lib/cn";

const STEP_LABELS = ["Kamu siapa?", "Tutorial", "Selesai"];

export default function OnboardingPage() {
  const router = useRouter();
  const { userType, setUserType } = useAccessibilityProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const audio = useAudioManager();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const stepMeta = ONBOARDING_CHOICES.find((c) => c.value === userType);
  const canContinue = step === 0 ? userType !== null : step < 2;
  const isBlind = userType === "VISUAL_NAVIGATION";
  const isDisabled = isDisabilityUserType(userType);

  const changeStep = (next: number) => {
    setStep(next);
    const announcement = `Langkah ${next + 1} dari 3: ${STEP_LABELS[next]}`;
    announceLiveRegion(announcement, { assertive: true });
    if (isBlind) audio.speak(announcement, AudioPriority.UserRequestedInformation);
  };

  useEffect(() => {
    if (step !== 0 || !audio.supported) return;
    const greeting =
      "Halo, selamat datang di ANAPSI. Kamu siapa? Pilih tunanetra untuk panduan suara lengkap, tunadaksa untuk rute kursi roda, atau tanpa disabilitas untuk pengalaman standar. Gunakan tombol Lanjut setelah memilih.";
    const t = setTimeout(() => {
      audio.speak(greeting, AudioPriority.UserRequestedInformation);
      announceLiveRegion(greeting, { assertive: true });
    }, 600);
    return () => clearTimeout(t);
  }, [step, audio]);

  const save = async () => {
    if (!userType) return;
    setSaving(true);
    try {
      if (user && isDisabled) {
        const response = await fetch("/api/profile/accessibility", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: userType }),
        });
        if (response.ok) {
          toast({ tone: "success", title: "Profil tersimpan", message: "Profil aksesibilitas tersimpan di akunmu." });
        } else {
          toast({ tone: "warning", title: "Tersimpan di perangkat", message: "Profil tersimpan di perangkat ini; sinkronisasi akun belum tersedia." });
        }
      } else {
        toast({ tone: "success", title: "Pilihan tersimpan", message: "Tersimpan di perangkat ini. Masuk untuk sinkronisasi." });
      }
      const done = isDisabled
        ? `Pengaturan selesai. Profil ${stepMeta?.label} aktif. Tutorial panduan akan muncul di halaman utama.`
        : "Pengaturan selesai. Siap menjelajah!";
      announceLiveRegion(done, { assertive: true });
      if (isBlind) audio.speak(done, AudioPriority.UserRequestedInformation);
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <nav aria-label="Tahapan onboarding" className="flex items-center gap-2">
        {STEP_LABELS.map((label, index) => (
          <span
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black",
              index === step
                ? "primary-solid text-primary-foreground shadow-card"
                : index < step
                  ? "bg-primary-soft text-primary"
                  : "border border-border text-muted-foreground",
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">{index + 1}</span>
            {label}
          </span>
        ))}
      </nav>

      {step === 0 ? (
        <div className="mt-8">
          <h1 className="text-[2rem] font-black leading-none tracking-tight">
            Kamu <span className="text-grad">siapa</span>?
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Pilih satu — ANAPSI mengubah cara bicara, rute, dan besarnya tombol
            <strong> khusus untukmu</strong>. Kamu tidak wajib masuk; semua bisa dipakai anonim.
          </p>
          <div className="mt-6">
            <ProfileSwitcher
              value={userType}
              onChange={(value) => {
                setUserType(value);
                const meta = ONBOARDING_CHOICES.find((x) => x.value === value);
                if (meta) {
                  announceLiveRegion(`${meta.label} dipilih. ${meta.tagline}.`, { assertive: true });
                  if (value !== "NON_DISABLED") {
                    audio.speak(`${meta.label} dipilih. ${meta.tagline}`, AudioPriority.UserRequestedInformation);
                  }
                }
              }}
              legend="Apakah kamu tanpa disabilitas, tunanetra, atau tunadaksa?"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const text = "Pilih tunanetra untuk panduan suara lengkap. Pilih tunadaksa untuk rute bebas tangga dan tombol besar. Pilih tanpa disabilitas untuk pengalaman standar dan membantu komunitas.";
              audio.speak(text, AudioPriority.UserRequestedInformation);
              announceLiveRegion(text, { assertive: true });
            }}
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-full border-2 border-border bg-card px-5 font-bold hover:bg-muted"
          >
            <Volume2 className="h-5 w-5" aria-hidden="true" /> Dengarkan penjelasan
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-8">
          <h1 className="text-[2rem] font-black leading-none tracking-tight">
            Tutorial <span className="text-grad">cara pakai</span>
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Cerita singkat {isDisabled ? "yang dibacakan untukmu" : "sesuai kebutuhanmu"}. Geser dengan tombol Lanjut.
          </p>
          <div className="mt-6">
            <OnboardingStoryboard profile={userType} autoSpeak={isBlind} />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-8">
          <div className="rounded-24 border-2 border-border bg-card p-8 text-center shadow-card">
            <PartyPopper className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
            <h1 className="mt-4 text-h1 font-black">Semua siap!</h1>
            <p className="mt-2 text-muted-foreground">
              Pilihan aktif:{" "}
              <strong className="inline-flex items-center gap-2 text-foreground">
                {stepMeta ? (
                  <>
                    <stepMeta.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    {stepMeta.label}
                  </>
                ) : (
                  "belum dipilih"
                )}
              </strong>
              .
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isDisabled
                ? "Kamu bisa langsung memakai tanpa masuk — tutorial panduan akan dipandu di halaman utama."
                : "Masuk/Daftar opsional — kamu bisa melapor tanpa masuk."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={save} loading={saving} disabled={!userType} size="lg">
                Selesai, mulai jelajah <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => changeStep(step - 1)}>
                Kembali ke tutorial
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step < 2 ? (
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => step > 0 && changeStep(step - 1)} disabled={step === 0}>
            Kembali
          </Button>
          <Button onClick={() => canContinue && changeStep(step + 1)} disabled={!canContinue} size="lg">
            {step === 0 ? "Lanjut ke tutorial" : "Selesai"}
          </Button>
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Kamu bisa membuka tutorial <strong>Cara Pakai</strong> kapan saja dari halaman utama.
      </p>
    </div>
  );
}
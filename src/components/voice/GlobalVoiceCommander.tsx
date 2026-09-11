"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AudioLines, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { announceLiveRegion } from "@/lib/announcement";
import { STORAGE_KEYS } from "@/lib/constants";
import { AudioPriority } from "@/types";

function parseIntent(text: string): { action: string; arg?: string } | null {
  const t = text.toLowerCase().trim();
  if (/^(ulangi|repeat)$/.test(t)) return { action: "repeat" };
  if (/^(berhenti|stop|diam)$/.test(t)) return { action: "stop" };
  const searchArg = t.match(/(?:^|\s)cari\s+(.+)$/);
  if (searchArg) return { action: "search", arg: searchArg[1].trim() };
  if (t.includes("buka peta") || t === "peta" || t === "buka petanya") return { action: "map" };
  if (t.includes("laporkan") || t.includes("lapor hambatan") || /^lapor/.test(t)) return { action: "report" };
  const routeArg = t.match(/(?:^|\s)rute\s+ke\s+(.+)$/);
  if (routeArg) return { action: "route", arg: routeArg[1].trim() };
  if (t.includes("chatbot") || t.includes("ngobrol") || t.includes("asisten")) return { action: "chatbot" };
  if (t.includes("bantuan") || t.includes("help")) return { action: "help" };
  if (t.includes("kembali")) return { action: "back" };
  if (t.includes("beranda") || /^home/.test(t)) return { action: "home" };
  if (t.includes("profil")) return { action: "profile" };
  return null;
}

const HANDS_FREE_PAGES = new Set(["/", "/map"]);

function readDefaultHandsFree(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.handsFree);
    if (stored !== null) return stored === "true";
  } catch {
    // ignore
  }
  try {
    return localStorage.getItem(STORAGE_KEYS.profile) === "VISUAL_NAVIGATION";
  } catch {
    return false;
  }
}

function persistHandsFree(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.handsFree, String(value));
  } catch {
    // ignore
  }
}

export function GlobalVoiceCommander() {
  const router = useRouter();
  const pathname = usePathname();
  const audio = useAudioManager();
  const voice = useSpeechRecognition({
    listening: "Komando suara aktif. Katakan: Cari UNJ, Buka peta, Rute ke halte, Laporkan, atau Bantuan.",
    ended: "Selesai mendengarkan.",
    denied: "Mikrofon ditolak.",
    noSpeech: "Tidak ada suara. Coba lagi.",
    interim: (s) => `Mendengar: ${s}`,
  });
  const [handsFree, setHandsFreeState] = useState(readDefaultHandsFree);
  const [enabled, setEnabled] = useState(true);
  const [lastHeard, setLastHeard] = useState("");
  const handledRef = useRef(0);
  const processTranscriptRef = useRef<() => void>(() => {});

  const isHandsFreePage = HANDS_FREE_PAGES.has(pathname);
  const audioBusy = audio.status === "speaking" || audio.status === "paused";
  const micStatus = voice.status;
  const { start: startMic, suspend: suspendMic } = voice;

  const setHandsFree = useCallback((value: boolean) => {
    setHandsFreeState(value);
    persistHandsFree(value);
  }, []);

  const speak = useCallback(
    (text: string, priority: AudioPriority = AudioPriority.UserRequestedInformation) => {
      if (!enabled) {
        announceLiveRegion(text, { assertive: true });
        return;
      }
      audio.speak(text, priority);
      announceLiveRegion(text, { assertive: true });
    },
    [enabled, audio],
  );

  // Umumkan navigasi — setiap perpindahan halaman ada suara (2 arah: aksi -> suara)
  useEffect(() => {
    const names: Record<string, string> = { "/": "Beranda", "/map": "Peta", "/report": "Lapor hambatan", "/route": "Cari rute", "/assistant": "Asisten", "/chatbot": "Chatbot" };
    const name = names[pathname] ?? pathname;
    if (pathname) announceLiveRegion(`Membuka ${name}`);
  }, [pathname]);

  // MODE SUARA LANGSUNG: mikrofon selalu menyala di halaman peta/beranda tanpa perlu mematikan dulu.
  // Jeda saat web berbicara agar tidak menangkap gema suaranya sendiri, lalu lanjut menyimak.
  const suspendSinceRef = useRef(0);
  useEffect(() => {
    if (!handsFree) return;
    if (!isHandsFreePage) {
      suspendMic();
      return;
    }
    if (audioBusy) {
      const suspendedLong = suspendSinceRef.current > 0 && Date.now() - suspendSinceRef.current > 30000;
      if (micStatus !== "inactive") {
        if (suspendSinceRef.current === 0) suspendSinceRef.current = Date.now();
        suspendMic();
      }
      // Pengaman: jika balasan macet >30 detik, lanjut mendengarkan lagi.
      if (suspendedLong && micStatus === "inactive") {
        suspendSinceRef.current = 0;
        handledRef.current = 0;
        startMic();
      }
      return;
    }
    if (micStatus === "inactive") {
      suspendSinceRef.current = 0;
      handledRef.current = 0;
      startMic();
    }
  }, [handsFree, isHandsFreePage, audioBusy, micStatus, startMic, suspendMic]);

  useEffect(() => {
    processTranscriptRef.current = () => {
      if (!voice.finalTranscript) return;
      const handled = Math.min(handledRef.current, voice.finalTranscript.length);
      const fresh = voice.finalTranscript.slice(handled).trim();
      handledRef.current = voice.finalTranscript.length;
      if (!fresh) return;
      setLastHeard(fresh);
      const intent = parseIntent(fresh);
      if (!intent) {
        speak("Perintah tidak dikenali. Coba: Cari rumah sakit, Buka peta, Rute ke halte, atau Bantuan.");
        return;
      }
      try {
        if ("vibrate" in navigator) navigator.vibrate(40);
      } catch {
        // ignore
      }
      switch (intent.action) {
        case "repeat":
          audio.repeat();
          speak("Mengulangi.");
          break;
        case "stop":
          audio.stop();
          announceLiveRegion("Audio dihentikan");
          break;
        case "search":
          speak(`Mencari ${intent.arg}. Hasil tampil di peta dan daftar tempat terdekat. Katakan: cari tempat lain, atau bantuan.`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("blindspot:voice-search", { detail: { q: intent.arg ?? "" } }));
          }
          router.push(`/map?q=${encodeURIComponent(intent.arg ?? "")}`);
          break;
        case "map":
          speak("Membuka peta. Katakan saat ini juga: cari tempat, rute ke tujuan, atau lapor hambatan.");
          router.push("/map");
          break;
        case "report":
          speak("Membuka lapor hambatan. Sampaikan hambatan dengan jelas saat halaman terbuka.");
          router.push("/report");
          break;
        case "route":
          speak(`Mencari rute ke ${intent.arg}. Rute akan dihitung dengan aman. Katakan: buka peta untuk melihat rute.`);
          router.push(`/route?to=${encodeURIComponent(intent.arg ?? "")}`);
          break;
        case "chatbot":
          speak("Membuka chatbot tunanetra.");
          router.push("/chatbot");
          break;
        case "help":
          speak("Perintah tersedia: cari, buka peta, rute ke, laporkan, chatbot, beranda, ulangi, berhenti, kembali. Mode suara langsung menyala — katakan perintah kapan saja.");
          break;
        case "back":
          speak("Kembali ke halaman sebelumnya");
          router.back();
          break;
        case "home":
          speak("Membuka beranda");
          router.push("/");
          break;
        case "profile":
          speak("Membuka profil");
          router.push("/profile");
          break;
      }
    };
  });

  useEffect(() => {
    if (voice.finalTranscript) processTranscriptRef.current();
  }, [voice.finalTranscript]);

  const toggleHandsFree = () => {
    const next = !handsFree;
    setHandsFree(next);
    if (next) {
      speak("Mode suara langsung aktif. Mikrofon selalu menyala — katakan perintah kapan saja: cari, rute ke, buka peta, atau bantuan.");
    } else {
      voice.stop();
      speak("Mode suara langsung dimatikan.");
    }
  };

  const toggleManualMic = () => {
    if (voice.status === "listening") {
      voice.stop();
    } else {
      handledRef.current = 0;
      voice.start();
    }
  };

  const statusLabel = handsFree
    ? voice.interim
      ? voice.interim
      : audioBusy
        ? "Mendengarkan setelah balasan…"
        : voice.status === "listening"
          ? "Mendengarkan…"
          : "Suara Langsung Aktif"
    : lastHeard
      ? `Terakhir: ${lastHeard}`
      : "Tekan mic, ucapkan perintah";

  return (
    <div role="region" aria-label="Komando suara global 2 arah" data-tour="voice" className="fixed bottom-2 left-2 z-40 flex items-center gap-2 rounded-full border-2 border-border bg-card px-2 py-1 shadow-float md:bottom-4">
      <button
        type="button"
        onClick={toggleHandsFree}
        aria-pressed={handsFree}
        aria-label={handsFree ? "Matikan Mode Suara Langsung — mikrofon selalu menyala" : "Nyalakan Mode Suara Langsung — mikrofon selalu menyala tanpa perlu mematikan"}
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${handsFree ? "animate-pulse border-danger bg-danger text-white" : "border-primary bg-primary text-primary-foreground"}`}
      >
        <AudioLines className="h-5 w-5" aria-hidden="true" />
      </button>
      {!handsFree ? (
        <button
          type="button"
          onClick={toggleManualMic}
          aria-pressed={voice.status === "listening"}
          aria-label={voice.status === "listening" ? "Hentikan komando suara global" : "Aktifkan komando suara global — bicara: Cari, Buka peta, Rute ke"}
          className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${voice.status === "listening" ? "animate-pulse border-danger bg-danger text-white" : "border-primary bg-primary text-primary-foreground"}`}
        >
          {voice.status === "listening" ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      ) : null}
      <div className="hidden max-w-[180px] flex-col sm:flex">
        <span className="text-xs font-black leading-none">{handsFree ? "Suara Langsung" : "Suara 2 Arah"}</span>
        <span className="truncate text-[11px] text-muted-foreground" aria-live="polite">{statusLabel}</span>
      </div>
      <button type="button" onClick={() => setEnabled((v) => !v)} aria-pressed={enabled} aria-label={enabled ? "Matikan suara balasan" : "Aktifkan suara balasan"} className={`flex h-9 w-9 items-center justify-center rounded-full border ${enabled ? "border-border bg-background" : "border-warning bg-warning-soft text-warning"}`}>
        {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </div>
  );
}
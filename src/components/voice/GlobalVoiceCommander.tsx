"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { announceLiveRegion } from "@/lib/announcement";
import { AudioPriority } from "@/types";

function parseIntent(text: string): { action: string; arg?: string } | null {
  const t = text.toLowerCase().trim();
  if (/^(ulangi|repeat)$/.test(t)) return { action: "repeat" };
  if (/^(berhenti|stop|diam)$/.test(t)) return { action: "stop" };
  if (t.startsWith("cari ")) return { action: "search", arg: t.slice(5).trim() };
  if (t.includes("buka peta") || t === "peta") return { action: "map" };
  if (t.includes("laporkan") || t.includes("lapor hambatan")) return { action: "report" };
  if (t.startsWith("rute ke ")) return { action: "route", arg: t.slice(8).trim() };
  if (t.includes("chatbot") || t.includes("ngobrol")) return { action: "chatbot" };
  if (t.includes("bantuan") || t.includes("help")) return { action: "help" };
  if (t.includes("kembali")) return { action: "back" };
  if (t.includes("profil")) return { action: "profile" };
  return null;
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
  const [enabled, setEnabled] = useState(true);
  const handledRef = useRef(0);
  const [lastHeard, setLastHeard] = useState("");
  const processTranscriptRef = useRef<() => void>(() => {});

  const speak = (text: string, priority: AudioPriority = AudioPriority.UserRequestedInformation) => {
    if (!enabled) { announceLiveRegion(text, { assertive: true }); return; }
    audio.speak(text, priority);
    announceLiveRegion(text, { assertive: true });
  };

  // Umumkan navigasi — setiap perpindahan halaman ada suara (2 arah: aksi -> suara)
  useEffect(() => {
    const names: Record<string, string> = { "/": "Beranda", "/map": "Peta", "/report": "Lapor hambatan", "/route": "Cari rute", "/assistant": "Asisten", "/chatbot": "Chatbot" };
    const name = names[pathname] ?? pathname;
    // Jangan autoplay panjang, cukup singkat agar tidak tabrakan dengan screen reader
    if (pathname) announceLiveRegion(`Membuka ${name}`);
  }, [pathname]);

  useEffect(() => {
    processTranscriptRef.current = () => {
      if (!voice.finalTranscript) return;
      const fresh = voice.finalTranscript.slice(handledRef.current).trim();
      handledRef.current = voice.finalTranscript.length;
      if (!fresh) return;
      setLastHeard(fresh);
      const intent = parseIntent(fresh);
      if (!intent) {
        speak("Perintah tidak dikenali. Coba: Cari UNJ, Buka peta, Rute ke halte, atau Bantuan.");
        return;
      }
      try { if ("vibrate" in navigator) navigator.vibrate(40); } catch {}
      switch (intent.action) {
        case "repeat": audio.repeat(); speak("Mengulangi."); break;
        case "stop": audio.stop(); announceLiveRegion("Audio dihentikan"); break;
        case "search": speak(`Mencari ${intent.arg}`); router.push(`/map?q=${encodeURIComponent(intent.arg ?? "")}`); break;
        case "map": speak("Membuka peta"); router.push("/map"); break;
        case "report": speak("Membuka lapor hambatan"); router.push("/report"); break;
        case "route": speak(`Mencari rute ke ${intent.arg}`); router.push(`/route?to=${encodeURIComponent(intent.arg ?? "")}`); break;
        case "chatbot": speak("Membuka chatbot tunanetra Groq"); router.push("/chatbot"); break;
        case "help": speak("Perintah tersedia: Cari, Buka peta, Rute ke, Laporkan, Chatbot, Ulangi, Berhenti, Kembali."); break;
        case "back": speak("Kembali"); router.back(); break;
        case "profile": speak("Membuka profil"); router.push("/profile"); break;
      }
    };
  });

  useEffect(() => {
    if (voice.finalTranscript) processTranscriptRef.current();
  }, [voice.finalTranscript]);

  return (
    <div role="region" aria-label="Komando suara global 2 arah" data-tour="voice" className="fixed bottom-2 left-2 z-40 flex items-center gap-2 rounded-full border-2 border-border bg-card px-2 py-1 shadow-float md:bottom-4">
      <button
        type="button"
        onClick={() => (voice.status === "listening" ? voice.stop() : voice.start())}
        aria-pressed={voice.status === "listening"}
        aria-label={voice.status === "listening" ? "Hentikan komando suara global" : "Aktifkan komando suara global — bicara: Cari, Buka peta, Rute ke"}
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${voice.status === "listening" ? "animate-pulse border-danger bg-danger text-white" : "border-primary bg-primary text-primary-foreground"}`}
      >
        {voice.status === "listening" ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      <div className="hidden max-w-[180px] flex-col sm:flex">
        <span className="text-xs font-black leading-none">Suara 2 Arah</span>
        <span className="truncate text-[11px] text-muted-foreground" aria-live="polite">{voice.status === "listening" ? (voice.interim || "Mendengarkan…") : lastHeard ? `Terakhir: ${lastHeard}` : "Tekan mic, ucapkan perintah"}</span>
      </div>
      <button type="button" onClick={() => setEnabled((v) => !v)} aria-pressed={enabled} aria-label={enabled ? "Matikan suara balasan" : "Aktifkan suara balasan"} className={`flex h-9 w-9 items-center justify-center rounded-full border ${enabled ? "border-border bg-background" : "border-warning bg-warning-soft text-warning"}`}>
        {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { useSpeechRecognition, type VoiceCopy } from "@/lib/voice/useSpeechRecognition";
import { announceLiveRegion } from "@/lib/announcement";
import { useSignLanguage } from "@/lib/state/SignLanguageContext";
import { SignLanguagePanel } from "@/components/sign-language/SignLanguagePanel";
import { SignLanguageToggle } from "@/components/sign-language/SignLanguageToggle";
import { AudioPriority } from "@/types";
import { cn } from "@/lib/cn";

const VOICE_COPY: VoiceCopy = {
  listening: "Chatbot mendengarkan. Bicara pelan dan jelas, lalu diam sejenak.",
  ended: "Mendengarkan selesai. Mengirim pesan.",
  denied: "Mikrofon ditolak. Silakan ketik.",
  noSpeech: "Tidak ada suara. Coba tekan mikrofon lagi.",
  interim: (t) => `Mendengar: ${t}`,
};

type ChatMsg = { role: "user" | "assistant"; content: string };

export function BlindChatbot() {
  const audio = useAudioManager();
  const utteranceRef = useRef<(t: string) => void>(() => {});
  const micSuspendRef = useRef<() => void>(() => {});
  const voice = useSpeechRecognition(VOICE_COPY, {
    endPointerMs: 1000,
    onUserSpeaking: () => audio.stop(),
    onUtterance: (text) => utteranceRef.current(text),
  });
  const sign = useSignLanguage();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMsg[]>([
    { role: "assistant", content: "Halo! Saya teman ngobrol ANAPSI khusus tunanetra. Bicara atau ketik — saya jawab singkat dan bisa dibacakan. Mau cari tempat, cek hambatan, atau laporkan?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [recording, setRecording] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});

  const speak = (text: string) => {
    if (!autoSpeak) announceLiveRegion(text, { assertive: true });
    else audio.speak(text, AudioPriority.UserRequestedInformation);
  };

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [history, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const nextHistory = [...history, { role: "user" as const, content: msg }];
    setHistory(nextHistory);
    setInput("");
    setLoading(true);
    announceLiveRegion("Mengirim pesan ke chatbot");
    try {
      const res = await fetch("/api/chatbot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, history }) });
      const body = await res.json() as { ok: boolean; data?: { reply: string }; error?: { message: string } };
      if (!res.ok || !body.ok || !body.data) throw new Error(body.error?.message ?? "Gagal");
      const reply = body.data.reply;
      setHistory((h) => [...h, { role: "assistant", content: reply }]);
      speak(reply);
      try { if ("vibrate" in navigator) navigator.vibrate(40); } catch {}
    } catch (e) {
      const m = e instanceof Error ? e.message : "Gagal menghubungi chatbot";
      setHistory((h) => [...h, { role: "assistant", content: `Maaf, ${m}. Coba lagi atau ketik.` }]);
      announceLiveRegion(m, { assertive: true });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    sendRef.current = send;
  });

  const handleUtterance = useCallback((text: string) => {
    void sendRef.current(text);
    // Matikan mikrofon selama AI menjawab supaya jawaban TTS tidak
    // tertangkap sebagai perintah baru (anti echo / anti memotong user).
    micSuspendRef.current?.();
  }, []);

  useEffect(() => {
    utteranceRef.current = handleUtterance;
  }, [handleUtterance]);

  useEffect(() => {
    micSuspendRef.current = voice.suspend;
  }, [voice.suspend]);

  // Rekaman untuk transkripsi lebih akurat
  const toggleRecord = async () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      mr.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rc = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg" });
      chunksRef.current = [];
      rc.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rc.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rc.mimeType });
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        announceLiveRegion("Mengirim audio untuk transkripsi");
        try {
          const res = await fetch("/api/chatbot/transcribe", { method: "POST", body: fd });
          const body = await res.json() as { ok: boolean; data?: { transcript: string }; error?: { message: string } };
          if (!res.ok || !body.ok || !body.data) throw new Error(body.error?.message ?? "Transkripsi gagal");
          await send(body.data.transcript);
        } catch (err) { announceLiveRegion(err instanceof Error ? err.message : "Gagal transcribe", { assertive: true }); }
      };
      mediaRecorderRef.current = rc;
      rc.start();
      setRecording(true);
      announceLiveRegion("Merekam untuk transkripsi akurat. Bicara sekarang.");
    } catch { announceLiveRegion("Izin mikrofon ditolak untuk rekaman suara", { assertive: true }); }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="rounded-16 border-2 border-primary bg-card p-4 shadow-card">
        <h1 className="flex items-center gap-2 text-h2 font-black"><Bot className="h-6 w-6 text-primary" aria-hidden="true" /> Chatbot Tunanetra</h1>
        <p className="mt-1 text-sm text-muted-foreground">Teman ngobrol suara khusus tunanetra — jawab singkat, bisa dibacakan otomatis, tidak mengarang data aksesibilitas.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setAutoSpeak((v) => !v)} aria-pressed={autoSpeak} className={`inline-flex h-11 items-center gap-2 rounded-12 border-2 px-4 text-sm font-bold ${autoSpeak ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
            {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {autoSpeak ? "Bacakan otomatis ON" : "Bacakan OFF"}
          </button>
          <Button variant="ghost" size="sm" onClick={() => { setHistory((h) => h.slice(0, 1)); audio.stop(); }}><Trash2 className="h-4 w-4" /> Bersihkan</Button>
          <SignLanguageToggle />
        </div>
      </header>

      <div ref={listRef} aria-label="Riwayat chat" role="log" aria-live="off" className="flex max-h-[52vh] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-16 border-2 border-border bg-muted/30 p-3 sm:max-h-[56vh]">
        {history.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] rounded-16 px-4 py-3 text-sm leading-relaxed shadow-card", m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start border-2 border-border bg-card")}>
            <p className="sr-only">{m.role === "user" ? "Anda:" : "Chatbot:"}</p>
            <p>{m.content}</p>
            {m.role === "assistant" ? <button type="button" onClick={() => audio.speak(m.content, AudioPriority.UserRequestedInformation)} aria-label="Bacakan pesan ini" className="mt-2 inline-flex h-8 items-center gap-1 rounded-8 border border-border bg-background px-2 text-xs font-bold hover:bg-muted"><Volume2 className="h-3 w-3" /> Dengarkan</button> : null}
          </div>
        ))}
        {loading ? <p className="self-start rounded-12 bg-card px-4 py-2 text-sm text-muted-foreground" aria-live="polite">Mengetik…</p> : null}
      </div>

      {sign.enabled ? (
        (() => {
          const last = [...history].reverse().find((m) => m.role === "assistant");
          return last ? <SignLanguagePanel title="Jawaban chatbot" text={last.content} /> : null;
        })()
      ) : null}

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2" aria-label="Kirim pesan ke chatbot">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ketik atau bicara..." aria-label="Pesan untuk chatbot" className="flex-1" />
        <Button type="submit" size="lg" disabled={!input.trim() || loading} aria-label="Kirim pesan" className="h-12 shrink-0"><Send className="h-5 w-5" /></Button>
      </form>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => (voice.status === "listening" ? voice.stop() : voice.start())} aria-pressed={voice.status === "listening"} className={`flex h-14 items-center justify-center gap-2 rounded-12 border-2 text-base font-black ${voice.status === "listening" ? "border-danger bg-danger text-white animate-pulse" : "border-border bg-card hover:bg-muted"}`}>
          {voice.status === "listening" ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />} {voice.status === "listening" ? "Berhenti" : "Bicara"}
        </button>
        <button type="button" onClick={() => void toggleRecord()} aria-label="Rekam suara untuk transkripsi lebih akurat" className={`flex h-14 items-center justify-center gap-2 rounded-12 border-2 text-base font-black ${recording ? "border-danger bg-danger text-white" : "border-primary bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground"}`}>
          <Mic className="h-5 w-5" /> {recording ? "Hentikan Rekaman" : "Rekam Suara"}
        </button>
      </div>
      {voice.interim ? <p className="rounded-10 bg-muted px-3 py-2 text-sm italic" aria-live="polite">{voice.interim}</p> : null}
      <p className="text-center text-xs text-muted-foreground">Semua suara bisa dihentikan dengan tombol Stop/Repeat di audio bar. Data aksesibilitas tetap jujur dari ANAPSI.</p>
    </div>
  );
}
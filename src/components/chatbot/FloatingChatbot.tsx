"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, X, Mic, Send, Volume2, Maximize2 } from "lucide-react";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { AudioPriority } from "@/types";

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const audio = useAudioManager();
  const voice = useSpeechRecognition();
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  if (pathname === "/map") return null;

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chatbot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t, history: msgs }) });
      const b = (await r.json()) as { ok: boolean; data?: { reply: string } };
      const reply = b.data?.reply ?? "Maaf, coba lagi.";
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
      audio.speak(reply, AudioPriority.UserRequestedInformation);
      try { if ("vibrate" in navigator) navigator.vibrate(40); } catch {}
    } catch { setMsgs((m) => [...m, { role: "assistant", content: "Gagal menghubungi asisten. Coba lagi." }]); } finally { setLoading(false); }
  };

  return (
    <>
      <button
        type="button"
        data-tour="chatbot"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup chatbot tunanetra" : "Buka chatbot tunanetra — teman ngobrol suara"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-float hover:bg-primary-hover focus-visible:outline-offset-2 md:bottom-6"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chatbot tunanetra mengambang"
          aria-modal="false"
          className="fixed bottom-36 right-4 z-50 flex h-[420px] w-[92vw] max-w-[360px] flex-col overflow-hidden rounded-16 border-2 border-border bg-card shadow-float md:bottom-6"
        >
          <div className="flex items-center justify-between border-b border-border bg-primary-soft px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-black text-primary"><Bot className="h-4 w-4" /> Chatbot Tunanetra</p>
            <div className="flex items-center gap-1">
              <Link href="/chatbot" aria-label="Buka halaman penuh chatbot" className="rounded-8 p-2 hover:bg-muted"><Maximize2 className="h-4 w-4" /></Link>
              <button type="button" aria-label="Tutup" onClick={() => setOpen(false)} className="rounded-8 p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div role="log" aria-live="polite" className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.length === 0 ? <p className="rounded-12 bg-muted px-3 py-2 text-sm text-muted-foreground">Halo! Tekan mikrofon lalu bicara, atau ketik. Saya jawab singkat dan bisa dibacakan.</p> : msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-12 px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "border border-border bg-card"}`}>{m.content}</div>
            ))}
            {loading ? <p className="text-xs text-muted-foreground">Mengetik…</p> : null}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-1 border-t border-border p-2">
            <button type="button" onClick={() => (voice.status === "listening" ? voice.stop() : voice.start())} aria-label={voice.status === "listening" ? "Hentikan" : "Bicara"} aria-pressed={voice.status === "listening"} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-12 border-2 ${voice.status === "listening" ? "border-danger bg-danger text-white animate-pulse" : "border-border bg-background"}`}>
              <Mic className="h-4 w-4" />
            </button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ketik..." aria-label="Pesan chatbot" className="h-11 min-w-0 flex-1 rounded-12 border border-input bg-background px-3 text-sm" />
            <button type="submit" disabled={!input.trim() || loading} aria-label="Kirim" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-12 bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
            <button type="button" onClick={() => { const last = [...msgs].reverse().find((m) => m.role === "assistant"); if (last) audio.speak(last.content, AudioPriority.UserRequestedInformation); }} aria-label="Ulangi jawaban terakhir" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-12 border border-border sm:flex"><Volume2 className="h-4 w-4" /></button>
          </form>
        </div>
      ) : null}
    </>
  );
}

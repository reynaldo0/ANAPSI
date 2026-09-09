"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MapPin, Mic, Sparkles, Volume2, FileText, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { announceLiveRegion } from "@/lib/announcement";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { useSpeechRecognition, type VoiceCopy } from "@/lib/voice/useSpeechRecognition";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { verificationLabel } from "@/lib/verification";
import type {
  AssistantAnswer,
  AssistantSource,
  AssistantSourceType,
} from "@/lib/ai/assistant";
import { AudioPriority } from "@/types";
import { cn } from "@/lib/cn";

const VOICE_COPY: VoiceCopy = {
  listening:
    "Mikrofon aktif. Tanyakan hal tentang aksesibilitas, misalnya: apakah sebuah tempat bisa diakses dengan kursi roda.",
  ended: "Pertanyaan selesai. Asisten sedang menjawab.",
  denied: "Akses mikrofon ditolak. Kamu tetap bisa menulis pertanyaan.",
  noSpeech: "Tidak ada suara terdeteksi. Coba lagi.",
  interim: (interimText) => `Mendengarkan. ${interimText}`,
};

const QUICK_QUESTIONS: string[] = [
  "Apakah Halte Transjakarta Rawamangun aksesibel untuk kursi roda?",
  "Apa hambatan utama menuju Stasiun LRT Velodrome?",
  "Di mana fasilitas yang memiliki ramp?",
];

interface AssistantResponse {
  ok: boolean;
  data: { answer: AssistantAnswer; disclaimer: string };
  error?: { code: string; message: string };
}

const RELIABILITY_TONE: Record<string, BadgeTone> = {
  VERIFIED: "success",
  COMMUNITY_REPORTED: "warning",
  UNKNOWN: "neutral",
};

function SourceSymbol({ type }: { type: AssistantSourceType }) {
  if (type === "report") return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
  if (type === "score") return <Crosshair className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />;
  if (type === "feature") return <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
  return <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

export function Assistant() {
  const { activeProfile } = useAccessibilityProfile();
  const audio = useAudioManager();
  const voice = useSpeechRecognition(VOICE_COPY);

  const [input, setInput] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledLengthRef = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const submit = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setQuestion(trimmed);
    setAnswer(null);
    setDisclaimer(null);
    announceLiveRegion("Asisten sedang menjawab.");
    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const body = (await response.json()) as AssistantResponse;
      if (!response.ok || !body.data) {
        const messageText = body.error?.message ?? "Asisten tidak dapat menjawab saat ini. Coba lagi.";
        setError(messageText);
        announceLiveRegion(messageText, { assertive: true });
        return;
      }
      setAnswer(body.data.answer);
      setDisclaimer(body.data.disclaimer);
      announceLiveRegion(body.data.answer.answerText, { assertive: true });
      if (activeProfile === "VISUAL_NAVIGATION") {
        audio.speak(body.data.answer.answerText, AudioPriority.UserRequestedInformation);
      }
      resultRef.current?.focus();
    } catch {
      setError("Asisten tidak dapat menjawab saat ini. Coba lagi.");
      announceLiveRegion("Gagal menghubungi asisten.", { assertive: true });
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim()) void submit(input);
  };

  const speakAnswer = () => {
    if (!answer) return;
    const text = [answer.answerText, ...answer.bullets].join(". ");
    audio.speak(text, AudioPriority.UserRequestedInformation);
  };

  useEffect(() => {
    if (!voice.finalTranscript) return;
    const transcript = voice.finalTranscript;
    const fresh = transcript.slice(handledLengthRef.current);
    handledLengthRef.current = transcript.length;
    const q = fresh.trim().toLowerCase();
    if (!q) return;
    if (q.includes("jangan") || q.includes("tidak") || q.includes("berhenti")) {
      voice.stop();
      return;
    }
    setInput(fresh.trim());
    void submit(fresh.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.finalTranscript]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-h2 font-black">
          <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
          Tanya Asisten
        </h1>
        <p className="mt-1 text-muted-foreground">
          Jawaban berasal dari data BLINDSPOT dan tidak mengarang kondisi aksesibilitas. Contoh pertanyaan:{" "}
          <em>&quot;Apakah tempat ini aksesibel untuk kursi roda?&quot;</em>
        </p>
      </header>

      <section aria-label="Tulis pertanyaan" className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            id="assistant-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tulis pertanyaanmu…"
            autoComplete="off"
            aria-describedby="assistant-help"
          />
          <p id="assistant-help" className="text-sm text-muted-foreground">
            Contoh: akses kursi roda, hambatan utama menuju lokasi, fasilitas dengan ramp.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" loading={loading} disabled={!input.trim()}>
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Tanya
            </Button>
            {voice.supported ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                aria-pressed={voice.status === "listening"}
                onClick={() => (voice.status === "listening" ? voice.stop() : voice.start())}
              >
                <Mic className={cn("h-5 w-5", voice.status === "listening" && "text-danger")} aria-hidden="true" />
                {voice.status === "listening" ? "Hentikan rekaman" : "Tanya dengan suara"}
              </Button>
            ) : null}
          </div>
          {!voice.supported ? (
            <p className="rounded-10 bg-muted px-3 py-2 text-sm text-muted-foreground">
              Perintah suara tidak didukung di perangkat ini. Kamu tetap bisa menulis, atau tulis laporan sebagai
              alternatif: <Link href="/report" className="font-medium text-primary underline-offset-2 hover:underline">Laporkan hambatan</Link>.
            </p>
          ) : null}
          {voice.interim ? <p className="text-sm text-muted-foreground">{voice.interim}</p> : null}
        </form>

        <div className="mt-4">
          <p className="text-sm font-medium">Pertanyaan cepat</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((questionText) => (
              <button
                key={questionText}
                type="button"
                onClick={() => void submit(questionText)}
                disabled={loading}
                className="rounded-10 border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {questionText}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Asisten sedang menjawab…" /> : null}

      {error ? (
        <ErrorState
          title="Asisten belum bisa menjawab"
          description={error}
          action={
            <button
              type="button"
              onClick={() => setError(null)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-12 border border-border bg-background px-5 font-medium text-foreground hover:bg-muted"
            >
              Coba lagi
            </button>
          }
        />
      ) : null}

      {question && answer ? (
        <section
          ref={resultRef}
          tabIndex={-1}
          aria-label="Jawaban asisten"
          className="space-y-4 focus:outline-none"
        >
          <div className="rounded-20 border-2 border-border bg-card p-5 shadow-card">
            <p className="text-sm font-medium text-muted-foreground">
              <span aria-hidden="true" className="me-1">❝</span>
              {question}
            </p>
            <div className="mt-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold leading-snug">{answer.answerText}</p>
                <Button variant="ghost" size="sm" onClick={speakAnswer} aria-label="Dengarkan jawaban">
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  Dengarkan
                </Button>
              </div>
              {answer.bullets.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {answer.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {answer.sources.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-semibold">Sumber</p>
                <ul className="mt-2 space-y-1.5">
                  {answer.sources.map((source) => (
                    <SourceRow key={`${source.type}-${source.title}`} source={source} />
                  ))}
                </ul>
              </div>
            ) : null}

            {answer.followUps.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {answer.followUps.map((followUp) => (
                  <button
                    key={followUp.query}
                    type="button"
                    onClick={() => void submit(followUp.query)}
                    className="rounded-10 border border-primary/50 bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {followUp.label}
                    <span className="ml-1" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            ) : null}

            {disclaimer ? (
              <p className="mt-4 rounded-10 bg-muted px-3 py-2 text-xs text-muted-foreground">{disclaimer}</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SourceRow({ source }: { source: AssistantSource }) {
  const tone = RELIABILITY_TONE[source.reliability] ?? "neutral";
  const inner = (
    <li className="flex items-start gap-2 text-sm">
      <SourceSymbol type={source.type} />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{source.title}</span>
        <span className="block text-muted-foreground">{source.detail}</span>
      </span>
      <Badge tone={tone}>{verificationLabel(source.reliability)}</Badge>
    </li>
  );
  return source.href ? (
    <Link href={source.href} className="block rounded-10 hover:bg-muted" aria-label={`Buka ${source.title}`}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
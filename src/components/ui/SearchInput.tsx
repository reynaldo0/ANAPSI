"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Search, X, CornerDownLeft, Loader2 } from "lucide-react";
import type { GeoSuggestion } from "@/types";
import type { LatLng } from "@/lib/geo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface SearchInputProps {
  onSearch: (query: string) => void;
  label?: string;
  placeholder?: string;
  initialQuery?: string;
  className?: string;
  showSubmitButton?: boolean;
  /** Saat disediakan, pencarian menampilkan saran/autocomplete seperti Google Maps. */
  onSuggest?: (query: string, origin: LatLng | null) => Promise<{ suggestions: GeoSuggestion[] }>;
  suggestOrigin?: LatLng | null;
  onPickSuggestion?: (suggestion: GeoSuggestion) => void;
}

export function SearchInput({
  onSearch,
  label = "Cari tempat atau alamat",
  placeholder = "Cari tempat atau alamat…",
  initialQuery = "",
  className,
  showSubmitButton = true,
  onSuggest,
  suggestOrigin = null,
  onPickSuggestion,
}: SearchInputProps) {
  const id = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"recs" | "suggest">("recs");
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const runSuggest = async (raw: string) => {
    if (!onSuggest) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoadingSuggest(true);
    setActiveIndex(-1);
    timerRef.current = setTimeout(async () => {
      try {
        const trimmed = raw.trim();
        const body = await onSuggest(trimmed, suggestOrigin);
        setSuggestions(body.suggestions);
        setMode(trimmed.length === 0 ? "recs" : "suggest");
        setOpen(true);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoadingSuggest(false);
      }
    }, 180);
  };

  const handleChange = (raw: string) => {
    setValue(raw);
    void runSuggest(raw);
  };

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const pick = (s: GeoSuggestion) => {
    setValue(s.name);
    close();
    onPickSuggestion?.(s);
  };

  const submit = () => {
    close();
    onSearch(value.trim());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && suggestions.length > 0) setOpen(true);
      if (suggestions.length > 0) setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length > 0) setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        pick(suggestions[activeIndex]);
      } else {
        submit();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    // Mundur pendek agar klik pada item saran sempat terekam sebelum dropdown ditutup.
    setTimeout(() => setOpen(false), 160);
  };

  const resultText =
    mode === "recs" ? "Rekomendasi di sekitarmu" : `Saran untuk "${value.trim()}"`;

  return (
    <div role="search" className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <input
            ref={inputRef}
            id={id}
            type="search"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
              else void runSuggest(value);
            }}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete="off"
            className="h-12 w-full rounded-14 border-2 border-border bg-background pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {value ? (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => {
                setValue("");
                setSuggestions([]);
                setOpen(false);
                onSearch("");
              }}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-8 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {showSubmitButton ? (
          <div className="hidden shrink-0 md:block">
            <Button
              type="button"
              size="sm"
              onClick={submit}
              className="h-12 rounded-14 px-4"
              aria-label="Cari tempat"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Cari
            </Button>
          </div>
        ) : null}
      </div>

      {onSuggest && open && suggestions.length > 0 ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={resultText}
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-16 border border-border bg-card shadow-float"
        >
          <p className="label-uppercase border-b border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
            {resultText}
          </p>
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {suggestions.map((s, index) => (
              <li key={s.id}>
                <button
                  type="button"
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(s);
                  }}
                  onFocus={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-12 px-3 py-2.5 text-left transition-colors",
                    activeIndex === index ? "bg-primary-soft" : "hover:bg-muted",
                  )}
                >
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-10 bg-background text-lg">
                    {s.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.subtitle}</span>
                  </span>
                  {s.place ? (
                    <span className="shrink-0 rounded-full border-2 border-primary/30 bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                      tempat terverifikasi
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {value.trim() ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    submit();
                  }}
                  onFocus={() => setActiveIndex(-1)}
                  className="flex w-full items-center gap-3 rounded-12 px-3 py-2.5 text-left text-sm font-bold text-primary transition-colors hover:bg-primary-soft"
                >
                  <CornerDownLeft className="h-4 w-4 text-primary" aria-hidden="true" />
                  Cari &apos;{value.trim()}&apos;
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {onSuggest && open && loadingSuggest && suggestions.length === 0 ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Menunggu saran"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 flex items-center gap-2 rounded-16 border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-float"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Mencari saran…
        </div>
      ) : null}
    </div>
  );
}
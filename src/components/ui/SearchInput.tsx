"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchInputProps {
  onSearch: (query: string) => void;
  label?: string;
  placeholder?: string;
  initialQuery?: string;
  className?: string;
}

export function SearchInput({
  onSearch,
  label = "Cari tempat atau alamat",
  placeholder = "Cari tempat atau alamat…",
  initialQuery = "",
  className,
}: SearchInputProps) {
  const id = useId();
  const [value, setValue] = useState(initialQuery);

  const submit = () => onSearch(value.trim());

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div role="search" className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
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
            onSearch("");
          }}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-8 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
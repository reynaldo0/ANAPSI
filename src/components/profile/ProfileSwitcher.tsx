"use client";

import { useId } from "react";
import { ONBOARDING_CHOICES, type UserType } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface ProfileSwitcherProps {
  /** Pilihan aktif (UserType). null = belum memilih. */
  value: UserType | null;
  onChange: (value: UserType) => void;
  legend: string;
}

export function ProfileSwitcher({ value, onChange, legend }: ProfileSwitcherProps) {
  const groupId = useId();

  return (
    <fieldset>
      <legend className="mb-4 text-lg font-black text-foreground">{legend}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ONBOARDING_CHOICES.map((profile) => {
          const selected = value === profile.value;
          const inputId = `${groupId}-${profile.value}`;
          return (
            <div key={profile.value}>
              <input
                type="radio"
                name={groupId}
                id={inputId}
                value={profile.value}
                checked={selected}
                onChange={() => onChange(profile.value)}
                className="sr-only"
              />
              <label
                htmlFor={inputId}
                className={cn(
                  "block cursor-pointer rounded-24 border-2 p-5 transition-all duration-200 focus-within:outline focus-within:outline-offset-2 card-elevated",
                  selected
                    ? "border-primary bg-primary-soft/70 shadow-card"
                    : "border-border hover:-translate-y-0.5 hover:shadow-card",
                )}
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-14 bg-primary-soft text-primary">
                    <profile.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-h3 font-black">{profile.label}</span>
                    <span className="text-sm font-bold text-primary">{profile.tagline}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {selected ? "✓" : ""}
                  </span>
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-muted-foreground">
                  {profile.description}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
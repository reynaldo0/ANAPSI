"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { announceLiveRegion } from "@/lib/announcement";
import { useAuth } from "@/lib/state/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface FieldErrors {
  [field: string]: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { login, error } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Format email tidak valid.";
    if (!password) errors.password = "Kata sandi wajib diisi.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const success = await login(email.trim(), password);
    if (!success) {
      setSubmitting(false);
      return;
    }

    toast({ tone: "success", title: "Berhasil masuk", message: "Selamat datang kembali!" });
    announceLiveRegion("Kamu berhasil masuk.", { assertive: true });

    // Tentukan tujuan redirect:
    // - kalau ada returnTo yang valid → pakai itu
    // - kalau userType sudah dipilih sebelumnya → langsung ke /profile
    // - kalau belum pernah pilih profil → ke /onboarding dulu
    const hasProfile =
      typeof window !== "undefined" &&
      !!localStorage.getItem("anapsi:userType");

    const defaultDest = hasProfile ? "/profile" : "/onboarding";
    const safeReturnTo =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : defaultDest;

    window.location.replace(safeReturnTo);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <BrandLogo size={44} withWordmark wordmarkClassName="text-2xl text-primary" />
      </div>
      <h1 className="text-center text-h1 font-black">Masuk</h1>
      <p className="mt-2 text-center text-muted-foreground">
        Masuk untuk mengakses profil, tempat favorit, dan riwayat laporanmu.
      </p>

      {error ? (
        <p className="mt-4 rounded-14 border-2 border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <form className="mt-6 space-y-4 rounded-20 border-2 border-border bg-card p-5 shadow-card" onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          label="Kata sandi"
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/register" className="font-bold text-primary underline underline-offset-2 hover:text-primary-hover">
          Daftar
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
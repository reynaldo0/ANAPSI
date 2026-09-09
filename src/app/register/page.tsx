"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { announceLiveRegion } from "@/lib/announcement";
import { useAuth } from "@/lib/state/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface FieldErrors {
  [field: string]: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, error } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (displayName.trim().length < 2) errors.displayName = "Nama minimal 2 karakter.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Format email tidak valid.";
    if (password.length < 8) errors.password = "Kata sandi minimal 8 karakter.";
    if (confirm !== password) errors.confirm = "Kata sandi tidak sama.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const success = await register({ displayName: displayName.trim(), email: email.trim(), password });
    setSubmitting(false);
    if (!success) return;

    announceLiveRegion("Akun berhasil dibuat. Siapkan profil aksesibilitasmu.", {
      assertive: true,
    });
    toast({
      tone: "success",
      title: "Akun berhasil dibuat",
      message: "Sekarang pilih profil aksesibilitasmu.",
    });
    router.replace("/onboarding");
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-h1 font-black">Daftar</h1>
      <p className="mt-2 text-muted-foreground">
        Buat akun untuk menyimpan profil aksesibilitas dan tempat favoritmu.
      </p>

      {error ? (
        <p className="mt-4 rounded-14 border-2 border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <form className="mt-6 space-y-4 rounded-20 border-2 border-border bg-card p-5 shadow-card" onSubmit={handleSubmit} noValidate>
        <Input
          label="Nama"
          required
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={fieldErrors.displayName}
        />
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
          autoComplete="new-password"
          hint="Minimal 8 karakter."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Input
          label="Ulangi kata sandi"
          required
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Buat akun
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-bold text-primary underline underline-offset-2 hover:text-primary-hover">
          Masuk
        </Link>
      </p>
    </div>
  );
}
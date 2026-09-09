import type { ReactNode } from "react";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
  children?: ReactNode;
}

export function PlaceholderPage({ title, phase, description, children }: PlaceholderPageProps) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      <div className="rounded-16 border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
        <Construction className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 font-medium">{phase}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Halaman ini masih berupa kerangka (belum berfungsi) dan ditampilkan agar navigasi dasar
          dapat dicoba. Fungsionalitas lengkap dibangun pada fase yang tertera di atas.
        </p>
      </div>
      {children ? <div>{children}</div> : null}
    </section>
  );
}

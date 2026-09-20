import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface BrandLogoProps {
  /** Ukuran logo (px). */
  size?: number;
  /** Tampilkan nama aplikasi di samping logo. */
  withWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}

/** Logo merek ANAPSI yang dipakai konsisten di seluruh aplikasi. */
export function BrandLogo({ size = 36, withWordmark = false, wordmarkClassName, className }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-12 bg-card shadow-card"
        style={{ width: size, height: size }}
      >
        <img src="/logo.png" alt="" style={{ width: size, height: size }} className="object-contain" />
      </span>
      {withWordmark ? (
        <span className={cn("font-black leading-none tracking-tighter", wordmarkClassName)}>
          <span className="sr-only">{APP_NAME}</span>
          <span aria-hidden="true">
            {APP_NAME}
            <span className="text-grad">.</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
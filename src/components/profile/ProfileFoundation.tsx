"use client";

import { AudioControl } from "@/components/ui/AudioControl";
import { Card } from "@/components/ui/Card";

export function ProfileFoundation() {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Audio suara (fondasi)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Kontrol audio bawaan untuk panduan suara. Tidak menggantikan pembaca layar seperti
        TalkBack/VoiceOver — keduanya dapat berjalan bersamaan.
      </p>
      <AudioControl className="mt-4" />
    </Card>
  );
}

'use client';

import { Suspense } from 'react';
import { SettingsShell } from '@/components/settings/settings-shell';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center font-mono text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SettingsShell />
      </div>
    </Suspense>
  );
}

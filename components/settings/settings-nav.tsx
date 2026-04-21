'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'printer', label: 'Printer' },
  { id: 'macros', label: 'Macros' },
  { id: 'machine', label: 'Machine' },
  { id: 'docs', label: 'Docs' },
] as const;

export type SettingsTabId = (typeof TABS)[number]['id'];

export function isSettingsTabId(v: string | null): v is SettingsTabId {
  return TABS.some((t) => t.id === v);
}

export function SettingsNav({ active }: { active: SettingsTabId }) {
  return (
    <nav className="flex flex-col gap-0.5 border-r-2 border-border bg-card/40 p-2 w-[220px] shrink-0">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={`/settings?tab=${t.id}`}
          className={cn(
            'px-2 py-1.5 text-xs font-bold uppercase tracking-wide border-2 transition-colors rounded-none',
            active === t.id
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

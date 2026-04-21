'use client';

import { ExternalLink } from 'lucide-react';

const KLIPPER_DOCS = [
  { title: 'G-Codes', href: 'https://www.klipper3d.org/G-Codes.html' },
  { title: 'Command Reference', href: 'https://www.klipper3d.org/Command_Reference.html' },
  { title: 'Status Reference', href: 'https://www.klipper3d.org/Status_Reference.html' },
  { title: 'Config Reference', href: 'https://www.klipper3d.org/Config_Reference.html' },
  { title: 'Macros', href: 'https://www.klipper3d.org/Command_Templates.html' },
] as const;

export function SettingsDocs() {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-mono text-muted-foreground">
        Official Klipper docs (source of truth for behavior on your printer).
      </p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {KLIPPER_DOCS.map((doc) => (
          <li key={doc.href}>
            <a
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border-2 border-border px-2 py-1.5 text-xs font-bold uppercase tracking-wide hover:border-primary/60 bg-black/20"
            >
              <ExternalLink size={14} className="text-primary shrink-0" />
              {doc.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

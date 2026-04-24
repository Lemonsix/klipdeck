'use client';

import { useMemo } from 'react';
import {
  FORM_MANAGED_SECTION_HEADERS,
  type FormManagedSectionHeader,
  upsertFormManagedSection,
  getFormManagedSectionMap,
} from '@/lib/klipper/printer-cfg-merge';
import { resolveLintRule } from '@/lib/klipper/lint-klipper-config';
import { getKlipperEnumOptions } from '@/lib/klipper/config-field-enums';
import { Input } from '@/components/ui/input';
import { KlipperEnumOrTextField } from '@/components/settings/klipper-enum-field';

function humanKey(key: string): string {
  return key.replace(/_/g, ' ');
}

function orderedFormKeys(header: FormManagedSectionHeader): string[] {
  const rule = resolveLintRule(header);
  if (!rule) return [];
  const req = rule.required ?? [];
  const rest = rule.allowed.filter((k) => !req.includes(k));
  return [...req, ...rest];
}

function SectionFields({
  header,
  draftPrinterCfg,
  onChange,
}: {
  header: FormManagedSectionHeader;
  draftPrinterCfg: string;
  onChange: (next: string) => void;
}) {
  const keys = useMemo(() => orderedFormKeys(header), [header]);
  const map = useMemo(() => getFormManagedSectionMap(draftPrinterCfg, header), [draftPrinterCfg, header]);

  const setField = (key: string, value: string) => {
    onChange(upsertFormManagedSection(draftPrinterCfg, header, { [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 gap-x-2 gap-y-1 sm:grid-cols-6">
      {keys.map((key) => (
        <div key={key} className="min-w-0 flex flex-col gap-px">
          <label
            className="text-[8px] font-bold uppercase leading-tight tracking-wide text-muted-foreground truncate"
            title={key}
          >
            {humanKey(key)}
          </label>
          {getKlipperEnumOptions(header, key) ? (
            <KlipperEnumOrTextField
              header={header}
              fieldKey={key}
              value={map.get(key) ?? ''}
              onChange={(v) => setField(key, v)}
            />
          ) : (
            <Input
              className="h-7 rounded-none border-border bg-black/40 px-1.5 font-mono text-[10px] leading-none"
              value={map.get(key) ?? ''}
              onChange={(e) => setField(key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function SettingsPrinterForms(props: {
  draftPrinterCfg: string;
  setDraftPrinterCfg: (v: string) => void;
  loading: boolean;
}) {
  const { draftPrinterCfg, setDraftPrinterCfg, loading } = props;

  return (
    <div className="flex flex-col gap-1.5 pb-1">
      {loading && (
        <p className="text-[10px] font-mono text-muted-foreground">Loading printer.cfg / macros.cfg…</p>
      )}

      <div className="flex flex-col gap-1.5">
        {FORM_MANAGED_SECTION_HEADERS.map((header) => (
          <section
            key={header}
            className="border-2 border-border bg-card/30 px-2 py-1.5"
          >
            <h2 className="mb-1 border-b border-border/60 pb-1 text-[10px] font-black uppercase tracking-wider text-foreground">
              [{header}]
            </h2>
            <SectionFields header={header} draftPrinterCfg={draftPrinterCfg} onChange={setDraftPrinterCfg} />
          </section>
        ))}
      </div>
    </div>
  );
}

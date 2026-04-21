'use client';

import { Input } from '@/components/ui/input';
import { getKlipperEnumOptions } from '@/lib/klipper/config-field-enums';
import type { FormManagedSectionHeader } from '@/lib/klipper/printer-cfg-merge';

const selectClassName =
  'flex h-7 w-full min-w-0 border-2 border-border bg-black/40 px-1.5 py-0 font-mono text-[10px] leading-none text-foreground shadow-none rounded-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function KlipperEnumOrTextField({
  header,
  fieldKey,
  value,
  onChange,
}: {
  header: FormManagedSectionHeader;
  fieldKey: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const options = getKlipperEnumOptions(header, fieldKey);

  if (!options?.length) {
    return (
      <Input
        className="h-7 rounded-none border-border bg-black/40 px-1.5 font-mono text-[10px] leading-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const k = fieldKey.toLowerCase();

  if (k === 'sensor_type') {
    const listId = `klipper-sensor-type-${header}`;
    return (
      <>
        <Input
          className="h-7 rounded-none border-border bg-black/40 px-1.5 font-mono text-[10px] leading-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          list={listId}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </>
    );
  }

  const inList = options.includes(value);
  const selectVal = value === '' ? '' : inList ? value : value;

  return (
    <select
      className={selectClassName}
      value={selectVal}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {!inList && value ? <option value={value}>{value}</option> : null}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

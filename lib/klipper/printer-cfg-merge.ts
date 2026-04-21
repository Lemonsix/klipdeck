/**
 * Split / merge Klipper printer.cfg by top-level [section] blocks.
 * [gcode_macro ...] blocks are opaque (full raw preserved) so macro editors stay consistent.
 */

const SECTION_HEADER = /^\[([^\]]+)\]\s*$/;

export interface RawSectionBlock {
  /** Inner header text, e.g. "printer" or "gcode_macro HOME" */
  header: string;
  /** Full block text including the [header] line, trailing newline normalized to single \n */
  raw: string;
  isGcodeMacro: boolean;
}

export function isGcodeMacroHeader(header: string): boolean {
  return header.trim().toLowerCase().startsWith('gcode_macro');
}

/** Section headers edited via structured forms (not macros). */
export const FORM_MANAGED_SECTION_HEADERS = [
  'printer',
  'mcu',
  'stepper_x',
  'stepper_y',
  'stepper_z',
  'extruder',
  'heater_bed',
] as const;

export type FormManagedSectionHeader = (typeof FORM_MANAGED_SECTION_HEADERS)[number];

export function isFormManagedSection(header: string): header is FormManagedSectionHeader {
  const h = header.trim();
  return (FORM_MANAGED_SECTION_HEADERS as readonly string[]).includes(h);
}

/**
 * Parse `key: value` lines inside a simple section body (excluding the `[header]` line).
 * Continuation lines (leading whitespace before content) append to the previous key.
 */
export function parseSimpleSectionBody(bodyWithoutHeader: string): Map<string, string> {
  const lines = bodyWithoutHeader.split(/\r?\n/);
  const map = new Map<string, string>();
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (kv?.[1]) {
      currentKey = kv[1].toLowerCase();
      map.set(currentKey, kv[2] ?? '');
      continue;
    }

    if (/^\s/.test(line) && currentKey) {
      const prev = map.get(currentKey) ?? '';
      map.set(currentKey, prev ? `${prev}\n${line.trimEnd()}` : line.trimEnd());
    }
  }

  return map;
}

function serializeSimpleSection(header: string, keysOrdered: string[], map: Map<string, string>): string {
  const lines = [`[${header}]`];
  for (const key of keysOrdered) {
    const v = map.get(key);
    if (v === undefined || v === '') continue;
    if (v.includes('\n')) {
      lines.push(`${key}:`);
      for (const sub of v.split('\n')) {
        lines.push(`  ${sub}`);
      }
    } else {
      lines.push(`${key}: ${v}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function splitPrinterCfg(source: string): { preamble: string; blocks: RawSectionBlock[] } {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const preambleLines: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t.length === 0 && preambleLines.length === 0) {
      i += 1;
      continue;
    }
    if (SECTION_HEADER.test(t)) break;
    preambleLines.push(lines[i]);
    i += 1;
  }

  const blocks: RawSectionBlock[] = [];
  while (i < lines.length) {
    const t = lines[i].trim();
    const m = t.match(SECTION_HEADER);
    if (!m?.[1]) {
      i += 1;
      continue;
    }
    const header = m[1].trim();
    const start = i;
    i += 1;
    while (i < lines.length) {
      const nt = lines[i].trim();
      if (SECTION_HEADER.test(nt)) break;
      i += 1;
    }
    const raw = lines.slice(start, i).join('\n') + '\n';
    blocks.push({
      header,
      raw,
      isGcodeMacro: isGcodeMacroHeader(header),
    });
  }

  const preamble =
    preambleLines.length > 0 ? `${preambleLines.join('\n').replace(/\n+$/, '')}\n\n` : '';

  return { preamble, blocks };
}

export function joinPrinterCfg(preamble: string, blocks: RawSectionBlock[]): string {
  const body = blocks.map((b) => b.raw.trimEnd()).join('\n\n');
  const pre = preamble.replace(/\n+$/, '');
  if (!pre) return `${body}\n`;
  return `${pre}\n\n${body}\n`;
}

function orderedKeysInSection(map: Map<string, string>, priorOrder: string[]): string[] {
  const out: string[] = [];
  for (const k of priorOrder) {
    if (map.has(k)) out.push(k);
  }
  for (const k of map.keys()) {
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

/**
 * Replace a form-managed section's key-value body; preserves unknown keys inside that section.
 * Appends a new block at end if the section is missing.
 */
export function upsertFormManagedSection(
  source: string,
  header: FormManagedSectionHeader,
  updates: Record<string, string | undefined>
): string {
  const { preamble, blocks } = splitPrinterCfg(source);
  const idx = blocks.findIndex((b) => b.header.trim() === header && !b.isGcodeMacro);

  const bodyLines =
    idx >= 0
      ? blocks[idx].raw.split('\n').slice(1).join('\n')
      : '';
  const existingMap = parseSimpleSectionBody(bodyLines);
  const priorOrder = [...existingMap.keys()];

  for (const [k, v] of Object.entries(updates)) {
    const key = k.toLowerCase();
    if (v === undefined || v === '') {
      existingMap.delete(key);
    } else {
      existingMap.set(key, v);
    }
  }

  const finalOrder = orderedKeysInSection(existingMap, priorOrder);
  const newRaw = serializeSimpleSection(header, finalOrder, existingMap);

  const nextBlocks = [...blocks];
  if (idx >= 0) {
    nextBlocks[idx] = {
      header,
      raw: newRaw,
      isGcodeMacro: false,
    };
  } else {
    nextBlocks.push({
      header,
      raw: newRaw,
      isGcodeMacro: false,
    });
  }

  return joinPrinterCfg(preamble, nextBlocks);
}

/** Extract current key-value map for a form-managed section (empty map if missing). */
export function getFormManagedSectionMap(
  source: string,
  header: FormManagedSectionHeader
): Map<string, string> {
  const { blocks } = splitPrinterCfg(source);
  const block = blocks.find((b) => b.header.trim() === header && !b.isGcodeMacro);
  if (!block) return new Map();
  const bodyLines = block.raw.split('\n').slice(1).join('\n');
  return parseSimpleSectionBody(bodyLines);
}

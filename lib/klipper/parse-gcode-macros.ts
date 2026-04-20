export interface ParsedGcodeMacro {
  name: string;
  lineNumber: number;
}

export interface ParsedGcodeMacroBlock {
  name: string;
  lineNumber: number;
  startLine: number;
  endLine: number;
  description: string;
  gcode: string;
}

const SECTION_HEADER = /^\s*\[([^\]]+)\]\s*$/;
const MACRO_HEADER = /^\s*\[gcode_macro\s+([^\]\s]+)\s*\]\s*$/i;
const KEY_VALUE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/;

function normalizeGcodeLines(lines: string[]): string {
  return lines
    .map((line) => line.replace(/^\s{2}/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

export function parseGcodeMacros(source: string): ParsedGcodeMacro[] {
  return parseGcodeMacroBlocks(source).map((m) => ({
    name: m.name,
    lineNumber: m.lineNumber,
  }));
}

export function parseGcodeMacroBlocks(source: string): ParsedGcodeMacroBlock[] {
  const lines = source.split(/\r?\n/);
  const out: ParsedGcodeMacroBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(MACRO_HEADER);
    if (!match?.[1]) continue;

    const name = match[1];
    const startIdx = i;
    let endIdx = lines.length - 1;

    for (let j = i + 1; j < lines.length; j++) {
      if (SECTION_HEADER.test(lines[j])) {
        endIdx = j - 1;
        break;
      }
    }

    let description = '';
    let gcodeLine = -1;

    for (let j = startIdx + 1; j <= endIdx; j++) {
      const kv = lines[j].match(KEY_VALUE);
      if (!kv) continue;
      const key = kv[1].toLowerCase();
      if (key === 'description') {
        description = kv[2] ?? '';
      } else if (key === 'gcode') {
        gcodeLine = j;
      }
    }

    const gcodeLines: string[] = [];
    if (gcodeLine !== -1) {
      for (let j = gcodeLine + 1; j <= endIdx; j++) {
        const line = lines[j];
        if (KEY_VALUE.test(line) && !/^\s/.test(line)) break;
        if (SECTION_HEADER.test(line)) break;
        if (/^\s/.test(line) || line.trim() === '') {
          gcodeLines.push(line);
          continue;
        }
        break;
      }
    }

    out.push({
      name,
      lineNumber: startIdx + 1,
      startLine: startIdx + 1,
      endLine: endIdx + 1,
      description,
      gcode: normalizeGcodeLines(gcodeLines),
    });

    i = endIdx;
  }

  return out;
}

function buildMacroText(name: string, description: string, gcode: string): string {
  const safeName = name.trim();
  const bodyLines = gcode
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  const descriptionLine = description.trim()
    ? `description: ${description.trim()}\n`
    : '';

  return `[gcode_macro ${safeName}]\n${descriptionLine}gcode:\n${bodyLines}\n`;
}

export function upsertGcodeMacroBlock(
  source: string,
  originalName: string | null,
  macro: { name: string; description: string; gcode: string }
): string {
  const lines = source.split(/\r?\n/);
  const blocks = parseGcodeMacroBlocks(source);
  const target =
    originalName == null
      ? null
      : blocks.find((b) => b.name.toLowerCase() === originalName.toLowerCase()) ?? null;

  const nextBlock = buildMacroText(macro.name, macro.description, macro.gcode).split('\n');
  if (nextBlock[nextBlock.length - 1] === '') nextBlock.pop();

  if (!target) {
    const out = source.trimEnd();
    return `${out}${out.length > 0 ? '\n\n' : ''}${buildMacroText(
      macro.name,
      macro.description,
      macro.gcode
    )}`;
  }

  const start = target.startLine - 1;
  const end = target.endLine - 1;
  const merged = [...lines.slice(0, start), ...nextBlock, ...lines.slice(end + 1)];
  return `${merged.join('\n').replace(/\n+$/, '\n')}`;
}

export function removeGcodeMacroBlock(source: string, name: string): string {
  const blocks = parseGcodeMacroBlocks(source);
  const target = blocks.find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (!target) return source;

  const lines = source.split(/\r?\n/);
  const start = target.startLine - 1;
  const end = target.endLine - 1;
  const merged = [...lines.slice(0, start), ...lines.slice(end + 1)];
  return merged.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

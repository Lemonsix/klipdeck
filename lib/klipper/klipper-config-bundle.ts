/**
 * Split Klipper config into `printer.cfg` (hardware + `[include macros.cfg]`)
 * and `macros.cfg` (`[gcode_macro …]` only), for Moonraker config folder layout.
 */
import { splitPrinterCfg, joinPrinterCfg, type RawSectionBlock } from '@/lib/klipper/printer-cfg-merge';

export const MACROS_CFG_RELATIVE_PATH = 'macros.cfg';

export function isIncludeMacrosBlock(block: RawSectionBlock): boolean {
  const h = block.header.trim().toLowerCase();
  return h === 'include macros.cfg' || h === 'include ./macros.cfg';
}

export function includeMacrosBlock(): RawSectionBlock {
  const raw = `[include ${MACROS_CFG_RELATIVE_PATH}]\n`;
  return {
    header: `include ${MACROS_CFG_RELATIVE_PATH}`,
    raw,
    isGcodeMacro: false,
  };
}

/**
 * Build `printer.cfg` + `macros.cfg` from remote `printer.cfg` and optional remote `macros.cfg`.
 * - Strips inline `[gcode_macro …]` from printer (they live in `macros.cfg`).
 * - Ensures a single `[include macros.cfg]` at end of printer blocks.
 * - If remote macros exist, they win; otherwise inline macros from printer are moved to `macros.cfg`.
 */
export function partitionPrinterAndMacros(
  printerSource: string,
  remoteMacros: string | null,
  emptyMacrosFallback: string
): { printerCfg: string; macrosCfg: string } {
  const { preamble, blocks } = splitPrinterCfg(printerSource);
  const macroFromPrinter = blocks.filter((b) => b.isGcodeMacro);
  const rest = blocks.filter((b) => !b.isGcodeMacro && !isIncludeMacrosBlock(b));

  const useRemote = typeof remoteMacros === 'string' && remoteMacros.trim().length > 0;

  let macrosCfg: string;
  if (useRemote) {
    macrosCfg = remoteMacros!.replace(/\r\n/g, '\n').trimEnd() + '\n';
  } else if (macroFromPrinter.length > 0) {
    macrosCfg = macroFromPrinter.map((b) => b.raw.trimEnd()).join('\n\n') + '\n';
  } else {
    macrosCfg = emptyMacrosFallback.trimEnd().endsWith('\n')
      ? emptyMacrosFallback
      : `${emptyMacrosFallback.trimEnd()}\n`;
  }

  const withInclude = [...rest];
  if (!withInclude.some((b) => isIncludeMacrosBlock(b))) {
    withInclude.push(includeMacrosBlock());
  }

  const printerCfg = joinPrinterCfg(preamble, withInclude);
  return { printerCfg, macrosCfg };
}

/** Single virtual file for KlipDeck lint (include omitted; macros appended). */
export function mergeVirtualKlipperConfig(printerCfg: string, macrosCfg: string): string {
  const { preamble, blocks } = splitPrinterCfg(printerCfg);
  const printerBlocks = blocks.filter((b) => !isIncludeMacrosBlock(b));
  const { blocks: macroBlocks } = splitPrinterCfg(macrosCfg);
  const onlyMacros = macroBlocks.filter((b) => b.isGcodeMacro);
  return joinPrinterCfg(preamble, [...printerBlocks, ...onlyMacros]);
}

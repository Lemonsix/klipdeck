'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  parseGcodeMacroBlocks,
  removeGcodeMacroBlock,
  upsertGcodeMacroBlock,
} from '@/lib/klipper/parse-gcode-macros';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface MacrosPanelProps {
  configText: string;
  onConfigChange: (next: string) => void;
}

export function MacrosPanel({ configText, onConfigChange }: MacrosPanelProps) {
  const macros = useMemo(() => parseGcodeMacroBlocks(configText), [configText]);
  const [selected, setSelected] = useState<string | null>(null);
  const activeName = selected ?? macros[0]?.name ?? null;
  const active = macros.find((m) => m.name === activeName) ?? null;

  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [gcodeDraft, setGcodeDraft] = useState('');

  const syncDraftFromActive = (name: string | null) => {
    const m = macros.find((x) => x.name === name) ?? null;
    if (!m) {
      setNameDraft('');
      setDescriptionDraft('');
      setGcodeDraft('');
      return;
    }
    setNameDraft(m.name);
    setDescriptionDraft(m.description);
    setGcodeDraft(m.gcode);
  };

  const selectMacro = (name: string) => {
    setSelected(name);
    syncDraftFromActive(name);
  };

  const addMacro = () => {
    const nextNameBase = 'NEW_MACRO';
    let nextName = nextNameBase;
    let idx = 1;
    const names = new Set(macros.map((m) => m.name.toLowerCase()));
    while (names.has(nextName.toLowerCase())) {
      idx += 1;
      nextName = `${nextNameBase}_${idx}`;
    }

    const nextConfig = upsertGcodeMacroBlock(configText, null, {
      name: nextName,
      description: '',
      gcode: 'M117 New macro',
    });
    onConfigChange(nextConfig);
    setSelected(nextName);
  };

  const saveActive = () => {
    if (!active) return;
    const nextConfig = upsertGcodeMacroBlock(configText, active.name, {
      name: nameDraft.trim() || active.name,
      description: descriptionDraft,
      gcode: gcodeDraft,
    });
    onConfigChange(nextConfig);
    setSelected(nameDraft.trim() || active.name);
  };

  const deleteActive = () => {
    if (!active) return;
    const nextConfig = removeGcodeMacroBlock(configText, active.name);
    onConfigChange(nextConfig);
    setSelected(null);
  };

  useEffect(() => {
    if (active) {
      setNameDraft(active.name);
      setDescriptionDraft(active.description);
      setGcodeDraft(active.gcode);
    } else {
      setNameDraft('');
      setDescriptionDraft('');
      setGcodeDraft('');
    }
  }, [active]);

  return (
    <div className="h-full border-2 border-border bg-card flex min-h-0">
      <div className="w-56 border-r-2 border-border p-3 flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Macros</h4>
          <Button type="button" size="sm" className="h-7 rounded-none px-2" onClick={addMacro}>
            New
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto space-y-1">
          {macros.length === 0 && (
            <p className="text-[11px] font-mono text-muted-foreground">No macros found.</p>
          )}
          {macros.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => selectMacro(m.name)}
              className={`w-full text-left px-2 py-1 border text-xs font-mono rounded-none transition-colors ${
                activeName === m.name
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground hover:border-primary/40'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-3 flex flex-col gap-2">
        {!active ? (
          <p className="text-sm text-muted-foreground font-mono">Select or create a macro.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase text-muted-foreground font-bold">Name</label>
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="h-8 rounded-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-muted-foreground font-bold">Description</label>
                <Input
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  className="h-8 rounded-none font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <label className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Gcode</label>
              <Textarea
                value={gcodeDraft}
                onChange={(e) => setGcodeDraft(e.target.value)}
                className="flex-1 min-h-[220px] rounded-none font-mono text-xs"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" className="rounded-none" onClick={deleteActive}>
                Delete
              </Button>
              <Button type="button" className="rounded-none" onClick={saveActive}>
                Apply
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

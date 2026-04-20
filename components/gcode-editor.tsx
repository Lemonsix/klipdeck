'use client';

import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor, MarkerSeverity } from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { KlipperLintIssue } from '@/lib/klipper/lint-klipper-config';

interface GCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSaveDraft: () => void;
  onSync: () => void;
  lintIssues: KlipperLintIssue[];
  syncing: boolean;
  canSync: boolean;
  dirty: boolean;
}

const KLIPPER_LANGUAGE_ID = 'klippercfg';
const MARKER_OWNER = 'klipdeck-linter';

const beforeMount: BeforeMount = (monaco) => {
  monaco.languages.register({ id: KLIPPER_LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(KLIPPER_LANGUAGE_ID, {
    tokenizer: {
      root: [
        [/^[ \t]*[;#].*$/, 'comment'],
        [/^\s*\[gcode_macro\s+[^\]]+\]\s*$/, 'macro.header'],
        [/^\s*\[[^\]]+\]\s*$/, 'section.header'],
        [/^\s*[A-Za-z_][A-Za-z0-9_]*\s*:/, 'key.name'],
        [/\b(PA\d+|PB\d+|PC\d+|PD\d+|PE\d+|PF\d+|PG\d+|PH\d+|PI\d+)\b/, 'pin.name'],
        [/\b[GM]\d+(?:\.\d+)?\b/, 'gcode.command'],
        [/-?\d+(?:\.\d+)?/, 'number'],
      ],
    },
  });

  monaco.editor.defineTheme('klipper-config-dark', {
    base: 'vs-dark',
    inherit: false,
    rules: [
      { token: '', foreground: 'f0f0f0', background: '0a0a0a' },
      { token: 'comment', foreground: '5b5b5b', fontStyle: 'italic' },
      { token: 'section.header', foreground: '06b6d4', fontStyle: 'bold' },
      { token: 'macro.header', foreground: 'a855f7', fontStyle: 'bold' },
      { token: 'key.name', foreground: '22d3ee', fontStyle: 'bold' },
      { token: 'pin.name', foreground: '0ea5e9' },
      { token: 'gcode.command', foreground: 'f59e0b', fontStyle: 'bold' },
      { token: 'number', foreground: '34d399' },
    ],
    colors: {
      'editor.background': '#0a0a0a',
      'editor.foreground': '#f0f0f0',
      'editorLineNumber.foreground': '#404040',
      'editorLineNumber.activeForeground': '#06b6d4',
      'editorCursor.foreground': '#06b6d4',
      'editor.selectionBackground': '#06b6d430',
      'editor.lineHighlightBackground': '#141414',
      'editorBracketMatch.background': '#06b6d420',
      'editorBracketMatch.border': '#06b6d4',
    },
  });
};

function toSeverity(severity: KlipperLintIssue['severity']): MarkerSeverity {
  return severity === 'error' ? 8 : 4;
}

export function GCodeEditor({
  value,
  onChange,
  onSaveDraft,
  onSync,
  lintIssues,
  syncing,
  canSync,
  dirty,
}: GCodeEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const applyMarkers = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      lintIssues.map((issue) => ({
        startLineNumber: issue.line,
        startColumn: issue.column,
        endLineNumber: issue.line,
        endColumn: Math.max(issue.endColumn, issue.column + 1),
        message: issue.message,
        severity: toSeverity(issue.severity),
        code: issue.code,
      }))
    );
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyMarkers();
  };

  useEffect(() => {
    applyMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lintIssues]);

  return (
    <div className="h-full flex flex-col bg-card border-2 border-border min-h-0">
      <div className="border-b-2 border-border p-3 flex items-center justify-between bg-card/60">
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Klipper Config Editor</h3>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Lint errors: {lintIssues.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-none" onClick={onSaveDraft}>
            Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-none"
            disabled={!canSync || syncing}
            onClick={onSync}
          >
            {syncing ? 'Syncing…' : 'Sync to Moonraker'}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          language={KLIPPER_LANGUAGE_ID}
          value={value}
          onChange={(next) => onChange(next || '')}
          beforeMount={beforeMount}
          onMount={handleMount}
          theme="klipper-config-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 12,
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'line',
            bracketPairColorization: { enabled: false },
            wordWrap: 'off',
          }}
        />
      </div>

      <div className="border-t-2 border-border p-2 text-[10px] font-mono bg-black/20 flex items-center justify-between">
        <span className="text-muted-foreground">{value.split('\n').length} lines</span>
        <span className={`${dirty ? 'text-primary' : 'text-muted-foreground'}`}>
          {dirty ? 'Draft changed' : 'No local changes'}
        </span>
      </div>
    </div>
  );
}

'use client';

import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { IDisposable, languages } from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';

const LANG_ID = 'klipdeck-macro-gcode';

let languageRegistered = false;

const beforeMount: BeforeMount = (monaco) => {
  if (languageRegistered) return;
  languageRegistered = true;

  monaco.languages.register({ id: LANG_ID });

  monaco.languages.setLanguageConfiguration(LANG_ID, {
    wordPattern: /[a-zA-Z0-9_]+/g,
    comments: { lineComment: ';' },
    brackets: [],
  });

  monaco.languages.setMonarchTokensProvider(LANG_ID, {
    tokenizer: {
      root: [
        [/^[ \t]*[;#].*$/, 'comment'],
        [/\b[GM]\d+(?:\.\d+)?\b/i, 'keyword.gcode'],
        [/\b[a-zA-Z_][a-zA-Z0-9_]*\b/, 'identifier.macro'],
        [/-?\d+(?:\.\d+)?/, 'number'],
      ],
    },
  });

  monaco.editor.defineTheme('klipdeck-macro-dark', {
    base: 'vs-dark',
    inherit: false,
    rules: [
      { token: '', foreground: 'e4e4e7', background: '0a0a0a' },
      { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
      { token: 'keyword.gcode', foreground: 'f59e0b', fontStyle: 'bold' },
      { token: 'identifier.macro', foreground: 'a78bfa' },
      { token: 'number', foreground: '34d399' },
    ],
    colors: {
      'editor.background': '#0a0a0a',
      'editor.foreground': '#e4e4e7',
      'editorLineNumber.foreground': '#52525b',
      'editorLineNumber.activeForeground': '#06b6d4',
      'editorCursor.foreground': '#06b6d4',
      'editor.selectionBackground': '#06b6d430',
      'editor.lineHighlightBackground': '#18181b',
      'editorSuggestWidget.background': '#141414',
      'editorSuggestWidget.border': '#3f3f46',
      'editorSuggestWidget.selectedBackground': '#06b6d428',
    },
  });
};

export interface MacroGcodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Macro names to suggest (typically other `[gcode_macro]` names, excluding the one being edited). */
  otherMacroNames: string[];
}

export function MacroGcodeEditor({ value, onChange, otherMacroNames }: MacroGcodeEditorProps) {
  const namesRef = useRef(otherMacroNames);
  namesRef.current = otherMacroNames;
  const completionDisposableRef = useRef<IDisposable | null>(null);

  const disposeCompletion = useCallback(() => {
    completionDisposableRef.current?.dispose();
    completionDisposableRef.current = null;
  }, []);

  useEffect(() => () => disposeCompletion(), [disposeCompletion]);

  const handleMount: OnMount = (editor, monaco) => {
    disposeCompletion();

    completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(LANG_ID, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const prefix = word.word.toLowerCase();
        const names = namesRef.current;
        const filtered =
          prefix.length === 0
            ? names
            : names.filter((n) => n.toLowerCase().startsWith(prefix) || n.toLowerCase().includes(prefix));

        const suggestions: languages.CompletionItem[] = filtered.map((name) => ({
          label: name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: name,
          range,
          detail: 'Macro',
          sortText: name.toLowerCase().startsWith(prefix) ? `0${name}` : `1${name}`,
        }));

        return { suggestions };
      },
    });
  };

  return (
    <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden border-2 border-border">
      <div className="min-h-0 flex-1">
        <Editor
        height="100%"
        language={LANG_ID}
        value={value}
        onChange={(next) => onChange(next ?? '')}
        beforeMount={beforeMount}
        onMount={handleMount}
        theme="klipdeck-macro-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
          lineNumbers: 'on',
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 8,
          padding: { top: 8, bottom: 8 },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          wordWrap: 'on',
          tabSize: 2,
          insertSpaces: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          tabCompletion: 'on',
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          snippetSuggestions: 'none',
          wordBasedSuggestions: 'off',
          parameterHints: { enabled: false },
          automaticLayout: true,
        }}
        />
      </div>
    </div>
  );
}

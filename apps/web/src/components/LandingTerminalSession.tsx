'use client';

import { ArrowElbowDownLeft } from '@phosphor-icons/react';
import { useLayoutEffect, useRef, useState, type ComponentProps, type FormEvent, type KeyboardEvent } from 'react';

import type { Language } from '@/lib/registry.ts';

interface Entry {
  id: number;
  command: string;
  output: 'languages' | { message: string };
}

interface LandingTerminalSessionProps {
  languages: readonly Language[];
  first: Language;
  second: Language;
  third: Language;
  onLanguageChange: (slug: string) => void;
}

/** A bounded, local command history; commands only select manifest languages. */
export function LandingTerminalSession({ languages, first, second, third, onLanguageChange }: LandingTerminalSessionProps) {
  const [entries, setEntries] = useState<Entry[]>(() => [
    { id: 0, command: 'nodex list', output: 'languages' },
    { id: 1, command: `nodex init ${first.slug}`, output: { message: `Initialised ${first.name}` } },
    { id: 2, command: `nodex init ${second.slug} --force`, output: { message: `Initialised ${second.name}` } },
    { id: 3, command: `nodex init ${third.slug} --force`, output: { message: `Initialised ${third.name}` } },
  ]);
  const [command, setCommand] = useState('');
  const [feedback, setFeedback] = useState('');
  const nextId = useRef(4);
  const scrollback = useRef<HTMLDivElement>(null);
  const historyIndex = useRef<number | null>(null);
  const draft = useRef('');

  useLayoutEffect(() => {
    // Scroll this history only. Never focus the input or move the page when
    // autoplay finishes, especially when that would open a mobile keyboard.
    const node = scrollback.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries]);

  function runCommand(value: string) {
    const text = value.trim().replace(/^\$\s*/, '');
    if (!text) return;
    const parts = text.split(/\s+/);
    let output: Entry['output'];
    let announcement = '';

    if (parts.length === 2 && parts[0] === 'nodex' && parts[1] === 'list') {
      output = 'languages';
      announcement = `Available languages: ${languages.map((language) => language.name).join(', ')}.`;
    } else if (parts[0] === 'nodex' && parts[1] === 'init' &&
      (parts.length === 3 || (parts.length === 4 && parts[3] === '--force'))) {
      const language = languages.find((entry) => entry.slug === parts[2]);
      if (language) {
        onLanguageChange(language.slug);
        output = { message: `Switched to ${language.name}` };
      } else {
        announcement = `Unknown language: ${parts[2]}. Run nodex list to see available languages.`;
        output = { message: announcement };
      }
    } else {
      announcement = 'Try nodex list or nodex init <language> [--force].';
      output = { message: announcement };
    }

    const entry = { id: nextId.current++, command: text, output };
    setEntries((previous) => [...previous, entry].slice(-20));
    setCommand('');
    setFeedback(announcement);
    historyIndex.current = null;
    draft.current = '';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runCommand(command);
  }

  function recallCommand(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (historyIndex.current === null) {
        draft.current = command;
        historyIndex.current = entries.length - 1;
      } else historyIndex.current = Math.max(0, historyIndex.current - 1);
      setCommand(entries[historyIndex.current]!.command);
    } else if (historyIndex.current !== null) {
      event.preventDefault();
      if (historyIndex.current === entries.length - 1) {
        historyIndex.current = null;
        setCommand(draft.current);
      } else {
        historyIndex.current += 1;
        setCommand(entries[historyIndex.current]!.command);
      }
    }
  }

  return (
    <div className="flex h-72 flex-col p-5 text-[13px] leading-[1.8] [font-family:var(--nx-font-mono)] sm:px-7 sm:text-[14px] [@media(min-height:900px)]:h-[348px] [@media(min-height:900px)]:py-7 sm:[@media(min-height:900px)]:text-[15px]">
      <TerminalScrollback ref={scrollback} role="region" aria-label="Terminal history" tabIndex={0} className="space-y-5">
        {entries.map((entry) => <div key={entry.id} data-terminal-entry>
          <div className="flex items-start gap-3">
            <span aria-hidden>$</span><span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.command}</span>
          </div>
          <div className="pl-[calc(1ch+0.75rem)] [overflow-wrap:anywhere]">
            {entry.output === 'languages' ? <TerminalLanguages languages={languages} onSelect={(slug) => runCommand(`nodex init ${slug} --force`)} /> : entry.output.message}
          </div>
        </div>)}
      </TerminalScrollback>
      <form onSubmit={handleSubmit} className="mt-4 flex min-h-10 shrink-0 items-center gap-3 focus-within:outline-1 focus-within:outline-offset-4 focus-within:outline-[var(--nx-ink)]">
        <span aria-hidden>$</span>
        <input aria-label="Terminal command" aria-describedby="landing-terminal-hint" value={command}
          onChange={(event) => { setCommand(event.target.value); historyIndex.current = null; }} onKeyDown={recallCommand}
          placeholder="nodex init mono-editorial" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" maxLength={160}
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[16px] text-[var(--nx-ink)] outline-none [font-family:inherit] placeholder:text-[var(--nx-muted)] sm:text-[14px] sm:[@media(min-height:900px)]:text-[15px]" />
        <button type="submit" aria-label="Run command" disabled={!command.trim()}
          className="nx-btn nx-btn--quiet min-h-9 min-w-9 shrink-0 p-2 text-[var(--nx-ink)]">
          <ArrowElbowDownLeft size={16} aria-hidden />
        </button>
      </form>
      <p id="landing-terminal-hint" className="mt-2 mb-0 shrink-0 text-[12px]">
        Try <button type="button" onClick={() => runCommand('nodex list')} className="cursor-pointer underline underline-offset-4">nodex list</button> to choose a language.
      </p>
      <p role="status" className="sr-only">{feedback}</p>
    </div>
  );
}

/** Native history scrolling uses the shared website scrollbar treatment. */
export function TerminalScrollback({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2
    [scrollbar-gutter:stable]
    focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--nx-ink)] ${className}`} />;
}

/** The same manifest-backed list is read-only during the demo and selectable afterwards. */
export function TerminalLanguages({ languages, onSelect }: { languages: readonly Language[]; onSelect?: (slug: string) => void }) {
  return languages.map((language) => <div key={language.slug} className="flex flex-wrap justify-between gap-x-6">
    {onSelect ? <button type="button" aria-label={`Apply ${language.name}`} onClick={() => onSelect(language.slug)}
      className="cursor-pointer text-left underline decoration-[var(--nx-muted)] underline-offset-4 hover:decoration-[var(--nx-ink)]">{language.slug}</button> : <span>{language.slug}</span>}
    <span className="hidden sm:inline">{language.counts.expressive} {language.counts.expressive === 1 ? 'chart' : 'charts'}, {language.counts.primitives} primitives</span>
  </div>);
}

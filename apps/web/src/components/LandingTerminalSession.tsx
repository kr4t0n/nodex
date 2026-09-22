'use client';

import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';

import type { Language } from '@/lib/registry.ts';

type Output = 'languages' | { message: string };

interface LandingTerminalSessionProps {
  languages: readonly Language[];
  first: Language;
  second: Language;
  third: Language;
  onLanguageChange: (slug: string) => void;
}

/** Three visible prompts, with one reusable editor and bounded command recall. */
export function LandingTerminalSession({ languages, first, second, third, onLanguageChange }: LandingTerminalSessionProps) {
  const [history, setHistory] = useState<string[]>(() => [
    'nodex list',
    `nodex init ${first.slug}`,
    `nodex init ${second.slug} --force`,
    `nodex init ${third.slug} --force`,
  ]);
  const [command, setCommand] = useState(`nodex init ${third.slug} --force`);
  const [output, setOutput] = useState<Output>({ message: `Initialised ${third.name}` });
  const [feedback, setFeedback] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const scrollback = useRef<HTMLDivElement>(null);
  const historyIndex = useRef<number | null>(null);
  const draft = useRef('');

  useLayoutEffect(() => {
    // Match the demo's final scroll position without focusing the editor or
    // opening a mobile keyboard. Native selection is ready at the command end.
    const node = scrollback.current;
    if (node) node.scrollTop = node.scrollHeight;
    const editor = input.current;
    if (editor) editor.setSelectionRange(editor.value.length, editor.value.length);
  }, []);

  function runCommand(value: string) {
    const text = value.trim().replace(/^\$\s*/, '');
    if (!text) return;
    const parts = text.split(/\s+/);
    let nextOutput: Output;
    let announcement = '';

    if (parts.length === 2 && parts[0] === 'nodex' && parts[1] === 'list') {
      nextOutput = 'languages';
      announcement = `Available languages: ${languages.map((language) => language.name).join(', ')}.`;
    } else if (parts[0] === 'nodex' && parts[1] === 'init' &&
      (parts.length === 3 || (parts.length === 4 && parts[3] === '--force'))) {
      const language = languages.find((entry) => entry.slug === parts[2]);
      if (language) {
        onLanguageChange(language.slug);
        nextOutput = { message: `Switched to ${language.name}` };
      } else {
        announcement = `Unknown language: ${parts[2]}. Run nodex list to see available languages.`;
        nextOutput = { message: announcement };
      }
    } else {
      announcement = 'Try nodex list or nodex init <language> [--force].';
      nextOutput = { message: announcement };
    }

    setHistory((previous) => [...previous, text].slice(-20));
    setCommand(text);
    setOutput(nextOutput);
    setFeedback(announcement);
    historyIndex.current = null;
    draft.current = '';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runCommand(command);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(command);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (historyIndex.current === null) {
        draft.current = command;
        historyIndex.current = history.length - 1;
      } else historyIndex.current = Math.max(0, historyIndex.current - 1);
      setCommand(history[historyIndex.current]!);
    } else if (event.key === 'ArrowDown' && historyIndex.current !== null) {
      event.preventDefault();
      if (historyIndex.current === history.length - 1) {
        historyIndex.current = null;
        setCommand(draft.current);
      } else {
        historyIndex.current += 1;
        setCommand(history[historyIndex.current]!);
      }
    }
  }

  return (
    <TerminalBody languageCount={languages.length}>
      <TerminalScrollback ref={scrollback} role="region" aria-label="Terminal history" tabIndex={0}>
        <div data-terminal-entry className="flex items-start gap-3">
          <span aria-hidden>$</span><span>nodex list</span>
        </div>
        <div className="mt-3 mb-4 pl-[calc(1ch+0.75rem)] [@media(min-height:900px)]:mb-6">
          <TerminalLanguages languages={languages} onSelect={(slug) => runCommand(`nodex init ${slug} --force`)} />
        </div>
        <div data-terminal-entry className="flex items-start gap-3">
          <span aria-hidden>$</span><span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">nodex init {first.slug}</span>
        </div>
        <div className="mb-4 pl-[calc(1ch+0.75rem)] [@media(min-height:900px)]:mb-6">Initialised {first.name}</div>
        <form onSubmit={handleSubmit}>
          <div data-terminal-entry className="flex items-start gap-3">
            <span aria-hidden>$</span>
            <div className="group relative min-w-0 flex-1 focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-[var(--nx-ink)]">
              {/* This mirror gives the native editor exactly the demo's wrapping
                  and an idle caret without stealing focus at the handoff. */}
              <div aria-hidden className="pointer-events-none min-h-[1.8em] whitespace-pre-wrap [overflow-wrap:anywhere] group-focus-within:invisible">
                {command}<span className="relative"><span data-terminal-caret className="absolute top-[0.1em] left-px h-[1.1em] w-[0.55em] bg-[var(--nx-ink)] [animation:nx-terminal-caret_1s_steps(1)_infinite] motion-reduce:animate-none" /></span>
              </div>
              <textarea ref={input} aria-label="Terminal command" aria-describedby="landing-terminal-hint" aria-multiline={false} value={command}
                onChange={(event) => { setCommand(event.target.value.replace(/[\r\n]+/g, ' ')); historyIndex.current = null; }} onKeyDown={handleKeyDown}
                rows={1} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" maxLength={160}
                className="absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-transparent caret-[var(--nx-ink)] outline-none [font:inherit] [overflow-wrap:anywhere] focus:text-[var(--nx-ink)]" />
            </div>
          </div>
          <div data-terminal-output className="pl-[calc(1ch+0.75rem)] [overflow-wrap:anywhere]">
            {output === 'languages' ? <TerminalLanguages languages={languages} onSelect={(slug) => runCommand(`nodex init ${slug} --force`)} /> : output.message}
          </div>
        </form>
      </TerminalScrollback>
      <p id="landing-terminal-hint" className="sr-only">Edit the language in this command and press Enter to apply it. Up and Down recall previous commands. Run nodex list to see available languages.</p>
      <p role="status" className="sr-only">{feedback}</p>
    </TerminalBody>
  );
}

/** Reserve a list line per additional language, identically before and after handoff. */
export function TerminalBody({ languageCount, children }: { languageCount: number; children: ReactNode }) {
  return <div data-terminal-body
    style={{ '--terminal-language-space': `${Math.max(0, languageCount - 4) * 1.8}em` } as CSSProperties}
    className="relative flex h-72 flex-col p-5 text-[16px] leading-[1.8] [font-family:var(--nx-font-mono)] sm:h-[calc(20rem+var(--terminal-language-space))] sm:px-7 sm:text-[14px] [@media(min-height:900px)]:h-[calc(380px+var(--terminal-language-space))] [@media(min-height:900px)]:py-7 sm:[@media(min-height:900px)]:text-[15px]">
    {children}
  </div>;
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

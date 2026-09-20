'use client';

import { useGSAP } from '@gsap/react';
import { Pause, Play, TerminalWindow } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, useState, type ReactNode } from 'react';

import { LandingTerminalSession, TerminalLanguages } from '@/components/LandingTerminalSession.tsx';
import { usePrefersReducedMotion } from '@/lib/hooks.ts';
import type { Language } from '@/lib/registry.ts';

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface LandingTerminalProps {
  languages: readonly Language[];
  activeLanguage: string;
  status: 'loading' | 'ready' | 'error';
  onLanguageChange: (slug: string) => void;
  children: ReactNode;
}

/** A single CLI demonstration hands control to an interactive terminal. */
export function LandingTerminal({ languages, activeLanguage, status, onLanguageChange, children }: LandingTerminalProps) {
  const reduced = usePrefersReducedMotion();
  const section = useRef<HTMLElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const listCommand = useRef<HTMLSpanElement>(null);
  const firstCommand = useRef<HTMLSpanElement>(null);
  const nextCommand = useRef<HTMLSpanElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pausedByUser = useRef(false);
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'paused' | 'interactive'>('idle');
  const interactive = playback === 'interactive';
  const first = languages.find((language) => language.slug === 'signal-console');
  const second = languages.find((language) => language.slug === 'neo-brutalism');
  const active = languages.find((language) => language.slug === activeLanguage);
  const ready = status === 'ready' && first !== undefined && second !== undefined;
  const firstText = `nodex init ${first?.slug ?? 'signal-console'}`;
  // Switching an existing project's language requires this flag in the CLI.
  const nextText = `nodex init ${second?.slug ?? 'neo-brutalism'} --force`;

  useGSAP(() => {
    // The interactive session is a permanent handoff for this mounted page.
    // Revert the demo's timeline/listeners, and never recreate them on scroll,
    // theme changes or motion-preference changes.
    if (interactive) return;
    if (!ready || !first || !second || !section.current || !transcript.current) return;
    const root = transcript.current;
    const cursors = root.querySelectorAll<HTMLElement>('[data-cli-cursor]');
    const outputs = root.querySelectorAll<HTMLElement>('[data-cli-output]');
    const commands = [listCommand.current, firstCommand.current, nextCommand.current];
    const commandRows = root.querySelectorAll<HTMLElement>('[data-cli-command]');
    pausedByUser.current = false;

    if (reduced) {
      gsap.set(cursors, { opacity: 0 });
      const finish = () => {
        onLanguageChange(second.slug);
        setPlayback('interactive');
      };
      const trigger = ScrollTrigger.create({
        trigger: section.current,
        start: 'top 12%',
        end: 'bottom 20%',
        onEnter: finish,
      });
      if (trigger.isActive) finish();
      return;
    }

    gsap.set(commands, { textContent: '' });
    gsap.set(outputs, { autoAlpha: 0 });
    gsap.set(commandRows, { autoAlpha: 0 });
    gsap.set(commandRows[0]!, { autoAlpha: 1 });
    gsap.set(cursors, { opacity: 0 });
    gsap.set(cursors[0]!, { opacity: 1 });

    const tl = gsap.timeline({ paused: true, onComplete: () => setPlayback('interactive') });
    timeline.current = tl;

    // Discrete text steps avoid React renders on animation frames and require
    // no text-animation plugin. React retains the complete static transcript.
    const type = (node: HTMLSpanElement | null, text: string, at: number, from = 0) => {
      for (let length = from; length <= text.length; length += 1) {
        tl.set(node, { textContent: text.slice(0, length) }, at + (length - from) * 0.055);
      }
      return at + (text.length - from) * 0.055;
    };

    let at = type(listCommand.current, 'nodex list', 0.35) + 0.3;
    tl.set(cursors[0]!, { opacity: 0 }, at)
      .to(outputs[0]!, { autoAlpha: 1, duration: 0.25 }, at);
    at += 1.2;
    tl.set(commandRows[1]!, { autoAlpha: 1 }, at)
      .set(cursors[1]!, { opacity: 1 }, at);
    at = type(firstCommand.current, firstText, at + 0.15) + 0.35;
    tl.set(cursors[1]!, { opacity: 0 }, at)
      .set(outputs[1]!, { autoAlpha: 1 }, at)
      .call(() => onLanguageChange(first.slug), [], at);

    // Recall the previous command, then visibly backspace just its argument.
    // The executed command above remains an honest terminal history entry.
    at += 2.1;
    tl.set(commandRows[2]!, { autoAlpha: 1 }, at)
      .set(nextCommand.current, { textContent: firstText }, at)
      .set(cursors[2]!, { opacity: 1 }, at)
      .to(cursors[2]!, { opacity: 0, duration: 0.3, repeat: 1, yoyo: true, ease: 'steps(1)' }, at);
    at += 0.8;
    const prefixLength = 'nodex init '.length;
    for (let length = firstText.length - 1; length >= prefixLength; length -= 1) {
      tl.set(nextCommand.current, { textContent: firstText.slice(0, length) }, at);
      at += 0.035;
    }
    at = type(nextCommand.current, nextText, at + 0.2, prefixLength) + 0.35;
    tl.set(cursors[2]!, { opacity: 0 }, at)
      .set(outputs[2]!, { autoAlpha: 1 }, at)
      .call(() => onLanguageChange(second.slug), [], at)
      .to({}, { duration: 0.8 });

    let visible = false;
    const pause = () => {
      tl.pause();
      if (tl.progress() > 0 && tl.progress() < 1) setPlayback('paused');
    };
    const play = () => {
      if (!visible || document.hidden || pausedByUser.current || tl.progress() === 1) return;
      tl.play();
      setPlayback('playing');
    };
    const trigger = ScrollTrigger.create({
      trigger: section.current,
      start: 'top 12%',
      end: 'bottom 20%',
      onEnter: () => { visible = true; play(); },
      onEnterBack: () => { visible = true; play(); },
      onLeave: () => { visible = false; pause(); },
      onLeaveBack: () => { visible = false; pause(); },
    });
    visible = trigger.isActive;
    play();
    const onVisibility = () => { if (document.hidden) pause(); else play(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      timeline.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, { scope: section, dependencies: [interactive, ready, reduced, first, second, firstText, nextText, onLanguageChange], revertOnUpdate: true });

  const control = playback === 'playing' ? 'Pause' : 'Play';
  const ControlIcon = playback === 'playing' ? Pause : Play;

  function handleControl() {
    if (!ready || interactive) return;
    const tl = timeline.current;
    if (!tl) return;
    if (playback === 'playing') {
      pausedByUser.current = true;
      tl.pause();
      setPlayback('paused');
    } else {
      pausedByUser.current = false;
      tl.play();
      setPlayback('playing');
    }
  }

  return (
    <section ref={section} aria-labelledby="landing-cli-title" data-landing-terminal
      className="relative -mt-[16dvh] flex min-h-[100dvh] flex-col justify-center gap-[clamp(2rem,6dvh,6rem)] pt-20 pb-4">
      <div className="w-full px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[780px] min-w-0">
          <h2 id="landing-cli-title" className="m-0 mb-4 text-[24px] leading-[1.15] font-[number:var(--nx-type-pageTitle-weight)] tracking-[var(--nx-type-pageTitle-tracking)] sm:text-[30px] [@media(min-height:900px)]:mb-6">
            One command changes the whole page.
          </h2>
          <div className="nx-card overflow-hidden p-0" data-terminal-state={playback} data-terminal-ready={ready}>
            <div className="flex min-h-12 items-center justify-between gap-4 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] px-5 sm:px-7 [@media(min-height:900px)]:min-h-14">
              <div className="flex min-w-0 items-center gap-3 text-[12px] [font-family:var(--nx-font-mono)]">
                <TerminalWindow size={18} className="shrink-0" aria-hidden />
                <span className="whitespace-nowrap">~/your-app</span>
              </div>
              {interactive ? <span role="status" className="text-[12px] [font-family:var(--nx-font-mono)]">Your turn</span> : reduced ? <span className="text-[12px]">CLI example</span> : <button type="button" className="nx-btn nx-btn--quiet min-h-9 shrink-0 gap-2 px-3 py-2 text-[var(--nx-ink)]" onClick={handleControl} disabled={!ready}>
                <ControlIcon size={14} aria-hidden />{control}
              </button>}
            </div>
            {interactive && first && second ? <LandingTerminalSession
              languages={languages}
              first={first}
              second={second}
              onLanguageChange={onLanguageChange}
            /> : <div className="relative min-h-72 p-5 text-[13px] leading-[1.8] [font-family:var(--nx-font-mono)] sm:px-7 sm:text-[14px] [@media(min-height:900px)]:min-h-[348px] [@media(min-height:900px)]:py-7 sm:[@media(min-height:900px)]:text-[15px]">
              {!ready && <p role="status" className="absolute inset-x-5 top-5 m-0 sm:inset-x-7 [@media(min-height:900px)]:top-7">
                {status === 'error' || status === 'ready' ? 'The demo could not load. Try refreshing the page.' : 'Preparing the terminal…'}
              </p>}
              <div ref={transcript} aria-hidden className={ready ? '' : 'invisible'}>
                <div data-cli-command className="flex items-start gap-3">
                  <span>$</span><div className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]"><span ref={listCommand}>nodex list</span><Cursor /></div>
                </div>
                <div data-cli-output className="mt-3 mb-4 pl-[calc(1ch+0.75rem)] [@media(min-height:900px)]:mb-6">
                  <TerminalLanguages languages={languages} />
                </div>
                <div data-cli-command className="flex items-start gap-3">
                  <span>$</span><div className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]"><span ref={firstCommand}>{firstText}</span><Cursor /></div>
                </div>
                <div data-cli-output className="mb-4 pl-[calc(1ch+0.75rem)] [@media(min-height:900px)]:mb-6">Initialised {first?.name ?? 'Signal Console'}</div>
                <div data-cli-command className="flex items-start gap-3">
                  <span>$</span><div className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]"><span ref={nextCommand}>{nextText}</span><Cursor /></div>
                </div>
                <div data-cli-output className="pl-[calc(1ch+0.75rem)]">Initialised {second?.name ?? 'Neo-brutalism'}</div>
              </div>
            </div>}
          </div>
          <p className="sr-only">CLI example: run nodex list to discover design languages. Run {firstText} to initialise Signal Console. Recall that command, delete its language name, then run {nextText} to switch to Neo-brutalism.</p>
          <p className="mt-3 mb-0 text-[13px]" role="status" aria-live="polite" aria-atomic="true">
            Page language: <span className="font-[number:var(--nx-font-weight-bold)]">{active?.name ?? 'Mono Editorial'}</span>
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Cursor() {
  // The caret must not reserve an extra character and wrap onto its own line.
  return <span className="relative"><span data-cli-cursor className="absolute top-[0.1em] left-px h-[1.1em] w-[0.55em] bg-[var(--nx-ink)] motion-reduce:hidden" /></span>;
}

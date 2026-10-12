'use client';

import { useGSAP } from '@gsap/react';
import { Pause, Play, TerminalWindow } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, useState, type MouseEvent, type ReactNode } from 'react';

import {
  LandingTerminalSession,
  TerminalBody,
  TerminalLanguages,
  TerminalScrollback,
} from '@/components/LandingTerminalSession.tsx';
import { usePrefersReducedMotion } from '@/lib/hooks.ts';
import type { Language } from '@/lib/registry.ts';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Seconds per typed or deleted character in the demo's typing cadence.
const TYPE_STEP = 0.055;
const DELETE_STEP = 0.035;
const INSTALL_TEXT = 'npm install -g @kubitnodes/nodex';
// The published CLI has no runtime dependencies, so npm adds one package.
const INSTALL_OUTPUT = 'added 1 package';

interface LandingTerminalProps {
  languages: readonly Language[];
  activeLanguage: string;
  status: 'loading' | 'ready' | 'error';
  onLanguageChange: (slug: string) => void;
  children: ReactNode;
}

/** A single CLI demonstration hands control to an interactive terminal. */
export function LandingTerminal({
  languages,
  activeLanguage,
  status,
  onLanguageChange,
  children,
}: LandingTerminalProps) {
  const reduced = usePrefersReducedMotion();
  const section = useRef<HTMLElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const installCommand = useRef<HTMLSpanElement>(null);
  const listCommand = useRef<HTMLSpanElement>(null);
  const firstCommand = useRef<HTMLSpanElement>(null);
  const nextCommand = useRef<HTMLSpanElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pausedByUser = useRef(false);
  const [playback, setPlayback] = useState<
    'idle' | 'playing' | 'paused' | 'interactive'
  >('idle');
  const interactive = playback === 'interactive';
  const first = languages.find(
    (language) => language.slug === 'signal-console',
  );
  const second = languages.find(
    (language) => language.slug === 'neo-brutalism',
  );
  const third = languages.find((language) => language.slug === 'sketchbook');
  const active = languages.find((language) => language.slug === activeLanguage);
  const ready =
    status === 'ready' &&
    first !== undefined &&
    second !== undefined &&
    third !== undefined;
  const firstText = `nodex init ${first?.slug ?? 'signal-console'}`;
  // Switching an existing project's language requires this flag in the CLI.
  const nextText = `nodex init ${second?.slug ?? 'neo-brutalism'} --force`;
  const lastText = `nodex init ${third?.slug ?? 'sketchbook'} --force`;

  useGSAP(
    () => {
      // The interactive session is a permanent handoff for this mounted page.
      // Revert the demo's timeline/listeners, and never recreate them on scroll,
      // theme changes or motion-preference changes.
      if (interactive) return;
      if (
        !ready ||
        !first ||
        !second ||
        !third ||
        !section.current ||
        !transcript.current
      )
        return;
      const root = transcript.current;
      const cursors = root.querySelectorAll<HTMLElement>('[data-cli-cursor]');
      const outputs = root.querySelectorAll<HTMLElement>('[data-cli-output]');
      const commands = [
        installCommand.current,
        listCommand.current,
        firstCommand.current,
        nextCommand.current,
      ];
      const commandRows =
        root.querySelectorAll<HTMLElement>('[data-cli-command]');
      pausedByUser.current = false;

      if (reduced) {
        gsap.set(cursors, { opacity: 0 });
        const finish = () => {
          onLanguageChange(third.slug);
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
      gsap.set(root, { scrollTop: 0 });
      gsap.set(outputs, { autoAlpha: 0 });
      gsap.set(commandRows, { autoAlpha: 0 });
      gsap.set(commandRows[0]!, { autoAlpha: 1 });
      gsap.set(cursors, { opacity: 0 });
      gsap.set(cursors[0]!, { opacity: 1 });

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => setPlayback('interactive'),
      });
      timeline.current = tl;

      // Discrete text steps avoid React renders on animation frames and require
      // no text-animation plugin. React retains the complete static transcript.
      const type = (node: HTMLSpanElement | null, text: string, from = 0) => {
        const typing = gsap.timeline();
        for (let length = from; length <= text.length; length += 1) {
          typing.set(
            node,
            { textContent: text.slice(0, length) },
            (length - from) * TYPE_STEP,
          );
        }
        return typing;
      };
      const erase = (
        node: HTMLSpanElement | null,
        text: string,
        to: number,
      ) => {
        const deleting = gsap.timeline();
        for (let length = text.length - 1; length >= to; length -= 1) {
          deleting.set(
            node,
            { textContent: text.slice(0, length) },
            (text.length - 1 - length) * DELETE_STEP,
          );
        }
        return deleting;
      };
      const followCommand = (index: number) => {
        // Scroll only the transcript, reserving room for this command's output.
        // The page and the chart belt keep their position throughout the demo.
        const bottom = outputs[index]!.getBoundingClientRect().bottom;
        root.scrollTop += Math.max(
          0,
          bottom - root.getBoundingClientRect().bottom,
        );
      };
      const showPrompt = (index: number, label: string) =>
        tl
          .set(commandRows[index]!, { autoAlpha: 1 }, label)
          .set(cursors[index]!, { opacity: 1 }, label)
          .call(() => followCommand(index), [], label);

      // Each beat starts at a label placed relative to the previous beat, so a
      // beat can be added or retimed without recomputing every later time.
      tl.add(type(installCommand.current, INSTALL_TEXT), 0.35)
        .addLabel('installed', '+=0.3')
        .set(cursors[0]!, { opacity: 0 }, 'installed')
        .set(outputs[0]!, { autoAlpha: 1 }, 'installed')
        // Hold the install result as long as the list output: on phones the
        // next prompt's scroll-follow takes it out of view.
        .addLabel('list', 'installed+=1.2');
      showPrompt(1, 'list')
        .add(type(listCommand.current, 'nodex list'), 'list+=0.15')
        .addLabel('listed', '+=0.3')
        .set(cursors[1]!, { opacity: 0 }, 'listed')
        .to(outputs[1]!, { autoAlpha: 1, duration: 0.25 }, 'listed')
        .addLabel('init', 'listed+=1.2');
      showPrompt(2, 'init')
        .add(type(firstCommand.current, firstText), 'init+=0.15')
        .addLabel('initialised', '+=0.35')
        .set(cursors[2]!, { opacity: 0 }, 'initialised')
        .set(outputs[2]!, { autoAlpha: 1 }, 'initialised')
        .call(() => onLanguageChange(first.slug), [], 'initialised');

      // The last prompt stays in place for both language replacements and the
      // user's edit. Updating its output must not append another command row.
      const prefixLength = 'nodex init '.length;
      for (const [previousText, text, language] of [
        [firstText, nextText, second],
        [nextText, lastText, third],
      ] as const) {
        const recall = `recall-${language.slug}`;
        const switched = `switched-${language.slug}`;
        tl.addLabel(recall, '+=2.1').set(
          nextCommand.current,
          { textContent: previousText },
          recall,
        );
        showPrompt(3, recall)
          .to(
            cursors[3]!,
            {
              opacity: 0,
              duration: 0.3,
              repeat: 1,
              yoyo: true,
              ease: 'steps(1)',
            },
            recall,
          )
          .add(
            erase(nextCommand.current, previousText, prefixLength),
            `${recall}+=0.8`,
          )
          // The last deletion keeps its keystroke step before the pause.
          .add(
            type(nextCommand.current, text, prefixLength),
            `+=${DELETE_STEP + 0.2}`,
          )
          .addLabel(switched, '+=0.35')
          .set(cursors[3]!, { opacity: 0 }, switched)
          .set(
            outputs[3]!,
            { autoAlpha: 1, textContent: `Initialised ${language.name}` },
            switched,
          )
          .call(
            () => {
              followCommand(3);
              onLanguageChange(language.slug);
            },
            [],
            switched,
          );
      }
      tl.to({}, { duration: 0.8 });

      let visible = false;
      const pause = () => {
        tl.pause();
        if (tl.progress() > 0 && tl.progress() < 1) setPlayback('paused');
      };
      const play = () => {
        if (
          !visible ||
          document.hidden ||
          pausedByUser.current ||
          tl.progress() === 1
        )
          return;
        tl.play();
        setPlayback('playing');
      };
      const trigger = ScrollTrigger.create({
        trigger: section.current,
        start: 'top 12%',
        end: 'bottom 20%',
        onEnter: () => {
          visible = true;
          play();
        },
        onEnterBack: () => {
          visible = true;
          play();
        },
        onLeave: () => {
          visible = false;
          pause();
        },
        onLeaveBack: () => {
          visible = false;
          pause();
        },
      });
      visible = trigger.isActive;
      play();
      const onVisibility = () => {
        if (document.hidden) pause();
        else play();
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        timeline.current = null;
        document.removeEventListener('visibilitychange', onVisibility);
      };
    },
    {
      scope: section,
      dependencies: [
        interactive,
        ready,
        reduced,
        first,
        second,
        third,
        firstText,
        nextText,
        lastText,
        onLanguageChange,
      ],
      revertOnUpdate: true,
    },
  );

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

  function activateEditor(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(
        'button, a, input, textarea, select, [contenteditable="true"]',
      )
    )
      return;
    // A drag through the transcript still selects text for copying. Direct
    // editor clicks and language buttons keep their native behavior above.
    if (window.getSelection()?.isCollapsed === false) return;
    const editor = event.currentTarget.querySelector('textarea');
    if (!editor) return;
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }

  return (
    <section
      ref={section}
      aria-labelledby="landing-cli-title"
      data-landing-terminal
      className="relative -mt-[16dvh] flex min-h-[100dvh] flex-col justify-center gap-[clamp(2rem,6dvh,6rem)] pt-20 pb-4"
    >
      <div className="w-full px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[780px] min-w-0">
          <h2
            id="landing-cli-title"
            className="m-0 mb-4 text-[24px] leading-[1.15] font-[number:var(--nx-type-pageTitle-weight)] tracking-[var(--nx-type-pageTitle-tracking)] sm:text-[30px] [@media(min-height:900px)]:mb-6"
          >
            One command changes the whole page.
          </h2>
          {/* The textarea is the keyboard target; clicking unused transcript space only focuses it. */}
          {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={`nx-card overflow-hidden p-0 ${interactive ? 'cursor-text' : ''}`}
            data-terminal-state={playback}
            data-terminal-ready={ready}
            onClick={interactive ? activateEditor : undefined}
          >
            <div className="flex min-h-12 items-center justify-between gap-4 border-b-[length:var(--nx-stroke-hairline)] border-[var(--nx-border)] px-5 sm:px-7 [@media(min-height:900px)]:min-h-14">
              <div className="flex min-w-0 items-center gap-3 [font-family:var(--nx-font-mono)] text-[12px]">
                <TerminalWindow size={18} className="shrink-0" aria-hidden />
                <span className="whitespace-nowrap">~/your-app</span>
              </div>
              {interactive ? (
                <span
                  role="status"
                  className="[font-family:var(--nx-font-mono)] text-[12px]"
                >
                  Your turn
                </span>
              ) : reduced ? (
                <span className="text-[12px]">CLI example</span>
              ) : (
                <button
                  type="button"
                  className="nx-btn nx-btn--quiet min-h-9 shrink-0 gap-2 px-3 py-2 text-[var(--nx-ink)]"
                  onClick={handleControl}
                  disabled={!ready}
                >
                  <ControlIcon size={14} aria-hidden />
                  {control}
                </button>
              )}
            </div>
            {interactive && first && second && third ? (
              <LandingTerminalSession
                languages={languages}
                install={{ command: INSTALL_TEXT, output: INSTALL_OUTPUT }}
                first={first}
                second={second}
                third={third}
                onLanguageChange={onLanguageChange}
              />
            ) : (
              <TerminalBody languageCount={languages.length}>
                {!ready && (
                  <p
                    role="status"
                    className="absolute inset-x-5 top-5 m-0 sm:inset-x-7 [@media(min-height:900px)]:top-7"
                  >
                    {status === 'error' || status === 'ready'
                      ? 'The demo could not load. Try refreshing the page.'
                      : 'Preparing the terminal…'}
                  </p>
                )}
                <TerminalScrollback
                  ref={transcript}
                  aria-hidden
                  className={ready ? '' : 'invisible'}
                >
                  <div data-cli-command className="flex items-start gap-3">
                    <span>$</span>
                    <div className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap">
                      <span ref={installCommand}>{INSTALL_TEXT}</span>
                      <Cursor />
                    </div>
                  </div>
                  <div
                    data-cli-output
                    className="mb-4 pl-[calc(1ch+0.75rem)] [@media(min-height:900px)]:mb-6"
                  >
                    {INSTALL_OUTPUT}
                  </div>
                  <div data-cli-command className="flex items-start gap-3">
                    <span>$</span>
                    <div className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap">
                      <span ref={listCommand}>nodex list</span>
                      <Cursor />
                    </div>
                  </div>
                  <div
                    data-cli-output
                    className="mt-3 mb-4 pl-[calc(1ch+0.75rem)] [@media(min-height:900px)]:mb-6"
                  >
                    <TerminalLanguages languages={languages} />
                  </div>
                  <div data-cli-command className="flex items-start gap-3">
                    <span>$</span>
                    <div className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap">
                      <span ref={firstCommand}>{firstText}</span>
                      <Cursor />
                    </div>
                  </div>
                  <div
                    data-cli-output
                    className="mb-4 pl-[calc(1ch+0.75rem)] [@media(min-height:900px)]:mb-6"
                  >
                    Initialised {first?.name ?? 'Signal Console'}
                  </div>
                  <div data-cli-command className="flex items-start gap-3">
                    <span>$</span>
                    <div className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap">
                      <span ref={nextCommand}>{nextText}</span>
                      <Cursor />
                    </div>
                  </div>
                  <div data-cli-output className="pl-[calc(1ch+0.75rem)]">
                    Initialised {second?.name ?? 'Neo-brutalism'}
                  </div>
                </TerminalScrollback>
              </TerminalBody>
            )}
          </div>
          <p className="sr-only">
            CLI example: install the CLI with {INSTALL_TEXT}, then run nodex
            list to discover design languages. Run {firstText} to initialise
            Signal Console. Recall that command, delete its language name, then
            run {nextText} to switch to Neo-brutalism. Edit that same line to
            run {lastText} and switch to Sketchbook, then edit the command
            yourself.
          </p>
          <p
            className="mt-3 mb-0 text-[13px]"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            Page language:{' '}
            <span className="font-[number:var(--nx-font-weight-bold)]">
              {active?.name ?? 'Mono Editorial'}
            </span>
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Cursor() {
  // The caret must not reserve an extra character and wrap onto its own line.
  return (
    <span className="relative">
      <span
        data-cli-cursor
        className="absolute top-[0.1em] left-px h-[1.1em] w-[0.55em] bg-[var(--nx-ink)] motion-reduce:hidden"
      />
    </span>
  );
}

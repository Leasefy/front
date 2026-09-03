'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { ArrowUp, Sparkle, Microphone } from '@phosphor-icons/react';
import { IconButton, MentionMenu, type MentionOption } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
  /**
   * default: compact bar docked at the bottom of an active conversation.
   * hero: the big Manus-style centered card used in the welcome state.
   */
  variant?: 'default' | 'hero';
  /** §17G @-mention options (agentes & personas). */
  mentionOptions?: MentionOption[];
  /**
   * Bloque que se apoya SOBRE la caja de texto, fusionado con ella (mismo
   * borde, esquinas compartidas). Lo usa el progreso de la tarea: suelto
   * encima del compositor se veía «separado del chat» (Nico, 2026-08-27).
   */
  topSlot?: React.ReactNode;
}

// §17G default mentions — the domain agents (seed; the app can override).
const DEFAULT_MENTIONS: MentionOption[] = [
  { id: 'inquilino', name: 'Estudio de inquilino', handle: '@inquilino', avatar: 'linear-gradient(140deg,#1A40FF,#2BB5E8)' },
  { id: 'cobranza', name: 'Cobranza', handle: '@cobranza', avatar: 'linear-gradient(140deg,#1F8A5B,#7DE08A)' },
  { id: 'matching', name: 'Smart matching', handle: '@matching', avatar: 'linear-gradient(140deg,#8E7BF0,#F5A878)' },
];

const MAX_ROWS = 5;
const LINE_HEIGHT = 24;

/** Minimal shape of the browser SpeechRecognition we use (not in lib.dom). */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const BAR_COUNT = 5;

/**
 * VoiceBars — live mic-reactive equalizer. Opens its own getUserMedia stream and
 * drives N bars from a Web Audio AnalyserNode via rAF (refs, no re-render). Bars
 * react to real voice amplitude; idle = a gentle floor. Fully self-cleaning.
 */
function VoiceBars() {
  const bars = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;

    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx || !navigator.mediaDevices?.getUserMedia) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        audioCtx = new Ctx();
        const source = audioCtx.createMediaStreamSource(s);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          for (let i = 0; i < BAR_COUNT; i++) {
            const el = bars.current[i];
            if (!el) continue;
            const v = data[i * 2 + 2] / 255; // low-mid bins carry speech energy
            const scale = Math.max(0.18, Math.min(1, 0.18 + v * 1.9));
            el.style.transform = `scaleY(${scale})`;
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {
        /* permission denied / no device — bars stay at floor */
      });

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  }, []);

  return (
    <span className="flex h-7 items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          className="h-7 w-[3px] rounded-full bg-primary will-change-transform"
          style={{ transform: 'scaleY(0.2)', transformOrigin: 'center' }}
        />
      ))}
    </span>
  );
}

/**
 * ChatInput - Clean bordered input with auto-resizing textarea.
 * Enter sends, Shift+Enter for newline. Minimal design.
 */
export function ChatInput({
  onSend,
  disabled = false,
  className,
  variant = 'default',
  mentionOptions = DEFAULT_MENTIONS,
  topSlot,}: ChatInputProps) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── §17G @-mentions ────────────────────────────────────────────────────────
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const isEmpty = value.trim().length === 0;
  const isDisabled = disabled || isEmpty;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const filteredMentions = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return mentionOptions.filter(
      (o) => o.name.toLowerCase().includes(q) || o.handle.toLowerCase().includes(q)
    );
  }, [mentionOpen, mentionQuery, mentionOptions]);

  // Detect a trailing `@token` at the caret → open the mention menu.
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    const caret = e.target.selectionStart ?? text.length;
    const m = text.slice(0, caret).match(/(?:^|\s)@(\w*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[1]);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
    }
  }, []);

  // Replace the trailing `@token` with the chosen handle.
  const selectMention = useCallback(
    (opt: MentionOption) => {
      const ta = textareaRef.current;
      const caret = ta?.selectionStart ?? value.length;
      const before = value.slice(0, caret).replace(/@(\w*)$/, `${opt.handle} `);
      const next = before + value.slice(caret);
      setValue(next);
      setMentionOpen(false);
      requestAnimationFrame(() => {
        ta?.focus();
        ta?.setSelectionRange(before.length, before.length);
      });
    },
    [value]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionOpen && filteredMentions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionIndex((i) => (i + 1) % filteredMentions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          selectMention(filteredMentions[mentionIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionOpen(false);
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [mentionOpen, filteredMentions, mentionIndex, selectMention, handleSend]
  );

  const mentionMenu =
    mentionOpen && filteredMentions.length > 0 ? (
      <div className="absolute bottom-full left-0 z-50 mb-2">
        <MentionMenu
          options={filteredMentions}
          value={filteredMentions[mentionIndex]?.id}
          onSelectOption={selectMention}
        />
      </div>
    ) : null;

  // ── Voice dictation with a live, reactive listening UI ─────────────────────
  // Feature-detected (mic only renders where supported). Real browser Web Speech
  // for transcription; VoiceBars renders the live mic-reactive waveform. The mic
  // toggles a clear "listening" state; speech streams into the composer on stop.
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const liveRef = useRef('');
  const baseRef = useRef('');

  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
        ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia
    );
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const startVoice = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'es-CO';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      let txt = '';
      const { results } = event;
      for (let i = 0; i < results.length; i++) txt += results[i][0].transcript;
      liveRef.current = txt;
      setLiveTranscript(txt);
    };
    rec.onerror = () => {
      setListening(false);
      setLiveTranscript('');
    };
    rec.onend = () => {
      const finalText = liveRef.current.trim();
      if (finalText) {
        const base = baseRef.current.trim();
        setValue(base ? `${base} ${finalText}` : finalText);
      }
      liveRef.current = '';
      setLiveTranscript('');
      setListening(false);
    };
    recognitionRef.current = rec;
    baseRef.current = value;
    liveRef.current = '';
    setLiveTranscript('');
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [value]);

  const toggleVoice = useCallback(() => {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
    } else {
      startVoice();
    }
  }, [listening, startVoice]);

  if (variant === 'hero') {
    // Manus-style hero card: a tall, soft, rounded composer. Placeholder sits at
    // the top; a balanced footer row carries a subtle model cue (left) and the
    // send button (right). Generous radius + soft shadow give it presence.
    return (
      <div className={cn('w-full', className)}>
        <div
          className={cn(
            'relative flex flex-col',
            'px-5 pt-5 pb-4',
            'rounded-[28px]',
            'bg-card',
            'border border-border',
            'shadow-[0_12px_50px_-12px_rgba(16,24,64,0.18)] dark:shadow-[0_12px_50px_-12px_rgba(0,0,0,0.6)]',
            'focus-within:border-border-strong',
            'focus-within:shadow-[0_18px_64px_-12px_rgba(16,24,64,0.24)] dark:focus-within:shadow-[0_18px_64px_-12px_rgba(0,0,0,0.7)]',
            'transition-all duration-200'
          )}
        >
          {mentionMenu}
          {listening ? (
            // Listening state — live waveform + streaming transcript
            <div className="flex min-h-[68px] w-full items-center gap-3.5 py-1">
              <VoiceBars />
              <span
                className={cn(
                  'flex-1 truncate text-[16px] leading-relaxed',
                  liveTranscript ? 'text-foreground' : 'text-fg-subtle'
                )}
              >
                {liveTranscript || t('beta.chat.listening')}
              </span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={t('beta.chat.placeholder')}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full resize-none min-h-[68px]',
                'bg-transparent',
                'text-[16px] leading-relaxed',
                'text-foreground',
                'placeholder:text-fg-subtle',
                'focus:outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              style={{ lineHeight: `${LINE_HEIGHT}px` }}
            />
          )}
          <div className="flex items-center justify-between pt-2">
            {/* Left cue — model name, or a live "listening" pill while recording */}
            {listening ? (
              <span className="inline-flex select-none items-center gap-1.5 pl-0.5 text-[12.5px] font-medium text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {t('beta.chat.listening')}
              </span>
            ) : (
              <span className="inline-flex select-none items-center gap-1.5 pl-0.5 text-[12.5px] font-medium text-fg-subtle">
                <Sparkle className="h-3.5 w-3.5 text-primary/70" weight="fill" />
                Leasefy AI
              </span>
            )}

            <div className="flex items-center gap-1.5">
              {/* Voice dictation — real Web Speech, only where supported */}
              {voiceSupported && (
                <IconButton
                  type="button"
                  icon={<Microphone className="h-[18px] w-[18px]" weight={listening ? 'fill' : 'regular'} />}
                  onClick={toggleVoice}
                  variant="ghost"
                  className={cn(
                    'h-9 w-9 flex-shrink-0 rounded-full',
                    "relative before:absolute before:-inset-1.5 before:content-['']",
                    'transition-all duration-150',
                    listening
                      ? 'bg-primary text-primary-fg shadow-[0_0_0_4px_rgba(26,64,255,0.14)]'
                      : 'text-fg-subtle hover:bg-surface-muted hover:text-fg-muted'
                  )}
                  aria-label={listening ? t('beta.chat.voiceStop') : t('beta.chat.voiceButton')}
                  aria-pressed={listening}
                  title={listening ? t('beta.chat.voiceStop') : t('beta.chat.voiceButton')}
                />
              )}

              <IconButton
                icon={<ArrowUp className="w-4 h-4" weight="bold" />}
                onClick={handleSend}
                disabled={isDisabled || listening}
                variant="ghost"
                className={cn(
                  'flex-shrink-0',
                  'w-10 h-10 rounded-full',
                  "relative before:absolute before:-inset-1.5 before:content-['']",
                  'transition-all duration-150',
                  isDisabled || listening
                    ? 'bg-surface-muted text-fg-subtle cursor-not-allowed'
                    : 'bg-foreground text-background hover:bg-foreground/90 active:scale-95'
                )}
                aria-label={t('beta.chat.sendButton')}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    // pb resolves to 1rem (= pb-4) on desktop; on devices with a home
    // indicator the safe-area inset wins so the input clears it.
    <div className={cn('px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2', className)}>
      <div className="max-w-3xl mx-auto">
        {topSlot && (
          <div className="rounded-t-xl border border-b-0 border-border bg-surface">
            {topSlot}
          </div>
        )}
        <div
          className={cn(
            'relative flex items-end gap-2',
            'px-4 py-2',
            topSlot ? 'rounded-b-xl rounded-t-none' : 'rounded-lg',
            'bg-surface',
            'border border-border',
            'shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
            'focus-within:border-border-strong',
            'focus-within:shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:focus-within:shadow-[0_2px_20px_rgba(0,0,0,0.3)]',
            'transition-all duration-200'
          )}
        >
          {mentionMenu}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t('beta.chat.placeholder')}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 resize-none',
              'bg-transparent',
              'text-[15px] leading-relaxed',
              'text-foreground',
              'placeholder:text-fg-subtle',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'py-1.5'
            )}
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          />

          <IconButton
            icon={<ArrowUp className="w-4 h-4" weight="bold" />}
            onClick={handleSend}
            disabled={isDisabled}
            variant="ghost"
            className={cn(
              'flex-shrink-0',
              'w-8 h-8 rounded-md',
              // ≥44px hit target (32 + 2×6) without growing the visual button
              "relative before:absolute before:-inset-1.5 before:content-['']",
              'transition-all duration-150',
              isDisabled
                ? 'bg-surface-muted text-fg-subtle cursor-not-allowed'
                : 'bg-foreground text-background hover:bg-foreground/90 active:scale-95'
            )}
            aria-label={t('beta.chat.sendButton')}
          />
        </div>
      </div>
    </div>
  );
}

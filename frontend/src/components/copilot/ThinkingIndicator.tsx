import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const UNICODE_CHARS = ['·', '✢', '✳', '✶', '✻', '✽'];
const CHAR_INTERVAL_MS = 150;
const PHRASE_INTERVAL_MS = 3500;
const TIMER_INTERVAL_MS = 100;

const PHRASE_KEYS = [
  'thinking.pondering',
  'thinking.analyzing',
  'thinking.synthesizing',
  'thinking.reasoning',
  'thinking.exploring',
  'thinking.considering',
  'thinking.evaluating',
  'thinking.processing',
  'thinking.examining',
  'thinking.reflecting',
  'thinking.formulating',
  'thinking.connecting',
  'thinking.weighing',
  'thinking.parsing',
  'thinking.mapping',
  'thinking.tracing',
  'thinking.piecing',
  'thinking.untangling',
  'thinking.decoding',
  'thinking.assembling',
  'thinking.iterating',
  'thinking.optimizing',
  'thinking.crafting',
  'thinking.refining',
  'thinking.structuring',
  'thinking.deriving',
  'thinking.inferring',
  'thinking.abstracting',
  'thinking.distilling',
  'thinking.calibrating',
];

export function ThinkingIndicator() {
  const { t } = useTranslation();
  const [charIndex, setCharIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const charTimer = setInterval(() => {
      setCharIndex((prev) => (prev + 1) % UNICODE_CHARS.length);
    }, CHAR_INTERVAL_MS);

    const phraseTimer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASE_KEYS.length);
    }, PHRASE_INTERVAL_MS);

    const elapsedTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 100) / 10);
    }, TIMER_INTERVAL_MS);

    return () => {
      clearInterval(charTimer);
      clearInterval(phraseTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  return (
    <div
      data-testid="thinking-indicator"
      className="thinking-pulse flex items-center gap-2 text-sm text-text-secondary"
    >
      <span data-testid="thinking-char" className="text-accent font-mono text-base w-4 text-center">
        {UNICODE_CHARS[charIndex]}
      </span>
      <span data-testid="thinking-phrase">
        {t(PHRASE_KEYS[phraseIndex])}
      </span>
      <span data-testid="thinking-timer" className="text-xs text-text-muted tabular-nums">
        {elapsed.toFixed(1)}s
      </span>
    </div>
  );
}

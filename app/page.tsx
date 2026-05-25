'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMemo, useRef, useState, useEffect } from 'react';
import type { TravelPlan } from '@/lib/travel-plan';

function useSessionId() {
  const [id] = useState(() => {
    if (typeof window === 'undefined') return '';
    const existing = window.localStorage.getItem('trip-session');
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem('trip-session', fresh);
    return fresh;
  });
  return id;
}

type PlanToolPart = {
  type: `tool-${string}`;
  toolName?: string;
  input?: TravelPlan;
  state?: string;
};

function extractLatestPlan(messages: ReturnType<typeof useChat>['messages']): TravelPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    for (let j = (msg.parts?.length ?? 0) - 1; j >= 0; j--) {
      const part = msg.parts[j] as PlanToolPart;
      if (part.type === 'tool-updateTravelPlan' && part.input && Array.isArray(part.input.days)) {
        return part.input;
      }
    }
  }
  return null;
}

export default function Home() {
  const sessionId = useSessionId();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ sessionId }),
      }),
    [sessionId],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({ transport });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const plan = extractLatestPlan(messages);
  const busy = status === 'submitted' || status === 'streaming';

  const MAX_INPUT_LENGTH = 4000;
  const AMBER_THRESHOLD = MAX_INPUT_LENGTH * 0.8;
  const overMax = input.length >= MAX_INPUT_LENGTH;
  const counterTone =
    overMax
      ? 'text-red-600 dark:text-red-400'
      : input.length > AMBER_THRESHOLD
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-zinc-500';

  const storageKey = sessionId ? `trip-messages:${sessionId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      setMessages(JSON.parse(raw));
    } catch {}
  }, [storageKey, setMessages]);

  useEffect(() => {
    // Skip empty arrays so we don't clobber stored messages on the initial
    // render (before the hydration effect above has run). `clearConversation`
    // removes the key directly, so an empty `messages` should never be
    // persisted anyway.
    if (!storageKey || messages.length === 0) return;
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  function clearConversation() {
    setMessages([]);
    if (storageKey) window.localStorage.removeItem(storageKey);
    inputRef.current?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy || overMax) return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Trip Planner</h1>
          <p className="text-sm text-zinc-500">
            Tell me where you want to go and any constraints — dates, budget, vibe, dietary needs.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            disabled={busy}
            className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
        )}
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Chat */}
        <section className="flex min-h-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 && (
              <div className="mx-auto mt-12 max-w-md text-center text-sm text-zinc-500">
                Try: <em>&ldquo;5 days in Lisbon late September, two adults, mid-budget, love seafood and architecture.&rdquo;</em>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role}>
                  {m.parts.map((part, idx) => {
                    if (part.type === 'text') return <span key={idx}>{part.text}</span>;
                    if (part.type === 'tool-updateTravelPlan') {
                      return (
                        <span key={idx} className="block text-xs italic opacity-70">
                          ✏️ updated the plan
                        </span>
                      );
                    }
                    return null;
                  })}
                </MessageBubble>
              ))}
              {busy && <MessageBubble role="assistant"><Dots /></MessageBubble>}
            </div>
          </div>

          {error && (
            <div className="mx-5 mb-2 rounded-md bg-red-100 px-3 py-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
              {error.message}
            </div>
          )}

          <form onSubmit={submit} className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Where to?"
                className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                disabled={busy}
                aria-describedby="char-count"
              />
              <button
                type="submit"
                disabled={busy || !input.trim() || overMax}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
              >
                Send
              </button>
            </div>
            <div
              id="char-count"
              data-testid="char-count"
              aria-live="polite"
              className={`mt-1.5 px-1 text-right text-xs tabular-nums ${counterTone}`}
            >
              {input.length} / {MAX_INPUT_LENGTH}
            </div>
          </form>
        </section>

        {/* Plan */}
        <section className="min-h-0 overflow-y-auto bg-white px-6 py-5 dark:bg-zinc-900">
          {plan ? <PlanView plan={plan} /> : <EmptyPlan />}
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ role, children }: { role: string; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
            : 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
    </span>
  );
}

function EmptyPlan() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-zinc-500">
      <div className="mb-2 text-4xl">🗺️</div>
      <p>Your itinerary will appear here as we plan.</p>
    </div>
  );
}

function PlanView({ plan }: { plan: TravelPlan }) {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{plan.destination}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{plan.summary}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {plan.dates && <Meta label="Dates" value={plan.dates} />}
          {plan.travelers && <Meta label="Travelers" value={plan.travelers} />}
          {plan.budget && <Meta label="Budget" value={plan.budget} />}
        </dl>
      </header>

      <ol className="space-y-4">
        {plan.days.map((d, i) => (
          <li
            key={d.day ?? i}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-semibold">
                Day {d.day} — {d.title}
              </h3>
              {d.lodging && <span className="text-xs text-zinc-500">🏨 {d.lodging}</span>}
            </div>
            <div className="space-y-1.5 text-sm">
              {d.morning && <Slot label="Morning" text={d.morning} />}
              {d.afternoon && <Slot label="Afternoon" text={d.afternoon} />}
              {d.evening && <Slot label="Evening" text={d.evening} />}
              {d.notes && <p className="mt-2 text-xs italic text-zinc-500">{d.notes}</p>}
            </div>
          </li>
        ))}
      </ol>

      {plan.tips && plan.tips.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Tips</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {plan.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-xs font-medium">{value}</dd>
    </div>
  );
}

function Slot({ label, text }: { label: string; text: string }) {
  return (
    <p>
      <span className="mr-2 inline-block w-20 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {text}
    </p>
  );
}

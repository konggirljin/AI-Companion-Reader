'use client';
import { useEffect, useRef } from 'react';
import { addSession } from './storage/journey-sessions';

function todayLocalIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const HEARTBEAT_MS = 30_000;
const IDLE_TIMEOUT_MS = 60_000;
const MIN_FLUSH_SECONDS = 5;

/**
 * Records reading time for the given book while the reader is open and active.
 * Pause conditions: tab hidden, or no interaction in last IDLE_TIMEOUT_MS.
 * Flushes the accumulated session on unmount/beforeunload.
 * One timer bookkeeping, battery-friendly (single setInterval, no rAF).
 */
export function useReadingSession(bookId: string): void {
  const accumulatedRef = useRef(0);          // ms accumulated for this session
  const lastTickRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());
  const flushedRef = useRef(false);
  const bookIdRef = useRef(bookId);

  // Track user activity (any touch / scroll / key keeps the session "active")
  useEffect(() => {
    const markActive = () => { lastInteractionRef.current = Date.now(); };
    window.addEventListener('pointerdown', markActive);
    window.addEventListener('keydown', markActive);
    window.addEventListener('scroll', markActive, { passive: true });
    window.addEventListener('touchstart', markActive, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('scroll', markActive);
      window.removeEventListener('touchstart', markActive);
    };
  }, []);

  // Heartbeat + visibility handling + flush on unmount
  useEffect(() => {
    bookIdRef.current = bookId;
    flushedRef.current = false;
    accumulatedRef.current = 0;
    lastTickRef.current = Date.now();

    const tick = (): number => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      const recent = now - lastInteractionRef.current < IDLE_TIMEOUT_MS;
      const visible = document.visibilityState === 'visible';
      if (recent && visible) accumulatedRef.current += elapsed;
      return accumulatedRef.current;
    };

    const interval = window.setInterval(tick, HEARTBEAT_MS);

    const onVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible') {
        // Returning to tab: skip the hidden interval entirely
        lastTickRef.current = now;
        lastInteractionRef.current = now;   // treat return as an interaction
      } else {
        tick(); // leaving: settle current interval
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const flush = () => {
      if (flushedRef.current) return;
      const ms = tick();
      flushedRef.current = true;
      const seconds = Math.round(ms / 1000);
      if (seconds >= MIN_FLUSH_SECONDS) {
        try {
          addSession({
            bookId: bookIdRef.current,
            date: todayLocalIso(),
            durationSeconds: seconds,
            startedAt: Date.now() - ms,
          });
        } catch {
          /* localStorage may be unavailable in private mode */
        }
      }
    };

    const onBeforeUnload = () => flush();
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      flush();
    };
  }, [bookId]);
}
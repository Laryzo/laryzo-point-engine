import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'laryzo_order_alarm_enabled';

/**
 * Looping "ting-tung" alarm generated with Web Audio (no audio file needed).
 * Browsers block sound until the user taps once, so `enable()` must be called from a click.
 */
export function useOrderAlarm() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [ringing, setRinging] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current!;
  };

  const beep = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const tones = [
      { f: 1046, t: 0 },
      { f: 784, t: 0.28 },
      { f: 1046, t: 0.7 },
      { f: 784, t: 0.98 },
    ];
    tones.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const start = ctx.currentTime + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.9, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.27);
    });
    if ('vibrate' in navigator) navigator.vibrate?.([300, 150, 300]);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRinging(false);
  }, []);

  const ring = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) return;
    setRinging(true);
    beep();
    timerRef.current = window.setInterval(beep, 2500);
    // Safety: stop after 2 minutes
    window.setTimeout(() => stop(), 120000);
  }, [enabled, beep, stop]);

  const enable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setEnabled(true);
    beep(); // test sound + unlocks audio
  }, [beep]);

  const disable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '0');
    setEnabled(false);
    stop();
  }, [stop]);

  // Unlock audio on first interaction after reload (browser policy)
  useEffect(() => {
    if (!enabled) return;
    const unlock = () => {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [enabled]);

  useEffect(() => () => stop(), [stop]);

  return { enabled, ringing, enable, disable, ring, stop };
}

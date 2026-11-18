"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import styles from "./color-picker.module.css";

type HSV = [hue: number, saturation: number, brightness: number];

function toHex([hue, saturation, brightness]: HSV) {
  const channels = [5, 3, 1].map(offset => {
    const k = (offset + hue / 60) % 6;
    const channel = brightness * (1 - saturation * Math.max(0, Math.min(k, 4 - k, 1)));
    return Math.round(channel * 255).toString(16).padStart(2, "0");
  });
  return `#${channels.join("").toUpperCase()}`;
}

function fromHex(hex: string, previousHue: number): HSV {
  const [red, green, blue] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  if (delta === 0) return [previousHue, 0, max];
  let sector = (red - green) / delta + 4;
  if (max === red) sector = (green - blue) / delta;
  else if (max === green) sector = (blue - red) / delta + 2;
  return [(sector * 60 + 360) % 360, delta / max, max];
}

const unit = (value: number) => Math.max(0, Math.min(value, 1));

// Let even a quick tap show the expanded handle before it settles back to white.
function useHandlePress() {
  const [pressed, setPressed] = useState(false);
  const start = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function press() {
    clearTimeout(timer.current);
    start.current = performance.now();
    setPressed(true);
  }
  function release() {
    clearTimeout(timer.current);
    const remaining = Math.max(0, 100 - (performance.now() - start.current));
    if (remaining) timer.current = setTimeout(() => setPressed(false), remaining);
    else setPressed(false);
  }
  return { pressed, press, release };
}

export default function ColorPicker() {
  const [color, setColor] = useState<HSV>([0, 0, 0]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const graphHandle = useHandlePress();
  const hueHandle = useHandlePress();
  const [hue, saturation, brightness] = color;
  const hex = toHex(color);

  useLayoutEffect(() => {
    if (!open) return;
    field.current?.focus({ preventScroll: true });
    field.current?.select();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: globalThis.PointerEvent) {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function edit(text: string) {
    setDraft(text);
    const value = text.replace(/^#/, "");
    if (/^[\da-f]{6}$/i.test(value)) setColor(fromHex(value, hue));
  }
  function commit() {
    const value = draft?.replace(/^#/, "");
    if (value && /^[\da-f]{3}$/i.test(value)) {
      setColor(fromHex(value.split("").map(c => c + c).join(""), hue));
    }
    setDraft(null);
  }
  function pick(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setColor([hue, unit((event.clientX - bounds.left) / bounds.width), unit(1 - (event.clientY - bounds.top) / bounds.height)]);
    setDraft(null);
  }
  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.01;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowDown: [0, -step], ArrowUp: [0, step],
    };
    const change = directions[event.key];
    if (!change) return;
    event.preventDefault();
    setColor([hue, unit(saturation + change[0]), unit(brightness + change[1])]);
    setDraft(null);
  }

  return (
    <figure id="color-picker" className={`${styles.stage} ${GeistSans.className}`} aria-label="Interactive Vercel color picker">
      <div className={styles.demo} data-open={open} style={{ "--chosen": hex, "--hue": `hsl(${hue} 100% 50%)` } as CSSProperties}
        onKeyDown={event => {
          if (open && event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus({ preventScroll: true });
          }
        }}>
        <button ref={trigger} type="button" className={styles.trigger} aria-label={`Choose color, ${hex}`} aria-haspopup="dialog"
          aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(current => !current)}>
          <span className={styles.swatch} /><span className={GeistMono.className}>{hex}</span>
        </button>
        <div ref={panel} className={styles.popover} id={panelId} role="dialog" aria-label="Color picker" inert={!open}>
          <div className={styles.spectrum} role="slider" aria-label="Saturation and brightness" tabIndex={0}
            aria-valuenow={Math.round(saturation * 100)} aria-valuetext={`${Math.round(saturation * 100)}% saturation, ${Math.round(brightness * 100)}% brightness`}
            onKeyDown={nudge}
            onPointerDown={event => {
              if (!event.isPrimary || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              graphHandle.press();
              pick(event);
            }}
            onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event); }}
            onLostPointerCapture={graphHandle.release}>
            <span className={styles.cursor} data-pressed={graphHandle.pressed} style={{ left: `${saturation * 100}%`, top: `${(1 - brightness) * 100}%` }} />
          </div>
          <div className={styles.hueTrack}>
            <input className={styles.hue} aria-label="Hue" type="range" min="0" max="360" step="0.1" value={hue}
              onPointerDown={event => {
                if (!event.isPrimary || event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                hueHandle.press();
              }}
              onLostPointerCapture={hueHandle.release}
              onChange={event => { setColor([Number(event.target.value), saturation, brightness]); setDraft(null); }}/>
            <span className={styles.hueThumb} data-pressed={hueHandle.pressed} style={{ left: `${hue / 360 * 100}%` }} />
          </div>
          <input ref={field} className={`${styles.hex} ${GeistMono.className}`} aria-label="Hex color" value={draft ?? hex}
            onChange={event => edit(event.target.value)} onFocus={event => event.currentTarget.select()} onBlur={commit}
            onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} spellCheck={false} autoComplete="off" maxLength={7}/>
        </div>
      </div>
    </figure>
  );
}

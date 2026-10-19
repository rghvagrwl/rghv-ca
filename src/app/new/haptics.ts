// Subtle haptic ticks for touch interactions, best-effort per platform:
// Android Chrome has navigator.vibrate; iOS Safari (17.4+) emits a system
// haptic when a switch-style checkbox toggles inside a live user gesture —
// we keep a hidden one around to flick. Everywhere else: silent no-op.

let switchInput: HTMLInputElement | null = null;

const ensureSwitch = () => {
  if (switchInput) return switchInput;
  const label = document.createElement("label");
  label.style.cssText =
    "position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.body.appendChild(label);
  switchInput = input;
  return input;
};

let lastTick = 0;

export function hapticTick() {
  const now = performance.now();
  if (now - lastTick < 45) return; // never machine-gun the motor
  lastTick = now;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
      return;
    }
    ensureSwitch().click();
  } catch {
    /* no haptics available — fine */
  }
}

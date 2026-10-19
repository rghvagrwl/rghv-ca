"use client";

import { useRef } from "react";

// A text button that leans toward the cursor while hovered and springs back
// on leave. No cursor frame — the pull is the whole affordance. Used for the
// close buttons.
export default function MagneticButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      className={className}
      onClick={onClick}
      onMouseLeave={() => {
        const node = ref.current;
        if (node) node.style.transform = "";
      }}
      onMouseMove={(event) => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        node.style.transform = `translate(${dx * 0.35}px, ${dy * 0.35}px)`;
      }}
      ref={ref}
      type="button"
    >
      {children}
    </button>
  );
}

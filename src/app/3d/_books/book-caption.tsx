"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { editions } from "./editions";
import styles from "./books.module.css";

export default function BookCaption({ selected, revealed, onMeasure }: {
  selected: number; revealed: number;
  onMeasure: (index: number, width: number, height: number) => void;
}) {
  const dock = useRef<HTMLDivElement>(null);
  const [pair, setPair] = useState({ current: selected, previous: -1 });
  if (pair.current !== selected) setPair({ current: selected, previous: pair.current });

  useLayoutEffect(() => {
    const el = dock.current;
    const text = el?.querySelector<HTMLElement>("[data-book-caption]");
    if (!el || !text) return;
    const measure = () => onMeasure(selected, text.offsetWidth, el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(text);
    return () => observer.disconnect();
  }, [selected, onMeasure]);

  return <div ref={dock} className={styles.captionDock}>
    <div className={styles.captionStack}>
      {[pair.previous, pair.current].map(i => {
        if (i < 0) return null;
        const book = editions[i], leaving = i !== selected;
        return <div key={book.id} className={styles.caption} data-book-caption={leaving ? undefined : ""}
          data-leaving={leaving || undefined} data-pending={!leaving && revealed !== i || undefined}
          aria-hidden={leaving || undefined}
          onTransitionEnd={event => {
            if (leaving && event.propertyName === "visibility") {
              setPair(p => p.previous === i ? { ...p, previous: -1 } : p);
            }
          }}>
          <h2>{book.title}</h2>
          <p>{book.author}</p>
          <p><time dateTime={String(book.year)}>{book.year}</time></p>
        </div>;
      })}
    </div>
  </div>;
}

"use client";

import { useRef } from "react";

import HoverBlob from "./hover-blob";
import InkDust from "./ink-dust";

// v3 of the about: no expanding, no triggers. The hidden passages are
// invisible ink — run your cursor over the dust and the words condense into
// focus where you touch, iMessage-style; after ten idle seconds they exhale
// back into dust. Dotted underlines and the glass blob belong to LINKS only.

type Node =
  | string
  | { href: string; label: string }
  | { hidden: Node[] };

const CONTENT_1: Node[] = [
  "My name is Raghav Agarwal. I'm 18 years old",
  { hidden: [" and I was born in Calgary, Canada."] },
  " I'm a designer",
  {
    hidden: [
      " who began learning design independently through the internet four years ago.",
    ],
  },
  " I'm also a student at the University of Waterloo",
  {
    hidden: [
      " studying Global Business and Digital Arts, where I'm starting my second year.",
    ],
  },
];

const CONTENT_2: Node[] = [
  "I",
  { hidden: [" most recently"] },
  " designed at ",
  { href: "https://vercel.com", label: "Vercel" },
  {
    hidden: [
      ", where I had the chance to work on ",
      { href: "https://v0.app", label: "v0" },
      " and ",
      { href: "https://vercel.com/connect", label: "Connect" },
      ".",
    ],
  },
  {
    hidden: [
      " I'm especially drawn to delightful tools and early-stage products, especially when good design can make complicated things feel intuitive.",
    ],
  },
];

const CONTENT_3: Node[] = [
  {
    hidden: [
      "If you want to share interesting opinions, ask me questions, or grab coffee,",
    ],
  },
  " reach out on ",
  { href: "https://linkedin.com/in/rghv-agrwl", label: "LinkedIn" },
  ", ",
  { href: "https://x.com/varksed", label: "X" },
  ", or by ",
  { href: "mailto:rghvagwl@gmail.com", label: "Email" },
  ".",
];

function Link({ href, label }: { href: string; label: string }) {
  // Labels are letterized just like hidden prose, so a veiled link reveals
  // letter-by-letter with the same brush instead of popping in whole.
  return (
    <a
      className="nx-t"
      href={href}
      rel="noreferrer"
      target={href.startsWith("mailto:") ? undefined : "_blank"}
    >
      {label.split("").map((ch, i) => (
        <span className="nx-l" key={i}>
          {ch}
        </span>
      ))}
    </a>
  );
}

function renderNodes(nodes: Node[], veiled: boolean): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (typeof node === "string") {
      if (!veiled) {
        out.push(<span key={index}>{node}</span>);
        continue;
      }
      // Hidden text renders as words of individual LETTERS, so the scrub
      // reveals like a brush stroke — character by character.
      const words = node.match(/\s*\S+\s*/g) ?? (node ? [node] : []);
      const spans: React.ReactNode[] = [];
      for (let w = 0; w < words.length; w++) {
        const letters: React.ReactNode[] = [];
        for (let c = 0; c < words[w].length; c++) {
          letters.push(
            <span className="nx-l" key={`${w}-${c}`}>
              {words[w][c]}
            </span>,
          );
        }
        spans.push(
          <span className="nx-w" key={w}>
            {letters}
          </span>,
        );
      }
      out.push(<span key={index}>{spans}</span>);
      continue;
    }
    if ("href" in node) {
      out.push(<Link href={node.href} key={index} label={node.label} />);
      continue;
    }
    out.push(
      <span className="nx-r" data-blur="" key={index}>
        {renderNodes(node.hidden, true)}
      </span>,
    );
  }
  return out;
}

export default function AboutTextV3() {
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <div className="nx-body nx-plain nx-sweep" ref={bodyRef}>
      <HoverBlob as="span" glass pad={1} padX={8} release={38} rows="a.nx-t" />
      <InkDust scrub />
      <p className="nv-bio nx-text">{renderNodes(CONTENT_1, false)}</p>
      <p className="nv-bio nx-text">{renderNodes(CONTENT_2, false)}</p>
      <p className="nv-bio nx-text">{renderNodes(CONTENT_3, false)}</p>
    </div>
  );
}

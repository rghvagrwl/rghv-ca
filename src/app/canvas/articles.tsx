"use client";

import Image from "next/image";
import type { MouseEvent, ReactNode } from "react";
import { notesOnDesign } from "./notes-on-design";
import styles from "./articles.module.css";

type Media = { src: string; alt: string; caption: string; width: number; height: number };
type Annotation = { side: "left" | "right"; text: string; brace?: boolean };
type InlinePart = string | { note: number };
export type ArticleBlock =
  | { type: "paragraph"; id: string; parts: InlinePart[]; annotation?: Annotation }
  | { type: "section"; id: string; title: string }
  | { type: "subsection"; id: string; title: string }
  | { type: "list"; id: string; ordered: boolean; items: string[] }
  | { type: "image"; id: string; media: Media }
  | { type: "imageGroup"; id: string; media: Media[] }
  | { type: "divider"; id: string }
  | { type: "quote"; id: string; text: string; attribution?: string }
  | { type: "smallText"; id: string; paragraphs: string[] }

export type Article = {
  id: string;
  title: string;
  date: string;
  listDate?: string;
  introNote?: string[];
  blocks: ArticleBlock[];
  notes: { number: number; text: string }[];
};

export const articles: Article[] = [notesOnDesign];

function SquareBracket() {
  return (
    <svg className={styles.brace} viewBox="0 0 24 96" fill="none" aria-hidden="true">
      <path d="M19 4H7V92H19" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarginNote({ note }: { note: Annotation }) {
  return (
    <aside className={`${styles.marginNote} ${note.side === "left" ? styles.noteLeft : styles.noteRight}`}>
      {note.side === "right" && note.brace && <SquareBracket />}
      <span>{note.text}</span>
      {note.side === "left" && note.brace && <SquareBracket />}
    </aside>
  );
}

function MediaCard({ media }: { media: Media }) {
  return (
    <figure className={styles.mediaCard}>
      <div className={styles.mediaFrame}>
        <Image src={media.src} alt={media.alt} width={media.width} height={media.height} sizes="(max-width: 960px) 92vw, 900px" />
      </div>
      <figcaption className={styles.mediaCaption}>{media.caption}</figcaption>
    </figure>
  );
}

export default function ArticlePage({ article }: { article: Article }) {
  function highlightedText(id: string) {
    const destination = document.getElementById(id);
    return destination?.matches("[data-note-highlight]")
      ? destination
      : destination?.closest("[data-note-highlight]") ?? destination?.querySelector("[data-note-highlight]");
  }

  function flashNoteDestination(id: string) {
    const text = highlightedText(id);
    if (!text || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    text.getAnimations().forEach((animation) => animation.cancel());
    text.animate(
      [
        { backgroundColor: "rgb(255 234 142 / 70%)", offset: 0 },
        { backgroundColor: "rgb(255 234 142 / 70%)", offset: 0.3 },
        { backgroundColor: "rgb(255 234 142 / 0%)", offset: 1 },
      ],
      { duration: 2600, easing: "ease-out" },
    );
  }

  function jumpToNote(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const text = highlightedText(id);
    if (!text) return;
    event.preventDefault();
    if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
    const bounds = text.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + bounds.top + bounds.height / 2 - window.innerHeight / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    flashNoteDestination(id);
  }

  function renderParts(parts: InlinePart[]): ReactNode {
    return parts.map((part, index) => typeof part === "string" ? part : (
      <a className={styles.noteRef} key={`${part.note}-${index}`} id={`note-ref-${part.note}`} href={`#note-${part.note}`} aria-label={`Footnote ${part.note}`} onClick={(event) => jumpToNote(event, `note-${part.note}`)}><sup>{part.note}</sup></a>
    ));
  }

  return (
    <article className={styles.article}>
      {article.introNote && (
        <header className={styles.articleHeader}>
          <div className={styles.introNote}>
            {article.introNote.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </header>
      )}

      <div className={styles.articleFlow}>
        {article.blocks.map((block) => {
          switch (block.type) {
            case "paragraph": return (
              <div className={styles.prose} key={block.id}>
                {block.annotation && <MarginNote note={block.annotation} />}
                <p><span data-note-highlight className={styles.highlightText}>{renderParts(block.parts)}</span></p>
              </div>
            );
            case "section": return (
              <h3 className={styles.sectionHeading} key={block.id}>{block.title}</h3>
            );
            case "subsection": return <h4 className={styles.subsectionHeading} key={block.id}>{block.title}</h4>;
            case "list": {
              const List = block.ordered ? "ol" : "ul";
              return <List className={styles.list} key={block.id} role="list">{block.items.map((item, index) => <li key={item}><span className={styles.listMarker} aria-hidden="true">{block.ordered ? `${index + 1}.` : "•"}</span><span>{item}</span></li>)}</List>;
            }
            case "image": return <MediaCard key={block.id} media={block.media} />;
            case "imageGroup": return (
              <div className={styles.imageGroup} key={block.id}>
                {block.media.map((media) => <MediaCard key={media.src} media={media} />)}
              </div>
            );
            case "divider": return <hr className={styles.divider} key={block.id} />;
            case "quote": return <blockquote className={styles.quote} key={block.id}><p>{block.text}</p>{block.attribution && <cite>{block.attribution}</cite>}</blockquote>;
            case "smallText": return <aside className={styles.smallText} key={block.id}>{block.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</aside>;
          }
        })}
      </div>

      {article.notes.length > 0 && (
        <section className={styles.endnotes} aria-label="Footnotes">
          <h3>Notes</h3>
          {article.notes.map((note) => (
            <p className={styles.endnote} id={`note-${note.number}`} key={note.number}>
              <a className={styles.endnoteLink} href={`#note-ref-${note.number}`} onClick={(event) => jumpToNote(event, `note-ref-${note.number}`)}>
                <span className={styles.noteNumber}>{note.number}.</span>
                <span><span data-note-highlight className={styles.highlightText}>{note.text}</span></span>
              </a>
            </p>
          ))}
        </section>
      )}

    </article>
  );
}

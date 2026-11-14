import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./page.module.css";

export function Chevron({ back = false, className }: { back?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9.34315 6.34315L15 12L9.34315 17.6569" transform={back ? "translate(24 0) scale(-1 1)" : undefined}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Arrow({ back = false }: { back?: boolean }) {
  return <span className={styles.arrowSlot} aria-hidden="true"><Chevron back={back} className={styles.arrowIcon} /></span>;
}

type ListRowProps = {
  title: string;
  date?: string | null;
  children?: ReactNode;
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

export function ListRow({ title, date, children, href, onClick }: ListRowProps) {
  const className = `${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`;
  const content = <>
    <Arrow />
    <span className={styles.arrowTitle}>{title}</span>
    {children ?? (date && <span className={styles.date}>{date}</span>)}
  </>;

  if (href !== undefined) return <Link className={className} href={href} prefetch={false}>{content}</Link>;
  return <button className={className} type="button" onClick={onClick}>{content}</button>;
}

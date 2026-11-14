import type { Metadata } from "next";
import Link from "next/link";
import { Arrow, ListRow } from "../canvas/list-row";
import styles from "../canvas/page.module.css";

export const metadata: Metadata = {
  title: "3D — Raghav Agarwal",
  description: "Interactive studies of everyday objects by Raghav Agarwal.",
};

export default function StudiesIndex() {
  return (
    <main className={styles.page} data-canvas-site>
      <div className={styles.detailSidebar}>
        <h1 className={styles.detailHeading} aria-label="3D">
          <Link className={`${styles.detailBackRow} ${styles.arrowItem}`} href="/" prefetch={false} aria-label="Back to home">
            <Arrow back />
            <span className={styles.arrowTitle}>3D</span>
          </Link>
        </h1>
        <nav className={`${styles.detailList} ${styles.navigation}`} aria-label="3D studies">
          <ListRow title="Books" date="2026" href="/3d/books" />
          <ListRow title="Comics" date="2026" href="/3d/comics" />
        </nav>
      </div>
    </main>
  );
}

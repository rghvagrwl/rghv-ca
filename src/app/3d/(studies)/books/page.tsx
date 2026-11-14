import type { Viewport } from "next";
import { socialMetadata } from "../../../../lib/social-metadata";
import Books from "../../_books/books";
import styles from "../../_books/books.module.css";

export const metadata = socialMetadata("books");
export const viewport: Viewport = { viewportFit: "cover" };

export default function BooksPage() {
  return <main className={styles.stage} aria-label="Bookshelf">
    <Books />
  </main>;
}

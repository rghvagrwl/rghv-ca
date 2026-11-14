import artwork from "./book-art-manifest.json";
import { designEditions } from "./new-design";
import { makingEditions } from "./new-making";
import { readingEditions } from "./new-reading";
import { designCollection } from "./collection-design";
import { readingCollection } from "./collection-reading";

// Closed editions, in millimetres: cover width × trim height × spine thickness.
// A book's place on the shelf comes from these measurements, not its cover image.
export type Edition = {
  id: string;
  title: string;
  author: string;
  /** Filing name for a compound surname or the first author of a shared credit. */
  sortAuthor?: string;
  /** Original publication year of the work. */
  year: number;
  isbn: string;
  width: number;
  height: number;
  thickness: number;
  pages: number;
  binding: "swiss" | "jacket" | "case" | "cloth" | "paperback";
  stock: string;
  paper: string;
};

const catalog: Edition[] = [
  ...designCollection,
  ...designEditions,
  ...makingEditions,
  ...readingCollection,
  ...readingEditions,
  { id: "grid-systems", title: "Grid Systems in Graphic Design", author: "Josef Müller-Brockmann", isbn: "9783721201451",
    year: 1981, width: 210, height: 300, thickness: 20, pages: 176, binding: "case", stock: "#ec6224", paper: "#f4f1e9" },
  { id: "shoe-dog", title: "Shoe Dog", author: "Phil Knight", isbn: "9781501135910",
    year: 2016, width: 152.4, height: 228.6, thickness: 27.9, pages: 400, binding: "jacket", stock: "#1b1d21", paper: "#f1e8d3" },
  { id: "creative-act", title: "The Creative Act: A Way of Being", author: "Rick Rubin", isbn: "9780593652886",
    year: 2023, width: 160, height: 226, thickness: 36, pages: 432, binding: "cloth", stock: "#c6cac0", paper: "#eee9da" },
  { id: "steve-jobs", title: "Steve Jobs", author: "Walter Isaacson", isbn: "9781451648539",
    year: 2011, width: 156, height: 235, thickness: 46, pages: 656, binding: "jacket", stock: "#f3f2ef", paper: "#f3efe3" },
  { id: "icons", title: "Virgil Abloh. Nike. ICONS", author: "Virgil Abloh", isbn: "9783836585095",
    year: 2021, width: 255, height: 297, thickness: 30, pages: 352, binding: "swiss", stock: "#73eb3d", paper: "#f1f0e7" },
];

const alphabet = new Intl.Collator("en", { sensitivity: "base", numeric: true, ignorePunctuation: true });
function filingAuthor(book: Edition) {
  if (book.sortAuthor) return book.sortAuthor;
  // A single name or organization files as printed.
  return book.author.replace(/^(.+) (\S+)$/, "$2, $1");
}
const filingTitle = (title: string) => title.replace(/^(?:the|an?)\s+/i, "");
export const editions: readonly Edition[] = catalog.sort((a, b) =>
  alphabet.compare(filingAuthor(a), filingAuthor(b)) || alphabet.compare(filingTitle(a.title), filingTitle(b.title)));

export const initialBookIndex = 0;

type ArtEntry = (typeof artwork.editions)[keyof typeof artwork.editions];
export const artFor = (id: string) => (artwork.editions as Record<string, ArtEntry>)[id];

export const frontURL = (e: Edition) => artFor(e.id).front;
export const spineURL = (e: Edition) => artFor(e.id).spine;
export const backURL = (e: Edition) => artFor(e.id).back;

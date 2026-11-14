import type { Edition } from "./editions";

export const designEditions: readonly Edition[] = [
  {
    id: "looking-sideways", title: "The Art of Looking Sideways", author: "Alan Fletcher", year: 2001,
    isbn: "9780714834498", width: 210, height: 250, thickness: 60, pages: 1064,
    binding: "case", stock: "#f4f3ec", paper: "#eeeadd",
  },
  {
    id: "thinking-with-type", title: "Thinking with Type", author: "Ellen Lupton", year: 2004,
    isbn: "9781797226828", width: 178, height: 216, thickness: 25, pages: 256,
    binding: "paperback", stock: "#c4dce7", paper: "#f4f1e8",
  },
  {
    id: "interaction-of-color", title: "Interaction of Color", author: "Josef Albers", year: 1963,
    isbn: "9780300179354", width: 152, height: 234, thickness: 15, pages: 208,
    binding: "paperback", stock: "#f5f2e9", paper: "#f3f0e6",
  },
];

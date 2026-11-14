import type { Edition } from "./editions";

export const readingEditions: readonly Edition[] = [
  { id: "deep-work", title: "Deep Work", author: "Cal Newport", year: 2016, isbn: "9781455586691",
    width: 146, height: 216, thickness: 25, pages: 304, binding: "jacket", stock: "#efb52a", paper: "#f4efde" },
  { id: "design-of-everyday-things", title: "The Design of Everyday Things", author: "Don Norman", year: 1988, isbn: "9780465050659",
    width: 137, height: 208, thickness: 25, pages: 368, binding: "paperback", stock: "#f5d938", paper: "#f4f0e3" },
  { id: "war-of-art", title: "The War of Art", author: "Steven Pressfield", year: 2002, isbn: "9781936891023",
    width: 124, height: 201, thickness: 13, pages: 190, binding: "paperback", stock: "#f5f4ef", paper: "#ede6d7" },
  { id: "creativity-inc", title: "Creativity, Inc.", author: "Ed Catmull with Amy Wallace", year: 2014, isbn: "9780812993011",
    sortAuthor: "Catmull, Ed",
    width: 163, height: 241, thickness: 25, pages: 368, binding: "jacket", stock: "#c84438", paper: "#f3edde" },
];

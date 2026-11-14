import type { Edition } from "./editions";

export const makingEditions: readonly Edition[] = [
  {
    id: "atomic-habits", title: "Atomic Habits", author: "James Clear", year: 2018,
    isbn: "9780735211292", width: 161, height: 235, thickness: 27, pages: 320,
    binding: "jacket", stock: "#f5f4e9", paper: "#ebe7db",
  },
  {
    id: "steal-like-an-artist", title: "Steal Like an Artist", author: "Austin Kleon", year: 2012,
    isbn: "9780761169253", width: 152, height: 150, thickness: 14.3, pages: 160,
    binding: "paperback", stock: "#211d1e", paper: "#f0efea",
  },
  {
    id: "creative-selection", title: "Creative Selection", author: "Ken Kocienda", year: 2018,
    isbn: "9781250203410", width: 137.2, height: 209.6, thickness: 21.6, pages: 304,
    binding: "paperback", stock: "#538fc4", paper: "#f2efdf",
  },
];

type CoverStock = "paper" | "card" | "overlay";

interface Edition {
  slug: string;
  title: string;
  pages: number;
  wide?: boolean;
  trim?: [width: number, height: number]; // Inches
  bagWidth?: number;
  spineColor?: string;
  printedSpine?: boolean;
  square?: boolean;
  stock?: CoverStock;
  dieCut?: boolean;
  foil?: "gold" | "silver" | "red" | "blue";
  chromium?: boolean;
}

// In model space 2.25 units represents the nominal 10¼-inch trim height.
// Calipers are stock estimates in mm; page counts include both covers.
const editions: Edition[] = [
  { slug: "strange-adventures-117", title: "Strange Adventures #117", pages: 36, wide: true },
  { slug: "caliber-presents-1", title: "Caliber Presents #1", pages: 52 },
  { slug: "astro-boy-4", title: "The Original Astro Boy #4", pages: 28 },
  { slug: "fantastic-four-48", title: "Fantastic Four #48", pages: 36, wide: true },
  { slug: "spider-man-2099-1", title: "Spider-Man 2099 #1", pages: 36, stock: "card", foil: "red" },
  { slug: "shade-the-changing-man-1", title: "Shade, the Changing Man #1", pages: 36 },
  { slug: "captain-america-100", title: "Captain America #100", pages: 36, wide: true },
  { slug: "young-romance-66", title: "Young Romance #66", pages: 36, trim: [7.375, 10.5] },
  { slug: "iron-man-217", title: "Iron Man #217", pages: 36 },
  { slug: "aliens-6", title: "Aliens #6", pages: 36 },
  { slug: "bone-9", title: "Bone #9", pages: 28 },
  { slug: "black-diamond-western-20", title: "Black Diamond Western #20", pages: 52, trim: [7.0625, 10.5] },
  { slug: "doorway-to-nightmare-2", title: "Doorway to Nightmare #2", pages: 36 },
  { slug: "ghost-rider-1", title: "Ghost Rider #1", pages: 52 },
  { slug: "hup-4", title: "Hup #4", pages: 36, trim: [7, 9.75] },
  { slug: "flash-333", title: "The Flash #333 — Down with the Flash!", pages: 36 },
  { slug: "silver-surfer-50", title: "Silver Surfer #50", pages: 52, stock: "card", foil: "silver" },
  { slug: "rocketeer-special-edition-1", title: "The Rocketeer Special Edition #1", pages: 36 },
  { slug: "ha-ha-comics-1", title: "Ha Ha Comics #1", pages: 60, trim: [7.6875, 10.5] },
  { slug: "x-men-141", title: "The Uncanny X-Men #141", pages: 36 },
  { slug: "wonder-woman-150", title: "Wonder Woman #150", pages: 36, wide: true },
  { slug: "judge-dredd-2", title: "Judge Dredd #2", pages: 36 },
  { slug: "batman-500", title: "Batman #500 — Collector’s Edition", pages: 72, stock: "card", dieCut: true, foil: "silver" },
  { slug: "four-color-632", title: "Four Color #632 — Zane Grey’s Fighting Caravans", pages: 36, trim: [7.4375, 10.5] },
  { slug: "infinity-crusade-1", title: "Infinity Crusade #1 — Let There Be Light!", pages: 52, foil: "gold" },
  { slug: "out-of-this-world-9", title: "Out of This World #9", pages: 36, trim: [7.25, 10.25] },
  { slug: "usagi-yojimbo-1", title: "Usagi Yojimbo #1", pages: 36 },
  { slug: "adventures-superman-500", title: "Adventures of Superman #500 — Collector’s Set", pages: 68, trim: [17 / 2.54, 26 / 2.54], stock: "overlay", square: true },
  { slug: "turok-dinosaur-hunter-1", title: "Turok, Dinosaur Hunter #1", pages: 36, stock: "card", foil: "red", chromium: true },
  { slug: "swamp-thing-47", title: "Swamp Thing #47", pages: 36 },
  { slug: "destroyer-duck-1", title: "Destroyer Duck #1", pages: 36 },
  { slug: "spider-man-classics-1", title: "Spider-Man Classics #1", pages: 36 },
  { slug: "fightin-marines-22", title: "Fightin’ Marines #22", pages: 36, trim: [7.0, 10.25] },
  { slug: "silver-surfer-4", title: "The Silver Surfer #4", pages: 68, wide: true, square: true, printedSpine: true },
  { slug: "tmnt-4", title: "Teenage Mutant Ninja Turtles #4", pages: 44, trim: [7.375, 10.875] },
  { slug: "death-dealer-1", title: "Death Dealer #1", pages: 52, square: true, stock: "card", spineColor: "#201e20" },
  { slug: "incredible-hulk-340", title: "The Incredible Hulk #340", pages: 36 },
  { slug: "true-comics-35", title: "True Comics #35", pages: 52, trim: [7.9375, 10.5] },
  { slug: "hellboy-seed-of-destruction-1", title: "Hellboy: Seed of Destruction #1", pages: 36 },
  { slug: "venom-lethal-protector-1", title: "Venom: Lethal Protector #1", pages: 36, stock: "card", foil: "red" },
  { slug: "wolverine-1", title: "Wolverine #1", pages: 36 },
  { slug: "great-gazoo-1", title: "The Great Gazoo #1", pages: 36 },
  { slug: "plop-1", title: "Plop! #1", pages: 36, wide: true },
  { slug: "star-wars-1", title: "Star Wars #1", pages: 36 },
  { slug: "blue-bolt-1", title: "Blue Bolt #1", pages: 68, trim: [7.5, 10.5] },
  { slug: "spawn-1", title: "Spawn #1", pages: 40 },
  { slug: "twisted-tales-2", title: "Twisted Tales #2", pages: 36 },
  { slug: "doctor-strange-1", title: "Doctor Strange #1", pages: 36 },
  { slug: "four-color-373", title: "Four Color #373 — Sergeant Preston of the Yukon", pages: 36, trim: [7.3125, 10.5] },
  { slug: "batman-423", title: "Batman #423", pages: 36 },
  { slug: "mister-miracle-9", title: "Mister Miracle #9", pages: 36, wide: true },
  { slug: "punisher-2099-1", title: "Punisher 2099 #1", pages: 36, stock: "card", foil: "blue" },
  { slug: "daredevil-181", title: "Daredevil #181", pages: 52 },
  { slug: "robotech-macross-7", title: "Robotech: The Macross Saga #7", pages: 36 },
  { slug: "love-and-rockets-1", title: "Love and Rockets #1", pages: 36, trim: [8.5, 11] },
  { slug: "crime-does-not-pay-48", title: "Crime Does Not Pay #48", pages: 68, trim: [7.5625, 10.5] },
  { slug: "iron-man-278", title: "Iron Man #278 — Operation: Galactic Storm, Part 6", pages: 36 },
  { slug: "robin-ii-1", title: "Robin II: The Joker’s Wild! #1", pages: 36 },
  { slug: "western-love-2", title: "Western Love #2", pages: 52, trim: [7.25, 10.25] },
  { slug: "the-savage-dragon-1", title: "The Savage Dragon #1", pages: 40 },
  { slug: "yellowjacket-comics-1", title: "Yellowjacket Comics #1", pages: 52, trim: [7.5, 10.5] },
  { slug: "black-panther-1", title: "Black Panther #1", pages: 36 },
  { slug: "bloodshot-1", title: "Bloodshot #1", pages: 40, stock: "card", chromium: true },
  { slug: "superman-82", title: "Superman #82 — Back for Good!", pages: 44 },
  { slug: "green-lantern-58", title: "Green Lantern #58", pages: 36, wide: true },
  { slug: "strange-suspense-stories-27", title: "Strange Suspense Stories #27", pages: 36, trim: [7.0625, 10.5] },
  { slug: "x-men-15", title: "X-Men #15 — X-Cutioner’s Song, Part 7", pages: 36 },
  { slug: "cry-for-dawn-9", title: "Cry for Dawn #9", pages: 44 },
  { slug: "doom-patrol-92", title: "The Doom Patrol #92", pages: 36, wide: true },
  { slug: "terry-and-the-pirates-26", title: "Terry and the Pirates #26", pages: 36, trim: [7.25, 10.5] },
  { slug: "marvel-premiere-15", title: "Marvel Premiere #15 — Iron Fist", pages: 36 },
  { slug: "flash-71", title: "The Flash #71 — The Criminal Element!", pages: 36 },
  { slug: "cartune-land-1", title: "Cartune Land #1", pages: 36 },
  { slug: "amazing-spider-man-300", title: "The Amazing Spider-Man #300", pages: 52 },
  { slug: "baffling-mysteries-14", title: "Baffling Mysteries #14", pages: 36, trim: [7.5625, 10.5] },
];

const unit = 2.25 / 10.25;
const coverCaliper = { paper: 0.23, card: 0.52, overlay: 0.37 };
export const issues = editions.map(edition => {
  const stock = edition.stock ?? "paper";
  const path = `/3d/comics/${edition.slug}`;
  const [width, height] = edition.trim ?? [edition.wide ? 6.875 : 6.625, 10.25];
  const caliper = (edition.pages - 4) / 2 * 0.065 + coverCaliper[stock];
  return {
    ...edition,
    stock,
    width: width * unit,
    height: height * unit,
    bag: (edition.bagWidth ?? (width > 6.75 ? width + 0.25 : 6.875)) * unit,
    half: caliper * unit / (2 * 25.4),
    compliance: (36 / edition.pages) * (stock === "card" ? 0.74 : stock === "overlay" ? 0.88 : 1),
    image: path + ".webp",
    back: path + "-back.webp",
  };
});
export type Issue = (typeof issues)[number];

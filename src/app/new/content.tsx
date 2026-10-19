// Content for new.rghv.ca. Adapted from the copy on rghv.ca, trimmed to fit the
// quieter layout. Every work image in /public is 2880x1620, so the carousel and
// hover previews share one aspect ratio.

// External links inside running text: slightly greyer than the body, black on
// hover — same quiet interaction as the page headings, no cursor frame.
function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a className="nv-inline-link" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

export const introParagraphs: React.ReactNode[] = [
  <>I&apos;m 18 years old, born and raised in Calgary, Canada.</>,
  <>
    Four years ago, I began learning design independently through the internet,
    refining my approach through practice and iteration.
  </>,
  <>
    Currently designing at{" "}
    <TextLink href="https://vercel.com/home">Vercel</TextLink>, where I&apos;m
    learning from the best design team in the world, working on developer and
    enterprise tools.
  </>,
  <>
    This fall, I&apos;m starting my second year at the University of Waterloo,
    studying Global Business and Digital Arts.
  </>,
  <>
    I&apos;m especially drawn to early-stage products and well-crafted tools
    for creators and teams. I value intentional decisions, intuitive
    interfaces, and high-quality execution.
  </>,
];

export type NavLink = {
  label: string;
  href: string; // "" = the site root (work)
  col: 0 | 1 | 2 | 3;
};

// The top nav doubles as column markers: each section's content left-aligns
// with its own button. About sits at the far left and only runs up to the
// photo column; the rest extend to the right edge. `href` is relative to the
// section root. Served from rghv.ca the shell prefixes these with /new;
// served from new.rghv.ca the host rewrite makes /new implicit, so they're
// used bare. See shell.tsx.
export const navLinks: NavLink[] = [
  { label: "Raghav Agarwal", href: "", col: 0 },
  { label: "Photo", href: "/photo", col: 1 },
  { label: "Work", href: "/work", col: 2 },
  { label: "Entries", href: "/entries", col: 3 },
];

export const externalLinks = [
  { label: "Email", href: "mailto:rghvagwl@gmail.com" },
  { label: "LinkedIn", href: "https://linkedin.com/in/rghv-agrwl" },
  { label: "X", href: "https://x.com/raghaav" },
];

export type WorkProject = {
  id: string;
  title: string;
  year: string | null;
  /** Internal sort date, ISO (YYYY-MM-DD). Display still uses `year`. */
  date: string | null;
  images: string[];
};

// Sorted below by internal `date`, newest first; undated entries keep
// their written order at the end. Display shows only `year`.
const workProjectsSource: WorkProject[] = [
  {
    id: "vercel-2026",
    title: "Vercel",
    year: "2026",
    date: "2026-08-01",
    images: [
      "/vercel/Vercel 1.png",
      "/vercel/Vercel 2.png",
      "/vercel/Vercel 3.png",
      "/vercel/Vercel 4.png",
      "/vercel/Vercel 5.png",
    ],
  },
  {
    id: "ando",
    title: "Ando",
    year: "2026",
    date: "2026-05-01",
    images: ["/ando/Ando 1.png", "/ando/Ando 2.png", "/ando/Ando 3.png"],
  },
  {
    id: "chrono",
    title: "Chrono",
    year: "2026",
    date: "2026-03-01",
    images: ["/chrono/Chrono 1.webp", "/chrono/Chrono 2.webp"],
  },
  {
    id: "socratica",
    title: "Socratica",
    year: "2025",
    date: "2025-11-01",
    images: ["/socratica/Socratica 1.webp", "/socratica/Socratica 2.webp"],
  },
  {
    id: "tembo",
    title: "Tembo",
    year: "2026",
    date: "2026-04-01",
    images: ["/tembo/Tembo 1.png", "/tembo/Tembo 2.png"],
  },
  {
    id: "context",
    title: "Context",
    year: "2025",
    date: "2025-01-01",
    images: [
      "/context/Context 1.webp",
      "/context/Context 2.webp",
      "/context/Context 3.webp",
      "/context/Context 4.webp",
      "/context/Context 5.webp",
      "/context/Context 6.webp",
    ],
  },
  {
    id: "instafleet",
    title: "Instafleet",
    year: "2025",
    date: "2025-01-01",
    images: [
      "/instafleet/Instafleet 1.webp",
      "/instafleet/Instafleet 2.webp",
      "/instafleet/Instafleet 3.webp",
    ],
  },
  {
    id: "merge-club",
    title: "Merge",
    year: "2025",
    date: "2025-01-01",
    images: [
      "/merge club/Merge 1.webp",
      "/merge club/Merge 2.webp",
      "/merge club/Merge 3.webp",
      "/merge club/Merge 4.webp",
    ],
  },
  {
    id: "on-deck-founders",
    title: "ODF",
    year: "2025",
    date: "2025-01-01",
    images: [
      "/on deck founders/ODF 1.webp",
      "/on deck founders/ODF 2.webp",
      "/on deck founders/ODF 3.webp",
      "/on deck founders/ODF 4.webp",
    ],
  },
  {
    id: "prism-collective",
    title: "Prism Collective",
    year: "2025",
    date: "2025-09-01",
    images: ["/prism collective/Prism 1.webp", "/prism collective/Prism 2.webp"],
  },
  {
    id: "unordinary",
    title: "Unordinary",
    year: "2024",
    date: "2024-01-01",
    images: [
      "/unordinary/Unordinary 1.webp",
      "/unordinary/Unordinary 2.webp",
      "/unordinary/Unordinary 3.webp",
      "/unordinary/Unordinary 4.webp",
      "/unordinary/Unordinary 5.webp",
      "/unordinary/Unordinary 6.webp",
      "/unordinary/Unordinary 7.webp",
      "/unordinary/Unordinary 8.webp",
    ],
  },
  {
    id: "crisped",
    title: "Crisped",
    year: "2024",
    date: "2024-01-01",
    images: [
      "/crisped/Crisped 1.webp",
      "/crisped/Crisped 2.webp",
      "/crisped/Crisped 3.webp",
    ],
  },
  {
    id: "zero-email",
    title: "Zero",
    year: "2024",
    date: "2024-01-01",
    images: ["/zero email/Zero 1.webp", "/zero email/Zero 2.webp"],
  },
  {
    id: "minimum",
    title: "Minimum",
    year: "2022",
    date: "2022-01-01",
    images: [
      "/minimum/Minimum 1.webp",
      "/minimum/Minimum 2.webp",
      "/minimum/Minimum 3.webp",
      "/minimum/Minimum 4.webp",
      "/minimum/Minimum 5.webp",
      "/minimum/Minimum 6.webp",
    ],
  },
  {
    id: "faktor",
    title: "Faktor",
    year: "2022",
    date: "2022-01-01",
    images: ["/faktor/Name.webp", "/faktor/Name-1.webp", "/faktor/Name-2.webp"],
  },
  {
    id: "para",
    title: "Para",
    year: "2022",
    date: "2022-01-01",
    images: ["/para/Para 1.webp", "/para/Para 2.webp"],
  },
  {
    id: "no-category",
    title: "Miscellaneous",
    year: null,
    date: null,
    images: [
      "/uncategorized/Human 1.webp",
      "/uncategorized/Other 1.webp",
      "/uncategorized/Other 2.webp",
      "/uncategorized/Other 3.webp",
      "/uncategorized/Other 4.webp",
      "/uncategorized/Other 5.webp",
      "/uncategorized/Verse 1.webp",
      "/uncategorized/Verse 2.webp",
    ],
  },
  {
    id: "dummy-1",
    title: "Dummy 1",
    year: null,
    date: null,
    images: ["/vercel/Vercel 3.png", "/vercel/Vercel 4.png"],
  },
  {
    id: "dummy-2",
    title: "Dummy 2",
    year: null,
    date: null,
    images: ["/ando/Ando 1.png", "/ando/Ando 2.png"],
  },
  {
    id: "dummy-3",
    title: "Dummy 3",
    year: null,
    date: null,
    images: ["/vercel/Vercel 1.png", "/vercel/Vercel 2.png"],
  },
  {
    id: "dummy-4",
    title: "Dummy 4",
    year: null,
    date: null,
    images: ["/vercel/Vercel 3.png", "/vercel/Vercel 4.png"],
  },
  {
    id: "dummy-5",
    title: "Dummy 5",
    year: null,
    date: null,
    images: ["/ando/Ando 1.png", "/ando/Ando 2.png"],
  },
  {
    id: "dummy-6",
    title: "Dummy 6",
    year: null,
    date: null,
    images: ["/vercel/Vercel 1.png", "/vercel/Vercel 2.png"],
  },
  {
    id: "dummy-7",
    title: "Dummy 7",
    year: null,
    date: null,
    images: ["/vercel/Vercel 3.png", "/vercel/Vercel 4.png"],
  },
  {
    id: "dummy-8",
    title: "Dummy 8",
    year: null,
    date: null,
    images: ["/ando/Ando 1.png", "/ando/Ando 2.png"],
  },
  {
    id: "dummy-9",
    title: "Dummy 9",
    year: null,
    date: null,
    images: ["/vercel/Vercel 1.png", "/vercel/Vercel 2.png"],
  },
  {
    id: "dummy-10",
    title: "Dummy 10",
    year: null,
    date: null,
    images: ["/vercel/Vercel 3.png", "/vercel/Vercel 4.png"],
  },
];

export const workProjects: WorkProject[] = [...workProjectsSource].sort(
  (a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0; // stable: undated keep written order
  },
);

export type Entry = {
  id: string;
  title: string;
  year: string;
  paragraphs: string[];
};

export const entries: Entry[] = [
  {
    id: "start",
    title: "Start",
    year: "2026",
    paragraphs: [
      "I just got back from San Francisco and this is something I don't want to forget. Being there and meeting people around my age who were already building things made something really clear. It wasn't that they had everything figured out or that their ideas were perfect. Most of it was still rough. But they had started.",
      "Before this, I spent a lot of time thinking. Planning things out, trying to make sure everything made sense before I began. I told myself I was being intentional, but most of the time it was just hesitation.",
      "Seeing it up close made the gap obvious. It wasn't intelligence or access or experience. It was a willingness to act without needing everything to be clear first. The people who were moving weren't overanalyzing every step. They were just doing, and figuring it out as they went.",
      "I don't want to forget how obvious that felt. Overthinking doesn't move anything forward. It just keeps you in the same place, convincing yourself you're making progress when you're not. Weeks can pass like that.",
      "There isn't a perfect moment where everything aligns. There's just a point where you decide to begin. Even if it's unclear. Even if it's rough. Just start.",
    ],
  },
  {
    id: "living-without-regrets",
    title: "Living Without Regrets",
    year: "2025",
    paragraphs: [
      "A few months ago, a friend and I were walking home from the gym when he asked me what my biggest regrets were. It caught me off guard, but I answered honestly.",
      "I told him I wished I had tried harder academically in high school. That maybe I should have taken a more traditional path. I regretted saying no to certain opportunities. I regretted hesitating when I should have leaned in.",
      "He shared some of his own. Different details, same feeling. But he ended with something simple.",
      "I don't think it's good to regret anything.",
      "It sounded unrealistic. Of course there are things to regret.",
      "But maybe that's the point.",
      "The decisions I regret were made based on who I was at the time. My confidence, my fears, my understanding of risk. It's easy to say I should have known better, but I only know better because it happened.",
      "Regret assumes there was a cleaner path. A better decision. A more optimal version of events. Maybe there was.",
      "But that clarity only exists in hindsight.",
      "You can look back and see what you missed. The risks you didn't take. The options you didn't choose. Everything feels obvious now, but it wasn't obvious then.",
      "You made decisions with the perspective you had. Your priorities, your insecurities, your understanding of the world. Expecting your past self to think like you do now doesn't make sense. The growth came from going through it.",
      "The relationship that didn't last shapes how you understand people. The path that felt uncertain gives you a perspective you wouldn't trade. The opportunities you turned down clarify what actually matters to you.",
      "None of it is neutral. It leaves something behind.",
      "Regret assumes a different choice would have led to a better outcome. Maybe it would have. But it also would have led to a different version of you. And there's no guarantee that version would feel more right than the one you are now.",
      "I've started to think of my past less as a series of right and wrong decisions, and more as a sequence of necessary ones. Not perfect, not always efficient, but necessary.",
      "The clarity I have now wasn't available to me then. It had to be earned.",
      "Living without regret doesn't mean everything worked out. It means recognizing that even the missteps carried something with them. They sharpened your standards. They revealed what you value. They expanded your limits.",
      "You don't need to rewrite your past to feel at peace with it.",
      "You just need to recognize that it built you.",
      "If it shapes how you move today, then it wasn't wasted.",
    ],
  },
  {
    id: "elitism",
    title: "Elitism",
    year: "2025",
    paragraphs: [
      "It was not always obvious at first. People would ask the normal questions. What program are you in? What do you do? Are you in co-op? What internships are you applying for? But after a while, I started to feel like some conversations were less about genuine interest and more about figuring out where someone stood.",
      "Small pieces of information could change the entire tone. Someone would seem half-interested at first, then suddenly become more engaged once they heard something they thought was impressive. Other times, the energy would drop once they decided you were not relevant to whatever world they were trying to be part of.",
      "That was probably the part that bothered me most. Not the ambition, or even the elitism itself, but the lack of real curiosity. It felt like people were not always asking questions because they wanted to know you. They were asking to place you.",
      "At first, I took it personally. It made me wonder if I was being seen a certain way because of my program, my experience, or what people assumed about me. It was hard not to internalize that, especially in a place where so much of people's identity is tied to what they do.",
      "But over time, I realized a lot of it comes from the environment. Waterloo is competitive. People are constantly thinking about co-op, internships, status, companies, and what comes next. When you're surrounded by that for long enough, it makes sense that people start seeing themselves and others through that lens.",
      "I don't think most people mean to be fake or judgmental. A lot of it feels learned. But it still creates this strange social dynamic where conversations can feel like evaluations instead of actual conversations.",
      "The friendships that lasted felt different. They did not feel like I had to qualify myself first. There was no hidden calculation behind the conversation. It was just people being curious, joking around, talking honestly, and actually wanting to know each other.",
      "Looking back, I'm glad I noticed it early. It helped me understand what kind of interactions I value. I want to be around people who are ambitious, but still genuine. People who care about what you do, but do not make it the only reason they care about you.",
    ],
  },
  {
    id: "term-1a",
    title: "Term 1A",
    year: "2025",
    paragraphs: [
      "At first, it was easy to gain an ego. Being around ambitious people, doing things on your own, feeling like you're building momentum. But at the same time, it's just as easy to get humbled. There's such a wide range of talent and ability that it balances out quickly.",
      "I think I learned how to sit somewhere in between. Staying grounded in what I believe in, while still being confident in what I can do.",
      "I also stopped judging people as much. Everyone is moving at a different pace, figuring out different things. Not everyone is at the same place, and that became more obvious the longer I was there.",
      "At some point, I started to lose my sense of identity a bit. Being in a program I didn't fully resonate with, while being surrounded by people in completely different paths, made me question where I fit. It messed with me more than I expected. But over time, I realized that identity doesn't have to come from school. It's easy to let it define you, but it doesn't have to. You can build something outside of it, alongside it.",
      "Being away from home also made me realize how much I value the people I grew up around. It's easy to take those relationships for granted when they're always there. But distance changes that. It takes effort to stay in touch, to call, to keep those connections strong. I started to appreciate my family more. Calling my parents every day became something I valued, not something I felt obligated to do. The same goes for friends back home. It's harder to maintain those relationships, but it also makes you realize which ones matter.",
      "Another thing I kept coming back to was time. There's more of it than it feels like in the moment. It's easy to get stuck thinking about what you could have done differently, or trying to plan everything out. But that just takes away from actually doing anything. You can overestimate what you can do in a year, and underestimate what you can do in five. What matters more is what you do day to day.",
      "Ambition started to feel less fixed too. It's not something constant. It changes depending on where you are, what you're exposed to, and what you start to care about. I think I'm still figuring out what it means to me.",
      "One thing that became clearer is that there are good people everywhere. And it doesn't take long to recognize who you want to be around. First impressions aren't everything, but they do tell you something. The people I've kept around are the ones that feel genuine. No pressure, no need to prove anything. Just normal conversations.",
      "I don't think I have everything figured out. But I feel less pressure to. There's time to figure it out.",
    ],
  },
];

export type Photo = {
  src: string;
  width: number;
  height: number;
  caption?: string;
};

// The photo set on /new/photo. Any mix of sizes and aspect ratios works; the
// page reads only from here.
export const photos: Photo[] = [
  { src: "/photo/coast-ridge.webp", width: 2000, height: 1125 },
  { src: "/photo/bay-bridge-pier.webp", width: 2000, height: 1500 },
  { src: "/photo/cafe-window.webp", width: 2000, height: 1333 },
  { src: "/photo/city-hall-dusk.webp", width: 2000, height: 1127 },
  { src: "/photo/california-st.webp", width: 2000, height: 1500 },
  { src: "/photo/hill-pink-sky.webp", width: 2000, height: 1125 },
  { src: "/photo/wells-fargo.webp", width: 2000, height: 1333 },
  { src: "/photo/carplay.webp", width: 2000, height: 1127 },
  { src: "/photo/silhouette-sunset.webp", width: 2000, height: 1500 },
];

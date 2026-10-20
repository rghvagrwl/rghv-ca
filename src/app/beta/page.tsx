import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "beta | raghav agarwal",
  description: "A beta workspace for the next version of rghv.ca.",
};

const betaNotes = [
  "New version in progress",
  "Design direction open",
  "Content and structure can move",
] as const;

export default function BetaPage() {
  return (
    <main className="site-shell min-h-screen bg-background text-black/80">
      <div className="container-frame flex min-h-[calc(100vh-var(--site-main-top)-var(--site-main-bottom))] flex-col">
        <header className="grid site-wide-grid-gap border-b border-black/10 pb-2 site-ui-text font-medium uppercase tracking-[0.05em] min-[940px]:grid-cols-3">
          <a href="/" className="transition-colors hover:text-black/45">
            Raghav Agarwal
          </a>
          <span className="text-black/45">rghv.ca/beta</span>
          <span className="min-[940px]:text-right">Next version</span>
        </header>

        <section className="grid flex-1 site-wide-grid-gap py-[clamp(48px,8vw,180px)] min-[940px]:grid-cols-3">
          <div className="relative min-h-[44vh] overflow-hidden bg-black/5 min-[940px]:min-h-0">
            <Image
              src="/profile.webp"
              alt="Raghav on Baker Beach, San Francisco"
              fill
              priority
              sizes="(max-width: 940px) 100vw, 33vw"
              className="object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-end min-[940px]:col-span-2">
            <p className="site-ui-text font-medium uppercase tracking-[0.05em] text-black/45">
              Beta
            </p>
            <h1 className="mt-2 max-w-none text-[clamp(72px,18vw,320px)] font-medium leading-[0.82] text-black">
              New site
            </h1>

            <div className="mt-[clamp(28px,4vw,72px)] grid site-grid-gap border-t border-black/10 pt-2 min-[720px]:grid-cols-3">
              {betaNotes.map((note) => (
                <p
                  key={note}
                  className="site-body-text leading-[1.35] text-black/80"
                >
                  {note}
                </p>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-black/10 pt-2 site-ui-text uppercase tracking-[0.05em] text-black/45">
          <span>Temporary beta route</span>
        </footer>
      </div>
    </main>
  );
}

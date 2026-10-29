import type { Article, ArticleBlock } from "./articles";

const paragraph = (id: string, text: string): ArticleBlock => ({ type: "paragraph", id, parts: [text] });
const section = (id: string, title: string): ArticleBlock => ({ type: "section", id, title });
const subsection = (id: string, title: string): ArticleBlock => ({ type: "subsection", id, title });
const divider = (id: string): ArticleBlock => ({ type: "divider", id });

export const notesOnDesign: Article = {
  id: "notes-on-design",
  title: "Notes on design",
  date: "October 28, 2026",
  listDate: "Oct 2026",
  blocks: [
    paragraph("intro-1", "I've spent an embarrassing amount of time rebuilding this website. I'll change the layout, feel good about it for a few days, then come across somebody else's site and start questioning decisions I thought I'd already made. Sometimes I open Figma to move one thing and end up reconsidering the whole page. I'm not sure how much of that time has actually made the site better."),
    paragraph("intro-2", "I've been designing since I was thirteen, mostly learning through the internet and trying to understand work I admired. Five years later, I'm much better at recognizing what I like. I'm also more aware of how much of that taste comes from spending time in the same corners of the internet as other designers. I keep wondering whether I'm making the work I want to make, or just becoming good at making work I know they'll recognize."),
    paragraph("intro-3", "That's where this started. I've also been thinking about what counts as progress when making things gets easier, why I care about details nobody will notice, and how often I imagine the portfolio page before I've made the project. I don't have a neat theory that ties all of it together. I wanted to write down what I actually think right now, before I change my mind again."),

    divider("divider-1"),
    section("heading-1", "The danger of knowing what good looks like"),
    paragraph("references-1", "I don't keep a very organized collection of references. I remember site names, photographs, interfaces, bits of typography, and sometimes just the feeling of something I saw years ago. When I find it again, I might still love it or wonder what I saw in it. Either way, a surprising amount of it stays in my head while I'm working."),
    paragraph("references-2", "That was how I learned. When I first opened Figma, I'd try to recreate things I found interesting without really knowing why they worked. Looking closely at somebody else's choices taught me more than staring at an empty canvas. I still think studying good work is one of the best ways to get better. The trouble is that after a while I started recognizing certain choices so quickly that I could make them without thinking very hard."),
    paragraph("references-3", "I'll begin with a problem I haven't solved before and a few familiar solutions will show up almost immediately. Maybe I remember where I saw them, maybe I don't. Before I've properly considered what this particular thing needs, I have a fairly clear picture of what a good version of it could look like. That's useful when I'm stuck. It's less useful when the picture is doing the thinking for me."),
    paragraph("references-4", "I notice it when I look at work I don't especially like, too. My first instinct is often to simplify it, change the type, or give it the visual character I already prefer. Maybe that would improve it. Maybe I'd also remove the part that made it interesting because I didn't understand what the person was trying to do. It's easy to mistake familiarity with a solution for proof that it's the right one."),
    paragraph("references-5", "I don't want to stop looking at other people's work. I like seeing what sticks with me, and I doubt I could separate my taste from those influences even if I wanted to. I do want to pause before reaching for them. Sometimes I should try an idea while it's still a little vague, before I'm reminded of the polished version somebody else already made."),

    subsection("heading-2", "Originality is a strange ambition"),
    paragraph("originality-1", "For a while I thought the answer was to avoid anything that looked familiar. I'd reject a direction I liked because I'd seen something similar, then spend hours finding a stranger one that wasn't necessarily better. Other people's work was still making the decision for me; I was just moving away from it instead of toward it."),
    paragraph("originality-2", "The things I remember most often come from somebody following a very particular interest further than most people would bother to. They aren't always inventing a new visual language. They've spent enough time with the idea that their point of view starts to show. I'd rather become more curious about things than spend the next ten years trying to make every project look distinctively mine. If there's a style in my work, it can turn up on its own."),

    divider("divider-2"),
    section("heading-3", "The work begins before the work"),
    paragraph("work-1", "For a long time, progress in design was easy to see. I'd spend an afternoon in Figma and end up with something that looked better than it did when I started. I still enjoy that feeling, but I've spent enough evenings polishing ideas I wasn't particularly interested in to know that a better-looking result isn't always a better project."),
    paragraph("work-2", "The tools make this even stranger now. I've used AI throughout the process of building this site, and honestly, it's been a lot of fun. I can try an interaction that would've taken me much longer to build on my own and see it working the same afternoon. I don't feel the need to defend the difficulty of doing things the old way. I learned tools because I wanted to make things, not because I thought the tools were the point."),
    paragraph("work-3", "But an idea can look finished before I've really thought about it. I can start with something half-formed, ask for a version, and keep asking for improvements. Every pass looks more convincing. After a few hours I might have a good-looking thing and still be unable to explain why I wanted it in the first place. I was enjoying making it more than I cared about what I was making."),
    paragraph("work-4", "That isn't always a problem. Some of the most useful things I've made started as experiments without much purpose. I just want to be able to tell when I'm exploring because I'm curious and when I'm continuing because the next version is so easy to produce."),

    subsection("heading-4", "The most expensive decision is the one you never make"),
    paragraph("decisions-1", "When something feels off, my instinct is to make another version. Sometimes that's exactly what I need. Other times I have no idea what's wrong, and generating alternatives is easier than sitting with that uncertainty. If each version takes very little time, I can put off the harder question for ages."),
    paragraph("decisions-2", "I've been trying to stop before the next iteration and say what I actually want to change. If I can't explain it, another option might help me find the answer, but it might also give me one more thing to compare. I'm not particularly good at knowing when to stop yet. The ability to make ten versions feels less useful if I can't choose one."),

    divider("divider-3"),
    section("heading-5", "If you won't care, who will?"),
    paragraph("details-1", "I've spent entire afternoons adjusting things most people will never notice. I know some of that time could have gone elsewhere. Still, I don't like the idea that a detail matters less because nobody consciously points it out. A page can feel obvious in its final form because somebody spent a long time on choices that have become invisible."),
    paragraph("details-2", "I think about that while working on this site. A tiny change to the timing of an interaction can make me much happier with it, even if I couldn't prove that it would change anybody else's experience. Some refinements do make the work better. Others probably just satisfy me. I'm not always able to tell which is which while I'm doing them, and I don't think I have to pretend otherwise."),
    paragraph("details-3", "There does have to be a point where I stop. This website is good evidence that caring about details can also become a way of avoiding publication. But I don't want to become so efficient that I lose the part of design I actually enjoy: taking something small seriously enough to keep working on it after the obvious problems are gone."),

    subsection("heading-6", "Effort has a value of its own"),
    paragraph("effort-1", "I don't think doing something the hard way makes it more virtuous. There are plenty of tedious tasks I'd happily automate. I do think that struggling with a problem sometimes changes what I understand about it. I've spent hours trying to work out why a layout felt wrong, only to return to an earlier version. The result wasn't dramatically different, but I knew more about it by then."),
    paragraph("effort-2", "That's the part I don't want to give up as tools become more capable. Not every difficulty deserves my time, and I'm still figuring out which ones do. Sometimes the fastest way to a good result is enough. Other times I want to stay with the problem a little longer, even if a tool could hand me a plausible answer before lunch."),

    divider("divider-4"),
    section("heading-7", "Your portfolio is designing you"),
    paragraph("portfolio-1", "Before I've made much progress on a project, I sometimes start imagining how it'll look on my website. I think about the screenshots, the explanation, which part will show what I can do. Occasionally I'm designing the case study before I've designed the thing. That's a strange habit to have, but sharing work online helped me find opportunities as a teenager, so I understand where it came from."),
    paragraph("portfolio-2", "I care about my career and I want people to see my work. I'm not going to pretend otherwise. What worries me is the point where the portfolio stops recording what I chose to make and starts choosing for me. I've passed over ideas I genuinely wanted to explore because I couldn't imagine them becoming impressive projects. I've also started things because I could imagine other designers admiring the finished page."),
    paragraph("portfolio-3", "There's a difference between wanting to make something and wanting to be the person who made it. I've felt both. The second can produce good work too, but I notice myself becoming more anxious about whether it's original or worth sharing. I wonder what I'd make if I knew nobody was going to see it. I don't want to stop sharing; I'd just like to have a better answer to that question. My site should have room for things that never become case studies."),

    divider("divider-5"),
    section("heading-8", "The problem with sounding convincing"),
    paragraph("writing-1", "Writing this has been uncomfortable in a useful way. I'll start a paragraph certain that I have a point, then discover I can't explain it without borrowing language I've heard somewhere else. Occasionally a sentence sounds good enough that I want to keep it, even after I realize it hasn't said much. It reminds me of how easy it is to make an interface look polished before I've worked out what it needs to do."),
    paragraph("writing-2", "I can also make a pretty convincing explanation for a design choice after I've already made it. Sometimes I picked a direction because I liked it. I don't think that's a bad reason; intuition is part of the work. I just don't want to confuse the story I tell afterward with the reasoning that actually got me there. Being able to defend a choice isn't the same as understanding it."),
    paragraph("writing-3", "I've started asking myself what would make me change my mind about a direction. If I can't imagine an answer, I might be too attached to it to evaluate it properly. That doesn't mean every decision needs a research paper behind it. Sometimes I try something because it seems interesting, and only later can I explain why it works. I'd rather say that than pretend the final result was inevitable."),

    divider("divider-6"),
    section("heading-9", "What I'd like to get better at"),
    paragraph("next-1", "For the past five years, I mostly wanted to get better at design, make work I was proud of, and work with people I admired. I still want those things. Lately I've become more curious about what happens before someone opens Figma: why an idea is worth pursuing, what makes somebody care about it, and how a project changes once other people start using it."),
    paragraph("next-2", "That's part of what draws me to building Taraf, a small creative studio I'm starting. I want to be involved in more than the final execution of somebody else's idea. I want to understand how the parts fit together, and I expect some of my assumptions about running a studio will be wrong. I'm early enough that finding that out is part of the appeal."),
    paragraph("next-3", "At the same time, I don't want every interest to become a business or a portfolio piece. I'd like to make things for less defensible reasons too: because something caught my attention, because I want to learn a skill, or because I want to see whether an idea can exist. I want to take the work seriously without needing all of it to be serious."),

    divider("divider-7"),
    section("heading-10", "Anyway"),
    paragraph("ending-1", "I started this because I was spending too much time rebuilding my website and wanted to know why I kept changing my mind. I still don't have a clean answer. I like looking at other people's work, I like making things look and feel right, and I care about how my work comes across. None of that is going away. I just want to notice when those habits start making decisions for me."),
    paragraph("ending-2", "I'm eighteen. I imagine I'll come back to this in a few years and disagree with parts of it; I'd be a little disappointed if I didn't. For now I want to spend more time making things I don't already know how to present, and a little less time asking whether they'll look good on this website. The site can probably survive a few weeks without another redesign."),

    divider("divider-ending"),
    {
      type: "smallText",
      id: "closing-context",
      paragraphs: [
        "I'm still early in my career, and five years of designing hasn't made me an authority on any of this. These are thoughts from my own work and from the things I've been questioning lately. I don't expect anyone else to follow them, and I don't expect to agree with all of them forever.",
        "I've learned a lot from reading how other people think about their work, so I wanted to put some of my own thinking out there too. Take whatever is useful, disagree with the rest, and maybe I'll do the same when I read this again later.",
      ],
    },
  ],
  notes: [],
};

type Scrub = (index: number, phase: "start" | "move" | "end") => void;
type Paint = (index: number) => void;

// The ruler and scene run on the same frame without rerendering React.
export class ShelfRail {
  private position: number;
  private paint: Paint | null = null;
  scrub: Scrub | null = null;
  jump: Paint | null = null;
  constructor(index: number) { this.position = index; }
  get index() { return this.position; }

  report(index: number) {
    if (index === this.position) return;
    this.position = index;
    this.paint?.(index);
  }

  connectScene(scrub: Scrub) {
    this.scrub = scrub;
    this.jump = index => scrub(index, "end");
    this.paint?.(this.index);
    return () => {
      if (this.scrub !== scrub) return;
      this.jump = this.scrub = null;
      this.paint?.(this.index);
    };
  }

  connectRuler(paint: Paint) {
    this.paint = paint;
    paint(this.index);
    return () => { if (this.paint === paint) this.paint = null; };
  }
}

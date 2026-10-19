import AboutText from "./about-text";
import SiteFooter from "./footer-stats";

// The about text is the site's landing page: one continuous block of text
// that expands inline as you click through it (ported from /v3).

export default function NewHome() {
  return (
    <div className="nv-page">
      <div className="nv-col nv-about" data-col="0">
        <AboutText />
        <SiteFooter />
      </div>
    </div>
  );
}

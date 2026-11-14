import Link from "next/link";
import type { ReactNode } from "react";
import { Chevron } from "../../canvas/list-row";
import theme from "../../canvas/theme.module.css";
import styles from "./study.module.css";

export default function StudyLayout({ children }: { children: ReactNode }) {
  return <div className={`${theme.surface} ${styles.study}`} data-canvas-site="study">
    {children}
    <Link className={styles.back} href="/3d" aria-label="Back to 3D" data-study-back>
      <Chevron back />
      Back
    </Link>
  </div>;
}

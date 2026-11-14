import type { ReactNode } from "react";
import StudyNavigation from "./_study-navigation";

export default function Layout({ children }: { children: ReactNode }) {
  return <StudyNavigation>{children}</StudyNavigation>;
}

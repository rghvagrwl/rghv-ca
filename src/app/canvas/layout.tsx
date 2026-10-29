import { socialMetadata } from "../../lib/social-metadata";

export const metadata = socialMetadata("home");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

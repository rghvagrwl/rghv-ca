import { socialMetadata } from "../../../lib/social-metadata";

export const metadata = socialMetadata("work");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

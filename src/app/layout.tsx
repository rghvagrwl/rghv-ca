import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const switzer = localFont({
  variable: "--font-switzer",
  src: [
    {
      path: "../../public/fonts/switzer/Switzer-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../../public/fonts/switzer/Switzer-VariableItalic.woff2",
      style: "italic",
      weight: "100 900",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "rghv.ca",
  description:
    "A one-page personal website built section by section from Figma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${switzer.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

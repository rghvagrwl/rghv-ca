"use client";

// Deliberately plain: lists scroll natively, and the spacer below (see
// .nv-list-band in new.css) keeps the last rows clear of the veil.
export default function ListBand({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="nv-list-band">{children}</div>;
}

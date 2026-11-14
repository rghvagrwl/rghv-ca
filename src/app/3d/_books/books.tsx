"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, type ReactNode, useState } from "react";
import { editions, frontURL, initialBookIndex } from "./editions";
import ShelfRuler from "./shelf-ruler";
import { ShelfRail } from "./shelf-navigation";
import styles from "./books.module.css";

const BooksScene = dynamic(() => import("./books-scene"), { ssr: false });

function Plate({ ready = false }: { ready?: boolean }) {
  return <div className={styles.fallback} aria-label="Book covers" data-study-ready={ready ? "" : undefined}>
    {editions.map(e => <Image key={e.id} src={frontURL(e)} alt={e.title + " by " + e.author}
      width={Math.round(e.width)} height={Math.round(e.height)} unoptimized />)}
  </div>;
}

class SceneBoundary extends Component<{children: ReactNode}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Plate ready /> : this.props.children; }
}

export default function Books() {
  const [rail] = useState(() => new ShelfRail(initialBookIndex));
  const [ready, setReady] = useState(false);
  return <SceneBoundary>
    <BooksScene navigator={rail} onReady={setReady} />
    {ready && <ShelfRuler rail={rail} items={editions} label="Browse bookshelf" />}
    <noscript><Plate /></noscript>
  </SceneBoundary>;
}

import * as THREE from "three";
import { artFor, editions } from "./editions";
import { buildBook, createBookGrains, disposeBook, setBookOverview } from "./book-object";
import artwork from "./book-art-manifest.json";
import { createSpineContacts } from "./spine-contact";
import { bindPaperbackFlex } from "./paperback-flex";
import { bindSpineReveal, spineRevealDuration } from "./spine-reveal";

export const INITIAL_ART = [...artwork.coverSheets, ...artwork.spineSheets].map(sheet => sheet.url);

function prepare(texture: THREE.Texture, anisotropy: number) {
  if (texture.colorSpace !== THREE.SRGBColorSpace || texture.anisotropy !== anisotropy) {
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = anisotropy; texture.needsUpdate = true;
  }
}

type Tile = { sheet: number; x: number; y: number; w: number; h: number };
type Sheet = { width: number; height: number };
function tile(textures: THREE.Texture[], sheets: Sheet[], region: Tile) {
  const { sheet, x, y, w, h } = region;
  const { width, height } = sheets[sheet];
  // Per-panel UVs use the same backing texture on the GPU.
  const texture = textures[sheet].clone();
  texture.offset.set((x + 0.5) / width, (height - y - h + 0.5) / height);
  texture.repeat.set((w - 1) / width, (h - 1) / height);
  return texture;
}

type Ink = THREE.MeshStandardMaterial;
function inksUsing(model: THREE.Group, texture: THREE.Texture) {
  const inks = new Set<Ink>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && material.map === texture) inks.add(material);
    }
  });
  return Array.from(inks);
}

type Detail = {
  model: THREE.Group; textures: Set<THREE.Texture>; alive: boolean; inspected: boolean;
  spineInk: Ink[];
  pageBend: THREE.Vector2 | null;
  panels: { url: string; inks: Ink[] }[];
};

export function mountBooks(roots: THREE.Group[], art: THREE.Texture[], anisotropy: number, invalidate: () => void) {
  const loader = new THREE.TextureLoader();
  for (const texture of art) prepare(texture, anisotropy);
  const covers = art.slice(0, artwork.coverSheets.length);
  const spines = art.slice(artwork.coverSheets.length);
  const grains = createBookGrains();
  const contacts = createSpineContacts(roots, editions);
  const introGround = { value: new THREE.Color() };
  let disposed = false;
  const books = editions.map((edition, i) => {
    const data = artFor(edition.id);
    const spine = tile(spines, artwork.spineSheets, data.spineTile);
    const front = tile(covers, artwork.coverSheets, data.frontTile);
    const back = tile(covers, artwork.coverSheets, data.backTile);
    const binding = buildBook(edition, front, spine, back, grains, true);
    roots[i].add(binding);
    const spineInk = inksUsing(binding, spine);
    contacts.apply(i, spineInk);
    const revealTime = { value: 0 };
    bindSpineReveal(binding, edition, spine, revealTime, introGround);
    return { data, spine, front, back, binding, spineInk, revealTime,
      sharpSpine: null as THREE.Texture | null, active: false, detail: null as Detail | null };
  });

  // Fetch sharp spines nearest the camera, with one decode/upload in flight.
  const sharpOrder = new Set<number>();
  const unavailable = new Set<number>();
  let queue: number[] = [];
  let wanted = new Set<number>();
  let fetching = false;
  let selected = -1;
  let lastCenter = -1, lastLeft = -1, lastRight = -1;

  const reveals = new Map<number, number>();
  let showCases = false;

  function isSpineRevealed(index: number) {
    return books[index].revealTime.value === spineRevealDuration;
  }
  function updateSpinePrint(index: number) {
    const book = books[index];
    // Pencil and blur samples use the preview atlas's tile coordinates.
    // A downloaded standalone print becomes usable once those passes end.
    const print = isSpineRevealed(index) ? book.sharpSpine ?? book.spine : book.spine;
    for (const material of book.spineInk) material.map = print;
    if (book.detail) for (const material of book.detail.spineInk) material.map = print;
  }
  function setSpine(index: number, texture: THREE.Texture | null) {
    const book = books[index];
    book.sharpSpine?.dispose();
    book.sharpSpine = texture;
    updateSpinePrint(index);
  }
  function finishSpineReveal(index: number) {
    if (isSpineRevealed(index)) return;
    const book = books[index];
    book.revealTime.value = spineRevealDuration;
    reveals.delete(index);
    if (book.sharpSpine) updateSpinePrint(index);
    if (showCases) setBookOverview(book.binding, true);
  }
  function trimSpines() {
    const capacity = Math.max(10, wanted.size + 4);
    for (const index of sharpOrder) {
      if (sharpOrder.size <= capacity) break;
      if (wanted.has(index) || index === selected || books[index].active) continue;
      setSpine(index, null);
      sharpOrder.delete(index);
    }
  }
  async function nextSpine() {
    if (fetching || disposed) return;
    fetching = true;
    while (queue.length && !disposed) {
      const index = queue.shift()!;
      const book = books[index];
      if (book.sharpSpine || unavailable.has(index)) continue;
      try {
        const texture = await loader.loadAsync(book.data.spine);
        if (disposed || (!wanted.has(index) && index !== selected && !book.active)) {
          texture.dispose();
        } else {
          prepare(texture, anisotropy);
          setSpine(index, texture);
          sharpOrder.add(index);
          trimSpines();
          invalidate();
        }
      } catch { unavailable.add(index); }
    }
    fetching = false;
  }

  // Retain a small set of recently inspected books. The remaining shelf uses
  // the lower-cost closed case even after the reader has opened every book.
  const recent = new Set<number>();
  function release(index: number) {
    const book = books[index], detail = book.detail;
    if (!detail) return;
    detail.alive = false;
    detail.model.removeFromParent(); disposeBook(detail.model);
    detail.textures.forEach(t => t.dispose());
    book.detail = null;
    recent.delete(index);
  }
  function trim() {
    for (const index of recent) {
      if (recent.size <= 4) break;
      if (index !== selected && !books[index].active) release(index);
    }
  }
  function ensure(index: number) {
    const book = books[index];
    recent.delete(index); recent.add(index);
    if (book.detail) return book.detail;
    const model = buildBook(editions[index], book.front, book.spine, book.back, grains);
    const panels = [
      { url: book.data.front, inks: inksUsing(model, book.front) },
      { url: book.data.back, inks: inksUsing(model, book.back) },
    ];
    const spineInk = inksUsing(model, book.spine);
    contacts.apply(index, spineInk);
    const edition = editions[index];
    const pageBend = edition.binding === "paperback" ? bindPaperbackFlex(model, edition) : null;
    if (book.sharpSpine) for (const material of spineInk) material.map = book.sharpSpine;
    model.visible = book.active; roots[index].add(model);
    return book.detail = { model, textures: new Set<THREE.Texture>(), panels, spineInk, pageBend, alive: true, inspected: false };
  }
  async function load(detail: Detail, panel: Detail["panels"][number]) {
    let texture: THREE.Texture;
    try { texture = await loader.loadAsync(panel.url); } catch { return; }
    if (!detail.alive) { texture.dispose(); return; }
    prepare(texture, anisotropy); detail.textures.add(texture);
    panel.inks.forEach(material => { material.map = texture; });
    if (detail.model.visible) invalidate();
  }
  invalidate();
  return {
    beginSpineReveal(index: number, nowSeconds: number, delay = 0) {
      if (!isSpineRevealed(index) && !reveals.has(index)) reveals.set(index, nowSeconds + delay);
    },
    advanceSpineReveals(nowSeconds: number) {
      for (const [index, start] of reveals) {
        const elapsed = nowSeconds - start;
        if (elapsed >= spineRevealDuration) finishSpineReveal(index);
        else if (elapsed > 0) books[index].revealTime.value = elapsed;
      }
      return reveals.size > 0;
    },
    isSpineRevealed,
    finishSpineReveal,
    finishSpineReveals() { books.forEach((_, index) => finishSpineReveal(index)); },
    setIntroGround(color: THREE.Color) { introGround.value.copy(color); },
    updateSpineContacts: contacts.update,
    flex(index: number, bend: number, twist: number) {
      books[index].detail?.pageBend?.set(bend, twist);
    },
    setOverview(visible: boolean) {
      if (disposed) return;
      showCases = visible;
      books.forEach((book, index) => setBookOverview(book.binding, visible && isSpineRevealed(index)));
    },
    reveal(index: number, active: boolean) {
      const book = books[index];
      if (disposed || book.active === active || (active && !isSpineRevealed(index))) return;
      book.active = active; book.binding.visible = !active;
      if (active) ensure(index).model.visible = true;
      else if (book.detail) book.detail.model.visible = false;
      trim();
    },
    sharpen(center: number, left: number, right: number) {
      if (disposed || (center === lastCenter && left === lastLeft && right === lastRight)) return;
      lastCenter = center; lastLeft = left; lastRight = right;
      const indices = [];
      for (let i = Math.max(0, left - 1); i <= Math.min(books.length - 1, right + 1); i++) indices.push(i);
      indices.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
      wanted = new Set(indices);
      queue = indices;
      if (selected >= 0) queue.unshift(selected);
      for (const index of wanted) if (sharpOrder.delete(index)) sharpOrder.add(index);
      trimSpines();
      void nextSpine();
    },
    inspect(index: number) {
      if (disposed || !books[index]) return;
      finishSpineReveal(index);
      selected = index;
      const detail = ensure(index);
      trim();
      if (!books[index].sharpSpine) { queue.unshift(index); void nextSpine(); }
      if (detail.inspected) return;
      detail.inspected = true;
      for (const panel of detail.panels) void load(detail, panel);
    },
    dispose() {
      disposed = true;
      books.forEach((book, index) => {
        release(index); book.binding.removeFromParent(); disposeBook(book.binding);
        book.spine.dispose(); book.front.dispose(); book.back.dispose(); book.sharpSpine?.dispose();
      });
      for (const grain of Object.values(grains)) grain.dispose();
    },
  };
}

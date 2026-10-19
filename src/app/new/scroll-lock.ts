// Locking page scroll under an overlay WITHOUT the jump: plain
// `overflow: hidden` on iOS can reset the scroll position, which read as
// the nav bar moving while the overlay opened. Freezing the body at its
// current offset keeps every pixel where it was; unlocking restores the
// exact scroll position.

let lockY = 0;
let locked = false;

export function lockScroll() {
  if (locked) return;
  locked = true;
  lockY = window.scrollY;
  const body = document.body;
  body.style.position = "fixed";
  body.style.top = `-${lockY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
}

export function unlockScroll() {
  if (!locked) return;
  locked = false;
  const body = document.body;
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.style.overflow = "";
  window.scrollTo(0, lockY);
}

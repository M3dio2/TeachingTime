// "Copy into the text pad" (Word files, G2): HTML waiting to be added to the shared text pad.
// The pad may not be open yet when the teacher clicks, so the HTML waits here until the pad's
// editor is ready; an open pad picks it up at once. Teacher's browser only; the text then
// reaches the student through the shared doc like any typing.
import type * as Y from "yjs";

type Box = { pending: string[]; listener: (() => void) | null };
const boxes = new WeakMap<Y.Doc, Box>();
const box = (doc: Y.Doc) => {
  let b = boxes.get(doc);
  if (!b) {
    b = { pending: [], listener: null };
    boxes.set(doc, b);
  }
  return b;
};

export function sendToTextPad(doc: Y.Doc, html: string) {
  const b = box(doc);
  b.pending.push(html);
  b.listener?.();
}

// The text pad: `insert` gets every waiting piece now and later ones as they arrive.
export function listenForText(doc: Y.Doc, insert: (html: string) => void) {
  const b = box(doc);
  const drain = () => {
    while (b.pending.length) insert(b.pending.shift()!);
  };
  b.listener = drain;
  drain();
  return () => {
    if (b.listener === drain) b.listener = null;
  };
}

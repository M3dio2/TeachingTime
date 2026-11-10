import * as Y from "yjs";

type BoardElement = { version: number; versionNonce: number; isDeleted: boolean; updated: number };

// "Clear" in the Text tab's toolbar: empties the text pad for both people.
export function clearText(doc: Y.Doc) {
  const text = doc.getXmlFragment("default"); // Tiptap Collaboration's default field
  doc.transact(() => text.delete(0, text.length));
}

// "Clear" in the Draw tab's toolbar: empties the whiteboard for both people.
// Elements are marked deleted with a higher version (Excalidraw's own way of deleting), so
// reconcileElements removes them from every open scene.
export function clearBoard(doc: Y.Doc) {
  const board = doc.getMap<BoardElement>("board");
  doc.transact(() => {
    for (const [id, element] of board) {
      if (element.isDeleted) continue;
      board.set(id, {
        ...element,
        isDeleted: true,
        version: element.version + 1,
        versionNonce: Math.floor(Math.random() * 2 ** 31),
        updated: Date.now(),
      });
    }
  });
}

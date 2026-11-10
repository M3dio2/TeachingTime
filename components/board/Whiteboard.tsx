"use client";

import "@excalidraw/excalidraw/index.css";
import { CaptureUpdateAction, Excalidraw, MainMenu, reconcileElements } from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import type * as Y from "yjs";
import ClearButton from "./ClearButton";

const SEND_INTERVAL_MS = 50;
const WHITEBOARD = "whiteboard"; // transaction origin for this component's own writes

// Excalidraw mutates elements in place while drawing (bumping `version`). The Y.Map and the
// scene must never share objects, or the map silently changes too and edits are never sent.
// So copies go into the map, and copies come out of it.
function copiesFrom(board: Y.Map<OrderedExcalidrawElement>) {
  return [...board.values()].map((element) => structuredClone(element));
}

// Shared Excalidraw board. Elements live in the lesson Y.Doc as a map of id → element,
// so they sync (and late-join) with the rest of the lesson via useYjsSync.
// Load with next/dynamic and ssr: false; Excalidraw needs the browser.
// Clear (`onClear`, teacher) sits top right in Excalidraw's own UI. `chip` ("View only") shows
// only while the board is read-only: then Excalidraw hides its tools and there's room for it.
export default function Whiteboard({
  doc,
  editable,
  chip,
  onClear,
}: {
  doc: Y.Doc;
  editable: boolean;
  chip?: ReactNode;
  onClear?: () => void;
}) {
  const board = useMemo(() => doc.getMap<OrderedExcalidrawElement>("board"), [doc]);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const pending = useRef<readonly OrderedExcalidrawElement[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const container = useRef<HTMLDivElement>(null);

  // Merge remote changes into the scene (Excalidraw's own collaboration merge),
  // without adding them to the local undo history.
  const applyRemote = () => {
    const api = apiRef.current;
    if (!api) return;
    const elements = reconcileElements(
      api.getSceneElementsIncludingDeleted(),
      copiesFrom(board) as RemoteExcalidrawElement[],
      api.getAppState(),
    );
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER });
  };

  useEffect(() => {
    const onBoardChange = (_: Y.YMapEvent<OrderedExcalidrawElement>, tx: Y.Transaction) => {
      // Everything except our own writes: the peer's edits, and "Clear" (lib/sync/clearLesson.ts).
      if (tx.origin !== WHITEBOARD) applyRemote();
    };
    board.observe(onBoardChange);
    return () => {
      board.unobserve(onBoardChange);
      if (timer.current) clearTimeout(timer.current);
    };
    // applyRemote only reads refs and `board`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // Excalidraw only notices window resizes. Dragging a panel divider changes its size too,
  // and without a refresh the canvas keeps its old size and clicks land in the wrong place.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => apiRef.current?.refresh());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // onChange fires on every pointer move; write changed elements at most every 50 ms.
  const flush = () => {
    timer.current = null;
    const elements = pending.current;
    pending.current = null;
    if (!elements) return;
    doc.transact(() => {
      for (const element of elements) {
        const known = board.get(element.id);
        if (!known || known.version < element.version) {
          board.set(element.id, structuredClone(element));
        }
      }
    }, WHITEBOARD);
  };

  return (
    // `whiteboard` hooks up the narrow-panel rules in app/globals.css.
    <div ref={container} className="whiteboard relative h-full w-full">
      {!editable && chip && <div className="absolute top-3 right-3 z-10">{chip}</div>}
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        // Y.Map has no order; Excalidraw stacks elements by their fractional `index`.
        initialData={{
          elements: copiesFrom(board).sort((a, b) => ((a.index ?? "") < (b.index ?? "") ? -1 : 1)),
        }}
        viewModeEnabled={!editable}
        renderTopRightUI={() => (
          onClear ? <ClearButton what="drawing" onClear={onClear} /> : null
        )}
        onChange={(elements) => {
          pending.current = elements;
          timer.current ??= setTimeout(flush, SEND_INTERVAL_MS);
        }}
        UIOptions={{
          tools: { image: false },
          canvasActions: { loadScene: false, saveToActiveFile: false, export: false },
        }}
      >
        {/* Only what's useful in a lesson: no help, links, socials, theme or local "reset"
            (the toolbar has a shared Clear). */}
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}

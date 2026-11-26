"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { saveLessonNote } from "@/app/(app)/dashboard/[id]/plan-actions";

const SAVE_AFTER_MS = 5_000;

// Review A5: the teacher's text pad is kept as a dated lesson note in the Classroom, so nothing
// is lost after the 3 hours and the student can get it (print / PDF / copy). Saved 5 s after the
// last change and when leaving. Returns when it was last saved (for a small "Saved" hint).
export function useNoteAutosave(doc: Y.Doc, lessonId: string | undefined) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!lessonId) return;
    const fragment = doc.getXmlFragment("default"); // Tiptap Collaboration's default field
    last.current = fragmentText(fragment); // what was there when the lesson opened
    let timer: ReturnType<typeof setTimeout> | undefined;
    const openedAt = Date.now();
    const save = () => {
      clearTimeout(timer);
      const text = fragmentText(fragment);
      if (!text.trim() || text === last.current) return;
      last.current = text;
      void saveLessonNote(lessonId, text).then((ok) => ok && setSavedAt(Date.now()));
    };
    // The editor tidies the loaded pad in its first moments (an empty paragraph, the snapshot):
    // that's not a change to save, it becomes the starting point.
    const changed = () => {
      clearTimeout(timer);
      if (Date.now() - openedAt < 2_000) {
        last.current = fragmentText(fragment);
        return;
      }
      timer = setTimeout(save, SAVE_AFTER_MS);
    };
    fragment.observeDeep(changed);
    const hidden = () => document.visibilityState === "hidden" && save();
    document.addEventListener("visibilitychange", hidden);
    return () => {
      fragment.unobserveDeep(changed);
      document.removeEventListener("visibilitychange", hidden);
      save();
    };
  }, [doc, lessonId]);
  return savedAt;
}

// The pad as plain text: one line per paragraph, "• " and "1. " for list items.
export function fragmentText(fragment: Y.XmlFragment): string {
  const lines: string[] = [];
  const walk = (node: Y.XmlElement | Y.XmlText | Y.XmlHook, prefix: string) => {
    if (node instanceof Y.XmlText) return;
    if (!(node instanceof Y.XmlElement)) return;
    const name = node.nodeName;
    if (name === "bulletList" || name === "orderedList") {
      node.toArray().forEach((item, i) => walk(item as Y.XmlElement, name === "bulletList" ? "• " : `${i + 1}. `));
      return;
    }
    if (name === "listItem") {
      node.toArray().forEach((child, i) => walk(child as Y.XmlElement, i === 0 ? prefix : "   "));
      return;
    }
    if (name === "horizontalRule") return void lines.push("———");
    // paragraph, heading, blockquote, codeBlock: their text.
    const text = node
      .toArray()
      .map((c) =>
        c instanceof Y.XmlText
          ? (c.toDelta() as { insert: unknown }[]).map((d) => (typeof d.insert === "string" ? d.insert : "")).join("")
          : c instanceof Y.XmlElement && c.nodeName === "hardBreak"
            ? "\n"
            : "",
      )
      .join("");
    if (node.toArray().some((c) => c instanceof Y.XmlElement && c.nodeName !== "hardBreak")) {
      node.toArray().forEach((c) => walk(c as Y.XmlElement, prefix));
      return;
    }
    lines.push(prefix + text);
  };
  fragment.toArray().forEach((n) => walk(n as Y.XmlElement, ""));
  // No runs of empty lines.
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

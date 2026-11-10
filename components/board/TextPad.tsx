"use client";

import Collaboration from "@tiptap/extension-collaboration";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { List, ListOrdered } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import type * as Y from "yjs";
import ClearButton from "./ClearButton";

// Shared rich-text pad. The Y.Doc is synced by useYjsSync in LessonRoom.
// The toolbar shows who may write (`chip`) and, for the teacher, Clear (`onClear`).
export default function TextPad({
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
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      // Undo/redo comes from the Collaboration extension, so only your own edits are undone.
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: doc }),
    ],
    editorProps: {
      attributes: { class: "tiptap min-h-full p-4 text-lg outline-none", "aria-label": "Text pad" },
    },
  });

  // useEditor only reads `editable` once; follow the teacher's toggle afterwards.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className="flex h-full w-full flex-col bg-surface text-ink">
      <div className="flex min-h-11 items-center gap-1 border-b border-line px-2 py-1.5">
        {editor && editable && <Tools editor={editor} />}
        <span className="flex-1" />
        {chip}
        {onClear && <ClearButton what="text" onClear={onClear} />}
      </div>
      <EditorContent editor={editor} className="min-h-0 flex-1 overflow-y-auto" />
    </div>
  );
}

function Tools({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      heading: editor.isActive("heading", { level: 2 }),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
    }),
  });

  const buttons = [
    {
      label: "B",
      title: "Bold",
      on: active.bold,
      run: () => editor.chain().focus().toggleBold().run(),
      className: "font-bold",
    },
    {
      label: "I",
      title: "Italic",
      on: active.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
      className: "italic",
    },
    {
      label: "U",
      title: "Underline",
      on: active.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
      className: "underline",
    },
    {
      label: "S",
      title: "Strikethrough (for corrections)",
      on: active.strike,
      run: () => editor.chain().focus().toggleStrike().run(),
      className: "line-through",
    },
    {
      label: "H",
      title: "Heading",
      on: active.heading,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      className: "font-semibold",
    },
    {
      label: <List size={16} aria-hidden />,
      title: "Bullet list",
      on: active.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: <ListOrdered size={16} aria-hidden />,
      title: "Numbered list",
      on: active.orderedList,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="flex min-w-0 flex-wrap gap-0.5">
      {buttons.map((b) => (
        <button
          key={b.title}
          type="button"
          title={b.title}
          aria-label={b.title}
          aria-pressed={b.on}
          onClick={b.run}
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm ${b.className ?? ""} ${
            b.on ? "bg-accent text-white" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import type { Block } from "@blocknote/core";

export interface BlockEditorProps {
  /** BlockNote/ProseMirror-compatible blocks (from API or empty array) */
  value: Block[] | Record<string, unknown>[];
  onChange: (blocks: Block[]) => void;
  placeholder?: string;
  editable?: boolean;
  /** Key to reset editor when item changes (e.g. itemId) */
  editorKey?: string;
}

/**
 * BlockNote wrapper that reads/writes block JSON (BlockNote format, ProseMirror-compatible).
 * Pass editorKey (e.g. itemId) so the editor is recreated when switching items.
 */
export function BlockEditor({
  value,
  onChange,
  placeholder,
  editable = true,
  editorKey,
}: BlockEditorProps) {
  const initialContent = Array.isArray(value) && value.length > 0 ? (value as Block[]) : undefined;
  const editor = useCreateBlockNote(
    { initialContent },
    [editorKey ?? ""]
  );

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      editable={editable}
      onChange={() => {
        const doc = editor.document;
        if (doc) onChange(doc);
      }}
      data-placeholder={placeholder}
    />
  );
}

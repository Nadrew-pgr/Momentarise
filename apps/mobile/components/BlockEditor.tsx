import { useCallback, useRef, useEffect } from "react";
import { useEditorBridge, RichText } from "@10play/tentap-editor";
import type { EditorBridge } from "@10play/tentap-editor";

export interface BlockEditorProps {
  value: Record<string, unknown>[];
  onChange: (blocks: Record<string, unknown>[]) => void;
  editable?: boolean;
}

/**
 * TenTap wrapper for editing ProseMirror-compatible blocks.
 * initialContent: pass as doc shape { type: "doc", content: value } for Tiptap.
 */
export function BlockEditor({
  value,
  onChange,
  editable = true,
}: BlockEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editorRef = useRef<EditorBridge | null>(null);

  const editor = useEditorBridge({
    initialContent:
      value?.length > 0
        ? ({ type: "doc", content: value } as object)
        : undefined,
    editable,
    avoidIosKeyboard: true,
    onChange: useCallback(() => {
      const ed = editorRef.current;
      if (!ed) return;
      ed.getJSON().then((json: unknown) => {
        const doc = json as { content?: Record<string, unknown>[] };
        if (Array.isArray(doc?.content)) {
          onChangeRef.current(doc.content);
        }
      });
    }, []),
  });

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  return <RichText editor={editor} style={{ minHeight: 120 }} />;
}

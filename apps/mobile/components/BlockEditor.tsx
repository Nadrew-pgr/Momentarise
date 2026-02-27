import { useCallback, useRef, useEffect } from "react";
import { View } from "react-native";
import {
  useEditorBridge,
  RichText,
  Toolbar,
  TenTapStartKit,
} from "@10play/tentap-editor";
import type { EditorBridge } from "@10play/tentap-editor";
import type { ProseMirrorNode } from "@momentarise/shared";

export interface BlockEditorProps {
  value: ProseMirrorNode[];
  onChange: (blocks: ProseMirrorNode[]) => void;
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
    bridgeExtensions: TenTapStartKit,
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
        const doc = json as { content?: ProseMirrorNode[] };
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

  return (
    <View style={{ flex: 1, minHeight: 220 }}>
      <RichText editor={editor} style={{ flex: 1, minHeight: 180 }} />
      <View style={{ borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 8 }}>
        <Toolbar editor={editor} />
      </View>
    </View>
  );
}

import { useCallback, useRef, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  KeyboardToolbar,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import {
  useEditorBridge,
  useBridgeState,
  BridgeExtension,
  RichText,
  TenTapStartKit,
} from "@10play/tentap-editor";
import type { EditorBridge } from "@10play/tentap-editor";
import type { ProseMirrorNode } from "@momentarise/shared";

export interface BlockEditorProps {
  value: ProseMirrorNode[];
  onChange: (blocks: ProseMirrorNode[]) => void;
  editable?: boolean;
  enableAI?: boolean;
  locale?: string;
  aiContext?: Record<string, unknown>;
}

type EditorAssistAction =
  | "rewrite"
  | "shorter"
  | "longer"
  | "summarize"
  | "grammar_fix"
  | "translate_fr_en";

type MenuAiAction = EditorAssistAction | "structured_rewrite";

type MenuAiActionConfig = {
  key: MenuAiAction;
  apiAction: EditorAssistAction;
  defaultLabel: string;
  labelKey: string;
  defaultDescription: string;
  descriptionKey: string;
  context?: Record<string, unknown>;
  targetLanguage?: string;
};

type InsertAiTextMessage = {
  type: "insert-ai-text";
  payload: { text: string };
};

type EditorWithAiInsert = EditorBridge & {
  insertAIText?: (text: string) => void;
};

const WEB_FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const EDITOR_FONT_CSS = `
  * {
    font-family: ${WEB_FONT_STACK};
  }
  .ProseMirror {
    font-family: ${WEB_FONT_STACK};
    line-height: 1.55;
  }
`;

const MOBILE_KEYBOARD_TOOLBAR_HEIGHT = 42;
const KEYBOARD_OPENED_OFFSET =
  Platform.OS === "ios" && Number(Platform.Version) >= 26 ? -11 : 0;

const AiInsertBridge = new BridgeExtension<{}, { insertAIText: (text: string) => void }, InsertAiTextMessage>({
  forceName: "aiInsertBridge",
  onBridgeMessage: (editor, message) => {
    if (message.type !== "insert-ai-text") return false;
    const raw = message.payload?.text;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return true;
    editor.chain().focus().insertContent(text).run();
    return true;
  },
  extendEditorInstance: (sendBridgeMessage) => ({
    insertAIText: (text: string) => {
      sendBridgeMessage({
        type: "insert-ai-text",
        payload: { text },
      });
    },
  }),
});

const AI_ACTIONS: readonly MenuAiActionConfig[] = [
  {
    key: "rewrite",
    apiAction: "rewrite",
    defaultLabel: "Improve writing",
    labelKey: "pages.item.editorAi.actions.rewrite.label",
    defaultDescription: "Rewrite with clearer wording and flow.",
    descriptionKey: "pages.item.editorAi.actions.rewrite.description",
  },
  {
    key: "grammar_fix",
    apiAction: "grammar_fix",
    defaultLabel: "Fix grammar",
    labelKey: "pages.item.editorAi.actions.grammarFix.label",
    defaultDescription: "Correct spelling and grammar mistakes.",
    descriptionKey: "pages.item.editorAi.actions.grammarFix.description",
  },
  {
    key: "shorter",
    apiAction: "shorter",
    defaultLabel: "Make shorter",
    labelKey: "pages.item.editorAi.actions.shorter.label",
    defaultDescription: "Reduce length and keep essentials only.",
    descriptionKey: "pages.item.editorAi.actions.shorter.description",
  },
  {
    key: "longer",
    apiAction: "longer",
    defaultLabel: "Make longer",
    labelKey: "pages.item.editorAi.actions.longer.label",
    defaultDescription: "Expand with more context and details.",
    descriptionKey: "pages.item.editorAi.actions.longer.description",
  },
  {
    key: "summarize",
    apiAction: "summarize",
    defaultLabel: "Summarize",
    labelKey: "pages.item.editorAi.actions.summarize.label",
    defaultDescription: "Generate a short summary.",
    descriptionKey: "pages.item.editorAi.actions.summarize.description",
  },
  {
    key: "translate_fr_en",
    apiAction: "translate_fr_en",
    defaultLabel: "Translate FR → EN",
    labelKey: "pages.item.editorAi.actions.translateFrEn.label",
    defaultDescription: "Translate French text to English.",
    descriptionKey: "pages.item.editorAi.actions.translateFrEn.description",
    targetLanguage: "en",
  },
  {
    key: "structured_rewrite",
    apiAction: "rewrite",
    defaultLabel: "Structured rewrite",
    labelKey: "pages.item.editorAi.actions.structuredRewrite.label",
    defaultDescription: "Rebuild with sections and action points.",
    descriptionKey: "pages.item.editorAi.actions.structuredRewrite.description",
    context: { style: "structured_sections" },
  },
];

/**
 * TenTap wrapper for editing ProseMirror-compatible blocks.
 * initialContent: pass as doc shape { type: "doc", content: value } for Tiptap.
 */
export function BlockEditor({
  value,
  onChange,
  editable = true,
  enableAI = false,
  locale = "fr-FR",
  aiContext,
}: BlockEditorProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editorRef = useRef<EditorWithAiInsert | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  const editor = useEditorBridge({
    bridgeExtensions: [...TenTapStartKit, AiInsertBridge],
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
  }) as EditorWithAiInsert;
  const editorState = useBridgeState(editor);
  const bridgeState = editorState as unknown as Record<string, unknown>;

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    const css = JSON.stringify(EDITOR_FONT_CSS);
    editor.injectJS(`
      (function() {
        var id = "momentarise-editor-font";
        var styleTag = document.getElementById(id);
        if (!styleTag) {
          styleTag = document.createElement("style");
          styleTag.id = id;
          document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = ${css};
      })();
    `);
  }, [editor]);

  useEffect(() => {
    if (!isKeyboardVisible) {
      setAiMenuOpen(false);
    }
  }, [isKeyboardVisible]);

  const extractText = useCallback((node: unknown): string => {
    if (Array.isArray(node)) return node.map((entry) => extractText(entry)).join(" ").trim();
    if (!node || typeof node !== "object") return "";
    const current = node as Record<string, unknown>;
    const ownText = typeof current.text === "string" ? current.text : "";
    const children = Array.isArray(current.content) ? current.content.map((entry) => extractText(entry)).join(" ") : "";
    return `${ownText} ${children}`.trim();
  }, []);

  const applyAiAction = useCallback(async (action: MenuAiActionConfig) => {
    if (!enableAI || aiBusy) return;
    const ed = editorRef.current;
    if (!ed) return;
    setAiBusy(true);
    try {
      const json = await ed.getJSON();
      const sourceText = extractText(json).trim();
      if (!sourceText) return;
      const rawSelection = editorState?.selection;
      const hasSelection =
        rawSelection &&
        typeof rawSelection.from === "number" &&
        typeof rawSelection.to === "number" &&
        rawSelection.to > rawSelection.from;
      const selectionStart = hasSelection ? Math.max(0, rawSelection.from - 1) : 0;
      const selectionEnd = hasSelection
        ? Math.max(selectionStart, Math.min(sourceText.length, rawSelection.to - 1))
        : 0;
      const selectionText = hasSelection
        ? sourceText.slice(selectionStart, selectionEnd).trim()
        : "";
      const targetScope = selectionText ? "selection" : "document";
      const contextPayload = {
        ...(aiContext ?? {}),
        ...(action.context ?? {}),
        target_scope: targetScope,
      };
      const res = await apiFetch("/api/v1/editor/assist", {
        method: "POST",
        body: JSON.stringify({
          action: action.apiAction,
          text: sourceText,
          selection_text: selectionText || undefined,
          locale,
          target_language: action.targetLanguage,
          context: contextPayload,
        }),
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { result_text?: string };
      const resultText = typeof payload.result_text === "string" ? payload.result_text.trim() : "";
      if (!resultText) return;
      ed.insertAIText?.(resultText);
      setAiMenuOpen(false);
    } finally {
      setAiBusy(false);
    }
  }, [aiBusy, aiContext, editorState, enableAI, extractText, locale]);

  return (
    <View style={{ flex: 1, minHeight: 220 }}>
      <View style={{ flex: 1, minHeight: 180 }}>
        <RichText
          editor={editor}
          style={{
            flex: 1,
            minHeight: 180,
            paddingBottom: isKeyboardVisible ? MOBILE_KEYBOARD_TOOLBAR_HEIGHT + 14 : 14,
          }}
        />
      </View>
      {editable ? (
        <>
          {enableAI && aiMenuOpen && isKeyboardVisible ? (
            <KeyboardStickyView
              enabled
              offset={{ opened: KEYBOARD_OPENED_OFFSET }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: MOBILE_KEYBOARD_TOOLBAR_HEIGHT,
              }}
            >
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#e4e4e7",
                  borderBottomWidth: 1,
                  borderBottomColor: "#e4e4e7",
                  backgroundColor: "#ffffff",
                  maxHeight: 208,
                  paddingVertical: 8,
                }}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
                  {AI_ACTIONS.map((action) => (
                    <Pressable
                      key={action.key}
                      onPress={() => void applyAiAction(action)}
                      disabled={aiBusy}
                      style={{
                        width: 168,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        marginRight: 8,
                        opacity: aiBusy ? 0.5 : 1,
                        backgroundColor: "#fafafa",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          lineHeight: 18,
                          color: "#0a0a0a",
                          fontWeight: "600",
                          fontFamily: "Inter",
                        }}
                      >
                        {t(action.labelKey, { defaultValue: action.defaultLabel })}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          lineHeight: 16,
                          marginTop: 2,
                          color: "#52525b",
                          fontFamily: "Inter",
                        }}
                      >
                        {t(action.descriptionKey, { defaultValue: action.defaultDescription })}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </KeyboardStickyView>
          ) : null}
          {isKeyboardVisible ? (
            <KeyboardToolbar
              enabled
              offset={{ opened: KEYBOARD_OPENED_OFFSET }}
              insets={{ left: insets.left, right: insets.right }}
              showArrows={false}
              doneText={null}
              content={
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderTopWidth: 1,
                    borderTopColor: "#e4e4e7",
                    backgroundColor: "#ffffff",
                    minHeight: 44,
                    width: "100%",
                  }}
                >
                  {enableAI ? (
                    <Pressable
                      onPress={() => setAiMenuOpen((prev) => !prev)}
                      disabled={aiBusy}
                      style={{
                        minWidth: 66,
                        height: 44,
                        justifyContent: "center",
                        alignItems: "center",
                        borderRightWidth: 1,
                        borderRightColor: "#e4e4e7",
                        opacity: aiBusy ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: aiMenuOpen ? "#18181b" : "#52525b",
                          fontWeight: aiMenuOpen ? "700" : "600",
                          fontFamily: "Inter",
                        }}
                      >
                        {t("pages.item.editorAi.button", { defaultValue: "IA" })}
                      </Text>
                    </Pressable>
                  ) : null}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: "center", paddingHorizontal: 8 }}
                    style={{ flex: 1 }}
                  >
                    <Pressable
                      onPress={() => editor.toggleBold()}
                      disabled={!bridgeState.canToggleBold}
                      style={{
                        minWidth: 34,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleBold ? 1 : 0.4,
                        backgroundColor: bridgeState.isBoldActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", fontWeight: "700", color: "#111827" }}>B</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleItalic()}
                      disabled={!bridgeState.canToggleItalic}
                      style={{
                        minWidth: 34,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleItalic ? 1 : 0.4,
                        backgroundColor: bridgeState.isItalicActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", fontStyle: "italic", color: "#111827" }}>I</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleUnderline()}
                      disabled={!bridgeState.canToggleUnderline}
                      style={{
                        minWidth: 34,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleUnderline ? 1 : 0.4,
                        backgroundColor: bridgeState.isUnderlineActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", textDecorationLine: "underline", color: "#111827" }}>
                        U
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleStrike()}
                      disabled={!bridgeState.canToggleStrike}
                      style={{
                        minWidth: 34,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleStrike ? 1 : 0.4,
                        backgroundColor: bridgeState.isStrikeActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", textDecorationLine: "line-through", color: "#111827" }}>
                        S
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleCode()}
                      disabled={!bridgeState.canToggleCode}
                      style={{
                        minWidth: 44,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleCode ? 1 : 0.4,
                        backgroundColor: bridgeState.isCodeActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>{"</>"}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleHeading(2)}
                      disabled={!bridgeState.canToggleHeading}
                      style={{
                        minWidth: 42,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleHeading ? 1 : 0.4,
                        backgroundColor: bridgeState.headingLevel === 2 ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>H2</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleBulletList()}
                      disabled={!bridgeState.canToggleBulletList}
                      style={{
                        minWidth: 42,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleBulletList ? 1 : 0.4,
                        backgroundColor: bridgeState.isBulletListActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>• List</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleOrderedList()}
                      disabled={!bridgeState.canToggleOrderedList}
                      style={{
                        minWidth: 40,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleOrderedList ? 1 : 0.4,
                        backgroundColor: bridgeState.isOrderedListActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>1.</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleTaskList()}
                      disabled={!bridgeState.canToggleTaskList}
                      style={{
                        minWidth: 40,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleTaskList ? 1 : 0.4,
                        backgroundColor: bridgeState.isTaskListActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>[]</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.toggleBlockquote()}
                      disabled={!bridgeState.canToggleBlockquote}
                      style={{
                        minWidth: 34,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canToggleBlockquote ? 1 : 0.4,
                        backgroundColor: bridgeState.isBlockquoteActive ? "#e5e7eb" : "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>"</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.undo()}
                      disabled={!bridgeState.canUndo}
                      style={{
                        minWidth: 44,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canUndo ? 1 : 0.4,
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>Undo</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => editor.redo()}
                      disabled={!bridgeState.canRedo}
                      style={{
                        minWidth: 44,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#d4d4d8",
                        marginRight: 4,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: bridgeState.canRedo ? 1 : 0.4,
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter", color: "#111827", fontWeight: "600" }}>Redo</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              }
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

"use client";

import { useCallback, useMemo } from "react";
import { Block } from "@blocknote/core";
import { nanoid } from "nanoid";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { en as coreEn, fr as coreFr } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import {
  DefaultReactSuggestionItem,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIExtension,
  AIMenu,
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems,
  getDefaultAIMenuItems,
  type AIMenuSuggestionItem,
} from "@blocknote/xl-ai";
import { en as aiEn, fr as aiFr } from "@blocknote/xl-ai/locales";
import { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BlockEditorProps {
  value: Block[] | Record<string, unknown>[];
  onChange: (blocks: Block[]) => void;
  placeholder?: string;
  editable?: boolean;
  editorKey?: string;
  className?: string;
  enableAI?: boolean;
  locale?: string;
  aiContext?: Record<string, unknown>;
}

type BlockNoteTransportResponse = {
  tool_call?: {
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  } | null;
  result_text?: string | null;
};

const BLOCKNOTE_INCOMPATIBLE_NODE_TYPES = new Set([
  "doc",
  "text",
  "hardBreak",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractTextContent(node: unknown): string {
  if (Array.isArray(node)) {
    return node
      .map((entry) => extractTextContent(entry))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  if (!isRecord(node)) return "";
  const ownText = typeof node.text === "string" ? node.text : "";
  const childText = Array.isArray(node.content)
    ? node.content
      .map((entry) => extractTextContent(entry))
      .filter(Boolean)
      .join("\n")
      .trim()
    : "";
  const type = typeof node.type === "string" ? node.type : "";
  if (type === "paragraph" || type === "heading" || type === "listItem" || type === "taskItem") {
    return [ownText, childText].filter(Boolean).join(" ").trim();
  }
  return [ownText, childText].filter(Boolean).join("\n").trim();
}

function fallbackParagraphBlocks(value: unknown): Block[] | undefined {
  const text = extractTextContent(value);
  if (!text) return undefined;
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 400);
  if (lines.length === 0) return undefined;
  return lines.map((line) => ({
    id: nanoid(),
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: line, styles: {} }],
    children: [],
  })) as any as Block[];
}

function normalizeInitialContent(value: Block[] | Record<string, unknown>[]): Block[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const nodes = value.filter(isRecord);
  if (nodes.length === 0) return undefined;
  const looksLikeValidBlockNotePayload = nodes.every((node) => {
    const type = node.type;
    if (typeof type !== "string" || !type.trim()) return false;
    if ("payload" in node) return false;
    if (BLOCKNOTE_INCOMPATIBLE_NODE_TYPES.has(type)) return false;
    return true;
  });
  if (looksLikeValidBlockNotePayload) {
    return nodes as Block[];
  }
  return fallbackParagraphBlocks(nodes);
}

function createSingleResponseStream(payload: BlockNoteTransportResponse): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "start" });
      const toolCall = payload.tool_call;
      if (toolCall && typeof toolCall === "object") {
        controller.enqueue({
          type: "tool-input-available",
          toolCallId: toolCall.id || `tool-${Date.now()}`,
          toolName: toolCall.name || "applyDocumentOperations",
          input: toolCall.input ?? {},
        });
        controller.enqueue({ type: "finish", finishReason: "tool-calls" });
        controller.close();
        return;
      }
      const text = typeof payload.result_text === "string" ? payload.result_text.trim() : "";
      if (text) {
        const textId = `text-${Date.now()}`;
        controller.enqueue({ type: "text-start", id: textId });
        controller.enqueue({ type: "text-delta", id: textId, delta: text });
        controller.enqueue({ type: "text-end", id: textId });
      }
      controller.enqueue({ type: "finish", finishReason: "stop" });
      controller.close();
    },
  });
}

function buildTransport(locale: string, aiContext?: Record<string, unknown>): ChatTransport<UIMessage> {
  return {
    async sendMessages({ messages, body, abortSignal }) {
      const payload = {
        messages,
        tool_definitions:
          (body && typeof body === "object" && "toolDefinitions" in body
            ? (body as { toolDefinitions?: Record<string, unknown> }).toolDefinitions
            : undefined) ?? {},
        locale,
        context: aiContext ?? {},
      };
      const response = await fetch("/api/editor/assist/blocknote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortSignal,
      });
      if (!response.ok) {
        throw new Error(`BlockNote AI backend error (${response.status})`);
      }
      const data = (await response.json()) as BlockNoteTransportResponse;
      return createSingleResponseStream(data);
    },
    async reconnectToStream() {
      return null;
    },
  };
}

export function BlockEditor({
  value,
  onChange,
  placeholder,
  editable = true,
  editorKey,
  className,
  enableAI = false,
  locale = "fr-FR",
  aiContext,
}: BlockEditorProps) {
  const initialContent = useMemo(() => normalizeInitialContent(value), [value]);
  const transport = useMemo(() => buildTransport(locale, aiContext), [aiContext, locale]);
  const dictionary = useMemo(
    () => (locale.toLowerCase().startsWith("fr") ? { ...coreFr, ai: aiFr } : { ...coreEn, ai: aiEn }),
    [locale]
  );
  const editor = useCreateBlockNote(
    {
      initialContent,
      dictionary,
      extensions: enableAI ? [AIExtension({ transport })] : [],
    },
    [dictionary, editorKey ?? "", enableAI, transport]
  );

  const slashItems = useMemo<DefaultReactSuggestionItem[]>(() => {
    const defaults = getDefaultReactSlashMenuItems(editor);
    if (!enableAI) return defaults;
    return [...defaults, ...getAISlashMenuItems(editor)];
  }, [editor, enableAI]);

  const aiMenuItems = useCallback(
    (
      currentEditor: Parameters<typeof getDefaultAIMenuItems>[0],
      status: Parameters<typeof getDefaultAIMenuItems>[1]
    ): AIMenuSuggestionItem[] => [
        ...getDefaultAIMenuItems(currentEditor, status),
        {
          key: "structured-rewrite",
          title: "Structured rewrite",
          subtext: "Rewrite into clear sections with action points",
          icon: <WandSparkles className="h-4 w-4" />,
          onItemClick: (setPrompt) => {
            setPrompt(
              "Rewrite this note with clear sections: context, key points, decisions, and next actions."
            );
          },
        },
      ],
    []
  );

  return (
    <div className={cn("blocknote-shell h-full min-h-0 overflow-visible", className)}>
      <BlockNoteView
        editor={editor}
        theme="light"
        editable={editable}
        slashMenu={enableAI ? false : true}
        formattingToolbar={enableAI ? false : true}
        onChange={() => {
          const doc = editor.document;
          if (doc) onChange(doc);
        }}
        data-placeholder={placeholder}
        className="h-full min-h-0 overflow-visible"
      >
        {enableAI ? (
          <>
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={async (query) => filterSuggestionItems(slashItems, query)}
            />
            <FormattingToolbarController
              formattingToolbar={() => (
                <FormattingToolbar>
                  {getFormattingToolbarItems()}
                  <AIToolbarButton />
                </FormattingToolbar>
              )}
            />
            <AIMenuController aiMenu={() => <AIMenu items={aiMenuItems} />} />
          </>
        ) : null}
      </BlockNoteView>
    </div>
  );
}

import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; language: string | null; code: string };

function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const codeRegex = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    blocks.push(...parseTextBlocks(before));
    blocks.push({
      type: "code",
      language: match[1]?.trim() || null,
      code: match[2] ?? "",
    });
    lastIndex = codeRegex.lastIndex;
  }

  blocks.push(...parseTextBlocks(content.slice(lastIndex)));
  return blocks;
}

function parseTextBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = text.split(/\r?\n/);
  let i = 0;

  const isListLine = (value: string) => /^(\d+\.\s+|[-*]\s+)/.test(value.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n").trim() });
      continue;
    }

    if (isListLine(line)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length && isListLine(lines[i])) {
        items.push(lines[i].trim().replace(/^(\d+\.\s+|[-*]\s+)/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const candidate = lines[i].trim();
      if (!candidate) break;
      if (/^(#{1,6})\s+/.test(candidate)) break;
      if (candidate.startsWith(">")) break;
      if (isListLine(lines[i])) break;
      paragraphLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join("\n").trim() });
  }

  return blocks;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let index = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
    if (linkMatch) {
      const label = linkMatch[1];
      const href = linkMatch[2];
      nodes.push(
        <Text
          key={`${keyPrefix}-link-${index}`}
          style={styles.link}
          onPress={() => {
            void Linking.openURL(href);
          }}
        >
          {label}
        </Text>
      );
      remaining = remaining.slice(linkMatch[0].length);
      index += 1;
      continue;
    }

    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      nodes.push(
        <Text key={`${keyPrefix}-bold-${index}`} style={styles.bold}>
          {boldMatch[1]}
        </Text>
      );
      remaining = remaining.slice(boldMatch[0].length);
      index += 1;
      continue;
    }

    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      nodes.push(
        <Text key={`${keyPrefix}-italic-${index}`} style={styles.italic}>
          {italicMatch[1]}
        </Text>
      );
      remaining = remaining.slice(italicMatch[0].length);
      index += 1;
      continue;
    }

    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push(
        <Text key={`${keyPrefix}-inline-code-${index}`} style={styles.inlineCode}>
          {codeMatch[1]}
        </Text>
      );
      remaining = remaining.slice(codeMatch[0].length);
      index += 1;
      continue;
    }

    const nextSpecial = remaining.search(/(\[|\*\*|\*|`)/);
    if (nextSpecial === -1) {
      nodes.push(
        <Text key={`${keyPrefix}-text-${index}`} style={styles.text}>
          {remaining}
        </Text>
      );
      break;
    }

    if (nextSpecial > 0) {
      const plain = remaining.slice(0, nextSpecial);
      nodes.push(
        <Text key={`${keyPrefix}-text-${index}`} style={styles.text}>
          {plain}
        </Text>
      );
      remaining = remaining.slice(nextSpecial);
      index += 1;
      continue;
    }

    nodes.push(
      <Text key={`${keyPrefix}-literal-${index}`} style={styles.text}>
        {remaining[0]}
      </Text>
    );
    remaining = remaining.slice(1);
    index += 1;
  }

  return nodes;
}

function headingStyle(level: number) {
  switch (level) {
    case 1:
      return styles.h1;
    case 2:
      return styles.h2;
    case 3:
      return styles.h3;
    default:
      return styles.h4;
  }
}

function renderBlock(block: MarkdownBlock, index: number): React.ReactNode {
  switch (block.type) {
    case "heading":
      return (
        <Text key={`heading-${index}`} style={[styles.text, headingStyle(block.level), styles.blockSpacing]}>
          {renderInline(block.text, `heading-${index}`)}
        </Text>
      );
    case "quote":
      return (
        <View key={`quote-${index}`} style={styles.quoteContainer}>
          <Text style={styles.quoteText}>{renderInline(block.text, `quote-${index}`)}</Text>
        </View>
      );
    case "list":
      return (
        <View key={`list-${index}`} style={styles.blockSpacing}>
          {block.items.map((item, itemIndex) => (
            <View key={`list-${index}-${itemIndex}`} style={styles.listRow}>
              <Text style={styles.listMarker}>
                {block.ordered ? `${itemIndex + 1}.` : "•"}
              </Text>
              <Text style={styles.listText}>{renderInline(item, `list-${index}-${itemIndex}`)}</Text>
            </View>
          ))}
        </View>
      );
    case "code":
      return (
        <View key={`code-${index}`} style={styles.codeBlock}>
          {block.language ? <Text style={styles.codeLanguage}>{block.language}</Text> : null}
          <Text style={styles.codeText}>{block.code}</Text>
        </View>
      );
    case "paragraph":
    default:
      return (
        <Text key={`paragraph-${index}`} style={[styles.text, styles.blockSpacing]}>
          {renderInline(block.text, `paragraph-${index}`)}
        </Text>
      );
  }
}

export function MarkdownRenderer({ content, isStreaming = false }: MarkdownRendererProps) {
  if (!content) return null;

  try {
    const blocks = parseMarkdown(content);
    if (blocks.length === 0) return null;

    if (isStreaming) {
      return (
        <Animated.View entering={FadeIn.duration(160)}>
          <View>{blocks.map(renderBlock)}</View>
        </Animated.View>
      );
    }

    return <View>{blocks.map(renderBlock)}</View>;
  } catch {
    return <Text style={styles.text}>{content}</Text>;
  }
}

const styles = StyleSheet.create({
  text: {
    color: "hsl(224 10% 20%)",
    fontSize: 16,
    lineHeight: 24,
  },
  blockSpacing: {
    marginBottom: 10,
  },
  h1: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
  },
  h2: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  inlineCode: {
    fontFamily: "Courier",
    backgroundColor: "rgba(24,24,27,0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  codeBlock: {
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(24,24,27,0.95)",
  },
  codeLanguage: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    marginBottom: 6,
    textTransform: "lowercase",
  },
  codeText: {
    color: "#f4f4f5",
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 20,
  },
  quoteContainer: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(63,63,70,0.25)",
    paddingLeft: 10,
    marginBottom: 10,
  },
  quoteText: {
    color: "rgba(63,63,70,0.9)",
    fontSize: 15,
    lineHeight: 22,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  listMarker: {
    width: 20,
    color: "rgba(63,63,70,0.95)",
    fontSize: 15,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    color: "hsl(224 10% 20%)",
    fontSize: 16,
    lineHeight: 24,
  },
  link: {
    color: "hsl(221 83% 53%)",
    textDecorationLine: "underline",
  },
});

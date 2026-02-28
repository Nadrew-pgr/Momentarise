import type React from "react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { AnalysisWordSpan } from "./analysis-word-span";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

function renderWords(text: string, keyPrefix: string, animated: boolean): React.ReactNode[] {
  const tokens = text.split(/(\s+)/);
  return tokens.map((token, idx) => {
    if (!token) return null;
    if (/\s+/.test(token)) return <Fragment key={`${keyPrefix}-ws-${idx}`}>{token}</Fragment>;
    if (!animated) return <Fragment key={`${keyPrefix}-tx-${idx}`}>{token}</Fragment>;
    return <AnalysisWordSpan key={`${keyPrefix}-an-${idx}`} word={token} index={idx} />;
  });
}

function renderInline(text: string, animated: boolean, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let part = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${part++}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.82rem]"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${part++}`}>
          {renderWords(boldMatch[1], `${keyPrefix}-boldw-${part}`, animated)}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      nodes.push(
        <em key={`${keyPrefix}-italic-${part++}`}>
          {renderWords(italicMatch[1], `${keyPrefix}-itw-${part}`, animated)}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
    if (linkMatch) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${part++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/[`*\[]/);
    if (nextSpecial === -1) {
      nodes.push(...renderWords(remaining, `${keyPrefix}-txt-${part++}`, animated));
      break;
    }

    if (nextSpecial === 0) {
      nodes.push(<Fragment key={`${keyPrefix}-lit-${part++}`}>{remaining[0]}</Fragment>);
      remaining = remaining.slice(1);
      continue;
    }

    const plain = remaining.slice(0, nextSpecial);
    nodes.push(...renderWords(plain, `${keyPrefix}-pl-${part++}`, animated));
    remaining = remaining.slice(nextSpecial);
  }

  return nodes;
}

function renderCodeBlock(block: string, key: string): React.ReactNode {
  const raw = block.slice(3, -3);
  const firstLineBreak = raw.indexOf("\n");
  const language = firstLineBreak > 0 ? raw.slice(0, firstLineBreak).trim() : "";
  const code = firstLineBreak > 0 ? raw.slice(firstLineBreak + 1) : raw;

  return (
    <pre key={key} className="my-2 overflow-x-auto rounded-xl bg-zinc-900 p-3 text-sm text-zinc-100">
      {language ? <div className="mb-2 text-xs text-zinc-400">{language}</div> : null}
      <code>{code}</code>
    </pre>
  );
}

export function MarkdownRenderer({ content, className, isStreaming = false }: MarkdownRendererProps) {
  if (!content) return <span className={cn("text-sm", className)} />;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={cn("text-sm whitespace-pre-wrap break-words", className)}>
      {parts.map((part, idx) => {
        const key = `part-${idx}`;
        if (part.startsWith("```") && part.endsWith("```")) {
          return renderCodeBlock(part, key);
        }
        if (!part) return null;
        return <span key={key}>{renderInline(part, isStreaming, key)}</span>;
      })}
    </div>
  );
}

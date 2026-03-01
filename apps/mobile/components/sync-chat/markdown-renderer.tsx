import React, { Fragment } from "react";
import { View, StyleSheet, Linking } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { FadeIn } from "react-native-reanimated";

interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
}

function AnimatedWord({ word, index, delayMs = 18 }: { word: string; index: number; delayMs?: number }) {
    // Cap the delay so it doesn't take forever for long messages when streaming
    const delay = Math.min(index * delayMs, 600);

    return (
        <Animated.Text
            entering={FadeIn.duration(300).delay(delay)}
            className="text-[16px] leading-[26px] text-foreground"
        >
            {word}
        </Animated.Text>
    );
}

function renderWords(text: string, keyPrefix: string, animated: boolean, startIndexRef: { current: number }): React.ReactNode[] {
    // Split by whitespace but keep the whitespace tokens to render them
    const tokens = text.split(/(\s+)/);

    return tokens.map((token, idx) => {
        if (!token) return null;

        // If it's pure whitespace, just render a normal text node to preserve spacing
        if (/\s+/.test(token)) {
            return (
                <Text key={`${keyPrefix}-ws-${idx}`} className="text-[16px] leading-[26px] text-foreground">
                    {token}
                </Text>
            );
        }

        // If not animated, render standard text
        if (!animated) {
            return (
                <Text key={`${keyPrefix}-tx-${idx}`} className="text-[16px] leading-[26px] text-foreground">
                    {token}
                </Text>
            );
        }

        // If animated, render Reanimated text fading in
        const wordIndex = startIndexRef.current++;
        return <AnimatedWord key={`${keyPrefix}-an-${idx}`} word={token} index={wordIndex} />;
    });
}

function renderInline(text: string, animated: boolean, keyPrefix: string, startIndexRef: { current: number }): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let part = 0;

    while (remaining.length > 0) {
        // 1. Code inline
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
            nodes.push(
                <Text
                    key={`${keyPrefix}-code-${part++}`}
                    className="bg-muted text-foreground px-1.5 py-0.5 rounded-md font-mono text-[14px]"
                >
                    {codeMatch[1]}
                </Text>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
        }

        // 2. Bold
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            nodes.push(
                <Text key={`${keyPrefix}-bold-${part++}`} className="font-bold">
                    {renderWords(boldMatch[1], `${keyPrefix}-boldw-${part}`, animated, startIndexRef)}
                </Text>
            );
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // 3. Italic
        const italicMatch = remaining.match(/^\*([^*]+)\*/);
        if (italicMatch) {
            nodes.push(
                <Text key={`${keyPrefix}-italic-${part++}`} className="italic">
                    {renderWords(italicMatch[1], `${keyPrefix}-itw-${part}`, animated, startIndexRef)}
                </Text>
            );
            remaining = remaining.slice(italicMatch[0].length);
            continue;
        }

        // 4. Link
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
        if (linkMatch) {
            nodes.push(
                <Text
                    key={`${keyPrefix}-link-${part++}`}
                    className="text-primary underline"
                    onPress={() => Linking.openURL(linkMatch[2]).catch(console.error)}
                >
                    {linkMatch[1]}
                </Text>
            );
            remaining = remaining.slice(linkMatch[0].length);
            continue;
        }

        // 5. Look for next special char
        const nextSpecial = remaining.search(/[`*\[]/);

        // No more special chars, consume the rest
        if (nextSpecial === -1) {
            nodes.push(...renderWords(remaining, `${keyPrefix}-txt-${part++}`, animated, startIndexRef));
            break;
        }

        // Special char is right at the start (meaning it was a literal like a single * or [ that didn't match rules)
        if (nextSpecial === 0) {
            // Just render it as plain text and move forward 1 char
            nodes.push(
                <Text key={`${keyPrefix}-lit-${part++}`} className="text-[16px] leading-[26px] text-foreground">
                    {remaining[0]}
                </Text>
            );
            remaining = remaining.slice(1);
            continue;
        }

        // Consume up to the next special character
        const plain = remaining.slice(0, nextSpecial);
        nodes.push(...renderWords(plain, `${keyPrefix}-pl-${part++}`, animated, startIndexRef));
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
        <View key={key} className="my-3 rounded-xl bg-zinc-900 p-4">
            {language ? (
                <Text className="mb-2 text-xs font-semibold text-zinc-400 capitalize">
                    {language}
                </Text>
            ) : null}
            <Text className="font-mono text-[13px] leading-[20px] text-zinc-100">
                {code}
            </Text>
        </View>
    );
}

export function MarkdownRenderer({ content, isStreaming = false }: MarkdownRendererProps) {
    if (!content) return null;

    // Split content by code blocks ` ``` `
    const parts = content.split(/(```[\s\S]*?```)/g);

    // Track global word index for staggered streaming animation
    const wordIndexRef = { current: 0 };

    return (
        <View className="flex-col">
            {parts.map((part, idx) => {
                const key = `part-${idx}`;
                if (part.startsWith("```") && part.endsWith("```")) {
                    return renderCodeBlock(part, key);
                }

                if (!part) return null;

                // Render inline elements wrapped in a Text block so they format like a paragraph
                return (
                    <Text key={key} className="flex-row flex-wrap mb-2">
                        {renderInline(part, isStreaming, key, wordIndexRef)}
                    </Text>
                );
            })}
        </View>
    );
}

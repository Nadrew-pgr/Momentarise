/**
 * Provider brand icons for the mobile model selector.
 * Uses react-native-svg. Official SVG paths from Simple Icons.
 */

import React from "react";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface IconProps {
    size?: number;
}

/** Mistral AI — official "Le Chat" M-shape mark */
export function MistralIcon({ size = 16 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#181818">
            <Path d="M3.209 0v4.364h4.364V0Zm13.218 0v4.364H24V0ZM3.209 4.364V8.73h4.364V4.364Zm4.364 0V8.73h4.363V4.364Zm4.363 0V8.73h4.364V4.364Zm4.364 0V8.73H24V4.364ZM0 8.727v4.364h4.364V8.727Zm7.573 0v4.364h4.363V8.727Zm4.363 0v4.364h4.364V8.727ZM24 8.727v-4.02h-4.364v4.384H24ZM0 13.091v4.364h4.364v-4.364Zm7.573 0v4.364h4.363v-4.364Zm4.363 0v4.364h4.364v-4.364ZM0 17.455v4.364h4.364v-4.364Zm7.573 0v4.364h4.363v-4.364Zm8.854 0v4.364h4.364v-4.364zM3.209 21.818V24h4.364v-2.182Zm13.218 0V24H24v-2.182Z" />
        </Svg>
    );
}

/** Anthropic — official "A" lettermark */
export function AnthropicIcon({ size = 16 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#181818">
            <Path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.257 0h3.604l6.57 16.96h-3.604l-1.373-3.676H5.173L3.8 20.48H.196l6.374-16.96zM10.4 14.04L8.2 8.17l-2.2 5.87h4.4z" />
        </Svg>
    );
}

/** OpenAI — official hexagonal flower mark */
export function OpenAIIcon({ size = 16 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#181818">
            <Path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </Svg>
    );
}

/** Google Gemini — 4-pointed star with gradient */
export function GeminiIcon({ size = 16 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Defs>
                <LinearGradient id="ggrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <Stop stopColor="#4285F4" />
                    <Stop offset="1" stopColor="#886FBF" />
                </LinearGradient>
            </Defs>
            <Path
                d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"
                fill="url(#ggrad)"
            />
        </Svg>
    );
}

/** Lookup helper */
export function ProviderIcon({ provider, size = 16 }: { provider: string } & IconProps) {
    switch (provider) {
        case "mistral":
            return <MistralIcon size={size} />;
        case "anthropic":
            return <AnthropicIcon size={size} />;
        case "openai":
            return <OpenAIIcon size={size} />;
        case "gemini":
            return <GeminiIcon size={size} />;
        default:
            return null;
    }
}

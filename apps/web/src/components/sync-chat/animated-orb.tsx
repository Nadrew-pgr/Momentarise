import type React from "react";

interface AnimatedOrbProps {
  className?: string;
  variant?: "default" | "danger" | "stop";
  size?: number;
}

export function AnimatedOrb({ className, variant = "default", size = 34 }: AnimatedOrbProps) {
  const colors =
    variant === "danger"
      ? {
          background: "#fee2e2",
          one: "#ef4444",
          two: "#f97316",
          three: "#f43f5e",
          four: "#fca5a5",
          five: "#dc2626",
        }
      : variant === "stop"
        ? {
            background: "#fff7ed",
            one: "#ea580c",
            two: "#f97316",
            three: "#fb923c",
            four: "#fdba74",
            five: "#c2410c",
          }
        : {
            background: "#dbeafe",
            one: "#60a5fa",
            two: "#34d399",
            three: "#818cf8",
            four: "#22d3ee",
            five: "#f59e0b",
          };

  const blurAmount = Math.max(6, Math.round(size * 0.2));

  return (
    <div
      className={`sync-chat-orb ${className ?? ""}`.trim()}
      style={
        {
          width: size,
          height: size,
          backgroundColor: colors.background,
          ["--sync-chat-orb-blur" as string]: `${blurAmount}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div className="sync-chat-orb-inner">
        <div className="sync-chat-orb-circle sync-chat-orb-circle-1" style={{ backgroundColor: colors.one }} />
        <div className="sync-chat-orb-circle sync-chat-orb-circle-2" style={{ backgroundColor: colors.two }} />
        <div className="sync-chat-orb-circle sync-chat-orb-circle-3" style={{ backgroundColor: colors.three }} />
        <div className="sync-chat-orb-circle sync-chat-orb-circle-4" style={{ backgroundColor: colors.four }} />
        <div className="sync-chat-orb-circle sync-chat-orb-circle-5" style={{ backgroundColor: colors.five }} />
      </div>
      <div className="sync-chat-orb-shine" />
    </div>
  );
}

import { useMemo } from "react";

interface AudioWaveformProps {
  isRecording: boolean;
}

export function AudioWaveform({ isRecording }: AudioWaveformProps) {
  const bars = useMemo(() => Array.from({ length: 18 }, (_, idx) => idx), []);

  return (
    <div className="flex h-8 items-center justify-center gap-[3px] px-1" aria-hidden="true">
      {bars.map((bar) => (
        <span
          key={bar}
          className={isRecording ? "sync-chat-wave-bar sync-chat-wave-bar-active" : "sync-chat-wave-bar"}
          style={{ animationDelay: `${bar * 45}ms` }}
        />
      ))}
    </div>
  );
}

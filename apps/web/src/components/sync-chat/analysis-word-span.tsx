interface AnalysisWordSpanProps {
  word: string;
  index: number;
}

export function AnalysisWordSpan({ word, index }: AnalysisWordSpanProps) {
  return (
    <span
      className="sync-chat-stream-word"
      style={{ animationDelay: `${Math.min(index * 18, 260)}ms` }}
    >
      {word}
    </span>
  );
}

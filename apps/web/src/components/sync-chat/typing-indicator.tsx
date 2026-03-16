import { Shimmer } from "@/components/ai-elements/shimmer";

interface TypingIndicatorProps {
  assistantLabel: string;
  label?: string;
}

export function TypingIndicator({ assistantLabel, label = "Thinking..." }: TypingIndicatorProps) {
  return (
    <div className="mr-auto flex w-full">
      <div className="inline-flex items-center px-1 py-1" role="status" aria-label={assistantLabel} aria-live="polite">
        <Shimmer duration={1.15} className="text-sm leading-6 font-medium">
          {label}
        </Shimmer>
      </div>
    </div>
  );
}

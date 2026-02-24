import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { EventOut } from "@momentarise/shared";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TrackingChrono({ event }: { event: EventOut }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!event.is_tracking || !event.tracking_started_at) return;
    const startedAt = new Date(event.tracking_started_at).getTime() / 1000;
    const acc = event.actual_time_acc_seconds ?? 0;

    const update = () => {
      setElapsed(acc + (Date.now() / 1000 - startedAt));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [event.id, event.is_tracking, event.tracking_started_at, event.actual_time_acc_seconds]);

  if (!event.is_tracking) return null;
  return (
    <View className="rounded bg-primary/20 px-2 py-1">
      <Text className="text-sm font-mono font-medium text-foreground">
        {formatElapsed(elapsed)}
      </Text>
    </View>
  );
}

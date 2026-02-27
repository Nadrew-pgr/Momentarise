import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreateSheet } from "@/lib/store";

/**
 * Fallback route for the center tab.
 * Normal flow intercepts tab press and opens BottomSheetCreate directly.
 * If navigation still reaches this route, redirect to Inbox and open the sheet.
 */
export default function CreateScreenFallback() {
  const router = useRouter();
  const openCreateSheet = useCreateSheet((s) => s.open);

  useEffect(() => {
    openCreateSheet();
    router.replace("/(tabs)/inbox");
  }, [openCreateSheet, router]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="small" />
      </View>
    </SafeAreaView>
  );
}

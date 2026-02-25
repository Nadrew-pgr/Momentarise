import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/lib/store";
import { getToken } from "@/lib/auth";
import { BottomSheetCreate } from "@/components/BottomSheetCreate";
import "@/i18n/config";
import "../global.css";

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, setAuthenticated, setLoading } =
    useAuthStore();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      setAuthenticated(!!token);
      setLoading(false);
    })();
  }, [setAuthenticated, setLoading]);

  useEffect(() => {
    if (isLoading) return;
    const inProtectedGroup = segments[0] === "(tabs)" || segments[0] === "items";
    if (isAuthenticated && !inProtectedGroup) {
      router.replace("/(tabs)/today");
    } else if (!isAuthenticated && inProtectedGroup) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <Slot />
            <BottomSheetCreate />
          </AuthGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

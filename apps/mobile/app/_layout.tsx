import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/lib/store";
import { getOnboardingCompleted, getToken } from "@/lib/auth";
import { CaptureFab } from "@/components/CaptureFab";
import { EventSheet } from "@/components/EventSheet";
import { AppToast } from "@/components/AppToast";
import "@/i18n/config";
import "../global.css";

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const {
    isAuthenticated,
    isLoading,
    hasCompletedOnboarding,
    setAuthenticated,
    setLoading,
    setHasCompletedOnboarding,
  } = useAuthStore();

  useEffect(() => {
    (async () => {
      const [token, onboardingCompleted] = await Promise.all([
        getToken(),
        getOnboardingCompleted(),
      ]);
      setAuthenticated(!!token);
      setHasCompletedOnboarding(onboardingCompleted);
      setLoading(false);
    })();
  }, [setAuthenticated, setHasCompletedOnboarding, setLoading]);

  useEffect(() => {
    if (isLoading) return;

    const currentSegment = segments[0];
    const inOnboarding = currentSegment === "onboarding";
    const inProtectedGroup =
      currentSegment === "(tabs)" ||
      currentSegment === "items" ||
      currentSegment === "inbox" ||
      currentSegment === "sync" ||
      currentSegment === "profile" ||
      currentSegment === "settings" ||
      currentSegment === "help";

    if (!isAuthenticated && (inProtectedGroup || inOnboarding)) {
      router.replace("/login");
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }

    if (hasCompletedOnboarding && inOnboarding) {
      router.replace("/(tabs)/today");
      return;
    }

    if (hasCompletedOnboarding && !inProtectedGroup) {
      router.replace("/(tabs)/today");
    }
  }, [hasCompletedOnboarding, isAuthenticated, isLoading, router, segments]);

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
            <Stack screenOptions={{ headerShown: false }} />
            <CaptureFab />
            <EventSheet />
            <AppToast />
          </AuthGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

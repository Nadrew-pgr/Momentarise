import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateSheet } from "@/lib/store";

/**
 * Route (tabs)/create is hidden from tab bar (href: null).
 * If reached (e.g. deep link), redirect to today and open the FAB overlay.
 */
export default function CreateScreenRedirect() {
  const router = useRouter();
  const openCreateSheet = useCreateSheet((s) => s.open);

  useEffect(() => {
    openCreateSheet();
    router.replace("/(tabs)/today");
  }, [openCreateSheet, router]);

  return <View />;
}

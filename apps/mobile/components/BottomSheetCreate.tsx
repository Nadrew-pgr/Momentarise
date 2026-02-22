import { useCallback, useRef, useEffect } from "react";
import { View, Text } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useCreateSheet } from "@/lib/store";

export function BottomSheetCreate() {
  const { t } = useTranslation();
  const { isOpen, close } = useCreateSheet();
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        close();
      }
    },
    [close]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["40%", "75%"]}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: "#fff" }}
      handleIndicatorStyle={{ backgroundColor: "#d1d5db" }}
    >
      <BottomSheetView className="flex-1 items-center px-6 pt-4">
        <Text className="text-xl font-bold text-foreground">
          {t("create.title")}
        </Text>
        <Text className="mt-4 text-center text-muted-foreground">
          {t("create.placeholder")}
        </Text>
      </BottomSheetView>
    </BottomSheet>
  );
}

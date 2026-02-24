import { useCallback, useRef, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useItemDetailSheet } from "@/lib/store";
import { useItem, useUpdateItem } from "@/hooks/use-item";
import { BlockEditor } from "@/components/BlockEditor";

type TabIndex = 0 | 1 | 2;

export function ItemDetailSheet() {
  const { t } = useTranslation();
  const { itemId, close } = useItemDetailSheet();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [activeTab, setActiveTab] = useState<TabIndex>(0);

  const { data: item, isLoading } = useItem(itemId);
  const updateItem = useUpdateItem(itemId);

  useEffect(() => {
    if (itemId) {
      bottomSheetRef.current?.expand();
      setActiveTab(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [itemId]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        close();
      }
    },
    [close]
  );

  const handleBlocksChange = useCallback(
    (blocks: Record<string, unknown>[]) => {
      if (!itemId) return;
      updateItem.mutate({ blocks });
    },
    [itemId, updateItem]
  );

  if (!itemId) return null;

  const tabs: { key: TabIndex; labelKey: string }[] = [
    { key: 0, labelKey: "pages.item.details" },
    { key: 1, labelKey: "pages.item.blocks" },
    { key: 2, labelKey: "pages.item.coach" },
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["50%", "90%"]}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: "#fff" }}
      handleIndicatorStyle={{ backgroundColor: "#d1d5db" }}
    >
      <BottomSheetView className="flex-1 px-4">
        <View className="mb-3 flex-row border-b border-border">
          {tabs.map(({ key, labelKey }) => (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
              className={`flex-1 py-3 ${activeTab === key ? "border-b-2 border-primary" : ""}`}
            >
              <Text
                className={`text-center text-sm font-medium ${activeTab === key ? "text-foreground" : "text-muted-foreground"}`}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 0 && (
          <BottomSheetScrollView>
            {isLoading ? (
              <Text className="text-muted-foreground py-4 text-sm">{t("pages.inbox.placeholder")}</Text>
            ) : item ? (
              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">{item.title}</Text>
                <Text className="text-muted-foreground text-xs">
                  ID: {item.id}
                </Text>
              </View>
            ) : null}
          </BottomSheetScrollView>
        )}

        {activeTab === 1 && (
          <View className="flex-1 min-h-[200px]">
            {isLoading ? (
              <Text className="text-muted-foreground py-4 text-sm">{t("pages.inbox.placeholder")}</Text>
            ) : item ? (
              <BlockEditor
                value={item.blocks}
                onChange={handleBlocksChange}
                editable={!updateItem.isPending}
              />
            ) : null}
          </View>
        )}

        {activeTab === 2 && (
          <View className="py-8">
            <Text className="text-muted-foreground text-center text-sm">
              {t("pages.item.coachPlaceholder")}
            </Text>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

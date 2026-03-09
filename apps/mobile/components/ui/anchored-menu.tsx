import React, { useMemo } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AnchoredMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AnchoredMenuItem = {
  key: string;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  onPress?: () => void;
};

interface AnchoredMenuProps {
  visible: boolean;
  anchor: AnchoredMenuAnchor | null;
  items: AnchoredMenuItem[];
  onClose: () => void;
  width?: number;
  title?: string;
}

const ITEM_HEIGHT = 44;
const VERTICAL_GAP = 6;
const SCREEN_MARGIN = 8;

export function AnchoredMenu({
  visible,
  anchor,
  items,
  onClose,
  width = 220,
  title,
}: AnchoredMenuProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const estimatedHeight = useMemo(() => {
    const titleHeight = title ? 32 : 0;
    return titleHeight + items.length * ITEM_HEIGHT + 12;
  }, [items.length, title]);

  const position = useMemo(() => {
    if (!anchor) {
      return {
        left: Math.max(SCREEN_MARGIN, screenWidth - width - SCREEN_MARGIN),
        top: Math.max(insets.top + SCREEN_MARGIN, 56),
      };
    }

    const minLeft = SCREEN_MARGIN;
    const maxLeft = Math.max(SCREEN_MARGIN, screenWidth - width - SCREEN_MARGIN);
    const targetLeft = anchor.x + anchor.width - width;
    const left = Math.min(Math.max(targetLeft, minLeft), maxLeft);

    const lowerBound = insets.top + SCREEN_MARGIN;
    const upperBound = screenHeight - insets.bottom - estimatedHeight - SCREEN_MARGIN;
    const belowTop = anchor.y + anchor.height + VERTICAL_GAP;
    const aboveTop = anchor.y - estimatedHeight - VERTICAL_GAP;
    const preferredTop = aboveTop >= lowerBound ? aboveTop : belowTop;
    const top = Math.min(Math.max(preferredTop, lowerBound), Math.max(lowerBound, upperBound));

    return { left, top };
  }, [anchor, estimatedHeight, insets.bottom, insets.top, screenHeight, screenWidth, width]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable className="absolute inset-0 bg-black/25" onPress={onClose} />
      <View
        className="absolute rounded-xl border border-border bg-card py-1 shadow-lg"
        style={{
          left: position.left,
          top: position.top,
          width,
          elevation: 12,
        }}
      >
        {title ? (
          <View className="px-3 pb-1 pt-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </Text>
          </View>
        ) : null}
        {items.map((item) => (
          <Pressable
            key={item.key}
            disabled={item.disabled}
            onPress={() => {
              onClose();
              if (item.onPress) {
                setTimeout(() => item.onPress?.(), 0);
              }
            }}
            className={`mx-1 min-h-11 justify-center rounded-lg px-3 ${
              item.disabled ? "opacity-45" : "active:bg-muted"
            }`}
          >
            <Text
              className={`text-sm ${
                item.destructive ? "text-destructive" : "text-foreground"
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Plus } from "lucide-react-native";
import { useCreateSheet } from "@/lib/store";

const ICON_SIZE = 24;
const WRAPPER_SIZE = ICON_SIZE + 16;

export function CreateTabIcon() {
  const isOpen = useCreateSheet((s) => s.isOpen);
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(rotation, {
        toValue: isOpen ? 1 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
      Animated.spring(scale, {
        toValue: isOpen ? 1.08 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }),
    ]).start();
  }, [isOpen, rotation, scale]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <View
      style={{
        width: WRAPPER_SIZE,
        height: WRAPPER_SIZE,
        borderRadius: WRAPPER_SIZE / 2,
        backgroundColor: "#171717",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
      }}
    >
      <Animated.View
        style={{
          transform: [{ rotate: rotateInterpolate }, { scale }],
        }}
      >
        <Plus size={ICON_SIZE} color="#fff" strokeWidth={2.5} />
      </Animated.View>
    </View>
  );
}

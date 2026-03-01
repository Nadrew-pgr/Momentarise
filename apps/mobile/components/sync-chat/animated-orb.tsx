import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from "react-native-reanimated";

interface AnimatedOrbProps {
  size?: number;
  className?: string; // We'll accept this for layout styling from NativeWind
}

export function AnimatedOrb({ size = 64, className = "" }: AnimatedOrbProps) {
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const rotation3 = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    rotation1.value = withRepeat(
      withTiming(360, {
        duration: 4000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    rotation2.value = withRepeat(
      withTiming(360, {
        duration: 5500,
        easing: Easing.linear,
      }),
      -1,
      true
    );
    rotation3.value = withRepeat(
      withTiming(-360, {
        duration: 6500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    scale.value = withRepeat(
      withTiming(1.15, {
        duration: 2500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation1.value}deg` },
        { translateX: size * 0.15 },
        { scale: scale.value },
      ],
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation2.value}deg` },
        { translateY: size * 0.12 },
        { scale: scale.value * 0.9 },
      ],
    };
  });

  const animatedStyle3 = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation3.value}deg` },
        { translateX: -size * 0.1 },
        { translateY: -size * 0.1 },
        { scale: scale.value * 1.05 },
      ],
    };
  });

  return (
    <View
      className={`items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <View style={[styles.orbContainer, { width: size * 0.8, height: size * 0.8 }]}>
        {/* We use colored blur circles for the effect */}
        <Animated.View
          className="bg-primary/40 absolute rounded-full"
          style={[
            { width: "70%", height: "70%", top: "15%", left: "15%" },
            styles.blurLayer,
            animatedStyle1,
          ]}
        />
        <Animated.View
          className="bg-accent/50 absolute rounded-full"
          style={[
            { width: "60%", height: "60%", top: "20%", left: "20%" },
            styles.blurLayer,
            animatedStyle2,
          ]}
        />
        <Animated.View
          className="bg-primary/30 absolute rounded-full"
          style={[
            { width: "80%", height: "80%", top: "10%", left: "10%" },
            styles.blurLayer,
            animatedStyle3,
          ]}
        />
        {/* Core highlight */}
        <View className="bg-background/20 absolute inset-0 rounded-full" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orbContainer: {
    position: "relative",
    borderRadius: 9999,
    overflow: "hidden",
  },
  blurLayer: {
    /* 
      React Native doesn't have a direct equivalent to CSS blur(10px) that works 
      easily without external heavy SVG or BlurView wrappers.
      A decent approximation for Orbs on mobile is shadow layers or opacity + borders.
      However, if Expo blur is available we could use it, but for a simple "Orb",
      colored opacities combined with NativeWind colors are often sufficient.
    */
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});

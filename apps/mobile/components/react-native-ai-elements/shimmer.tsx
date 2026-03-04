import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    withDelay,
} from "react-native-reanimated";

interface ShimmerProps {
    text?: string;
    duration?: number;
    delay?: number;
}

export function Shimmer({ text = "Thinking...", duration = 2000, delay = 0 }: ShimmerProps) {
    const progress = useSharedValue(0);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        progress.value = withDelay(
            delay,
            withRepeat(
                withTiming(1, { duration, easing: Easing.linear }),
                -1,
                false
            )
        );
    }, [duration, delay, progress]);

    const animatedStyle = useAnimatedStyle(() => {
        // Sweep the mask over the width of the container
        return {
            transform: [{ translateX: (progress.value * 2 - 1) * width }],
        };
    });

    return (
        <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            className="flex-row items-center self-start relative"
        >
            {/* Invisible template text to dictate identical sizing for absolute overlays */}
            <Text className="text-foreground text-[15px] leading-6 font-medium opacity-0">{text}</Text>

            <View style={{ ...StyleSheet.absoluteFillObject }}>
                {/* Base text, dimmed */}
                <Text className="text-muted-foreground text-[15px] leading-6 font-medium absolute left-0 top-0">
                    {text}
                </Text>

                {width > 0 && (
                    <MaskedView
                        style={{ ...StyleSheet.absoluteFillObject }}
                        maskElement={
                            <Text style={{ color: "black" }} className="text-[15px] leading-6 font-medium absolute left-0 top-0">
                                {text}
                            </Text>
                        }
                    >
                        {/* Sweeping gradient container */}
                        <Animated.View style={[{ ...StyleSheet.absoluteFillObject }, animatedStyle, { width: width * 1.5, left: -width * 0.25 }]}>
                            <LinearGradient
                                // Neutral bright shine
                                colors={["transparent", "rgba(180, 180, 180, 0.5)", "rgba(255, 255, 255, 0.9)", "rgba(180, 180, 180, 0.5)", "transparent"]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={{ ...StyleSheet.absoluteFillObject }}
                            />
                        </Animated.View>
                    </MaskedView>
                )}
            </View>
        </View>
    );
}

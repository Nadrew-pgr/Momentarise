import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing
} from 'react-native-reanimated';

export function EmptyState() {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, [scale, opacity]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        };
    });

    return (
        <View className="flex-1 items-center justify-center min-h-[400px]">
            <View className="items-center justify-center">
                {/* Outer Glow */}
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                        },
                        animatedStyle
                    ]}
                >
                    <View className="w-[140px] h-[140px] rounded-full bg-primary opacity-20" />
                </Animated.View>

                {/* Inner Orb */}
                <Animated.View
                    style={animatedStyle}
                >
                    <View
                        className="w-[80px] h-[80px] rounded-full bg-primary"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: 15,
                            elevation: 8,
                        }}
                    />
                </Animated.View>

            </View>
            <Text className="text-muted-foreground text-[16px] font-medium tracking-wide mt-12">
                What can I help you build today?
            </Text>
        </View>
    );
}

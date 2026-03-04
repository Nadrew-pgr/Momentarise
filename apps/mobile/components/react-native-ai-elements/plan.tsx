import React, { createContext, useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ViewProps, TextProps } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useAnimatedStyle, withTiming, useSharedValue, Easing } from 'react-native-reanimated';
import { ChevronsUpDown } from 'lucide-react-native';
import { Shimmer } from './shimmer';

interface PlanContextValue {
    isStreaming: boolean;
    isOpen: boolean;
    toggleOpen: () => void;
    heightValue: Animated.SharedValue<number>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export const usePlan = () => {
    const context = useContext(PlanContext);
    if (!context) {
        throw new Error('Plan components must be used within Plan');
    }
    return context;
};

export interface PlanProps extends ViewProps {
    isStreaming?: boolean;
    defaultOpen?: boolean;
}

export const Plan = ({
    className = "",
    isStreaming = false,
    defaultOpen = true,
    children,
    ...props
}: PlanProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const heightValue = useSharedValue(isOpen ? 1 : 0);

    const toggleOpen = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        heightValue.value = withTiming(nextState ? 1 : 0, {
            duration: 300,
            easing: Easing.inOut(Easing.ease)
        });
    };

    return (
        <PlanContext.Provider value={{ isStreaming, isOpen, toggleOpen, heightValue }}>
            <Animated.View
                entering={FadeInUp.duration(300).springify()}
                exiting={FadeOutUp}
                className={`w-full mb-3 rounded-xl border border-border/40 bg-card overflow-hidden ${className}`}
                {...props}
            >
                {children}
            </Animated.View>
        </PlanContext.Provider>
    );
};

export const PlanHeader = ({ className = "", children, ...props }: ViewProps) => (
    <View className={`flex-row items-start justify-between p-4 ${className}`} {...props}>
        {children}
    </View>
);

export const PlanTitle = ({ children, className = "", ...props }: TextProps) => {
    const { isStreaming } = usePlan();
    return (
        <Text className={`text-base font-semibold text-foreground mb-1 ${className}`} {...props}>
            {isStreaming && typeof children === 'string' ? <Shimmer>{children}</Shimmer> : children}
        </Text>
    );
};

export const PlanDescription = ({ children, className = "", ...props }: TextProps) => {
    const { isStreaming } = usePlan();
    return (
        <Text className={`text-sm text-muted-foreground ${className}`} {...props}>
            {isStreaming && typeof children === 'string' ? <Shimmer>{children}</Shimmer> : children}
        </Text>
    );
};

export const PlanAction = ({ className = "", children, ...props }: ViewProps) => (
    <View className={`ml-4 ${className}`} {...props}>
        {children}
    </View>
);

export const PlanContent = ({ className = "", children, ...props }: ViewProps) => {
    const { isOpen, heightValue } = usePlan();

    const animatedContentStyle = useAnimatedStyle(() => ({
        opacity: heightValue.value,
        marginTop: heightValue.value > 0 ? 0 : -20, // subtle slide
    }));

    if (!isOpen) return null;

    return (
        <Animated.View style={animatedContentStyle}>
            <View className={`p-4 pt-0 ${className}`} {...props}>
                {children}
            </View>
        </Animated.View>
    );
};

export const PlanFooter = ({ className = "", children, ...props }: ViewProps) => (
    <View className={`p-4 pt-0 border-t border-border/20 ${className}`} {...props}>
        {children}
    </View>
);

export const PlanTrigger = ({ className = "", ...props }: React.ComponentProps<typeof TouchableOpacity>) => {
    const { toggleOpen, heightValue } = usePlan();

    // Animate rotation based on height value (0 to 1) mapped to 0 to 180 degrees
    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${heightValue.value * 180}deg` }]
    }));

    return (
        <TouchableOpacity
            onPress={toggleOpen}
            className={`w-8 h-8 rounded-full items-center justify-center hover:bg-muted active:bg-muted ${className}`}
            {...props}
        >
            <Animated.View style={animatedIconStyle}>
                <ChevronsUpDown size={16} className="text-muted-foreground" />
            </Animated.View>
        </TouchableOpacity>
    );
};

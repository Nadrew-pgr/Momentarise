import React from "react";
import { View } from "react-native";
import { Shimmer } from "./shimmer";

export function TypingIndicator() {
    return (
        <View className="flex-row items-center self-start">
            <Shimmer text="Thinking..." duration={1800} />
        </View>
    );
}

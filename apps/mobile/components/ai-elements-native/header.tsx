import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Menu, Plus } from 'lucide-react-native';

interface HeaderProps {
    onMenuPress?: () => void;
    onNewChatPress?: () => void;
}

export function Header({ onMenuPress, onNewChatPress }: HeaderProps) {
    return (
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 relative z-10">
            {/* New Chat */}
            <TouchableOpacity onPress={onNewChatPress} className="w-10 h-10 items-center justify-center rounded-full hover:bg-muted active:bg-muted">
                <Plus size={22} className="text-foreground" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Title / Logo */}
            <Text className="text-[17px] font-semibold tracking-tight text-foreground">
                Sync
            </Text>

            {/* History Menu */}
            <TouchableOpacity onPress={onMenuPress} className="w-10 h-10 items-center justify-center rounded-full hover:bg-muted active:bg-muted">
                <Menu size={22} className="text-foreground" strokeWidth={2.5} />
            </TouchableOpacity>
        </View>
    );
}

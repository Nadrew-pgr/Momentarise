import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { EllipsisVertical, Plus } from 'lucide-react-native';

interface HeaderProps {
    title?: string;
    breadcrumb?: string;
    conversationTitle?: string;
    onMenuPress?: () => void;
    onNewChatPress?: () => void;
    rightSlot?: React.ReactNode;
}

export function Header({
    title = "Chat",
    breadcrumb,
    conversationTitle,
    onMenuPress,
    onNewChatPress,
    rightSlot,
}: HeaderProps) {
    return (
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 relative z-10">
            {/* New Chat */}
            <TouchableOpacity onPress={onNewChatPress} className="w-10 h-10 items-center justify-center rounded-full hover:bg-muted active:bg-muted">
                <Plus size={22} className="text-foreground" strokeWidth={2.5} />
            </TouchableOpacity>

            <View className="flex-1 px-2 items-center">
                {breadcrumb ? (
                    <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                        {breadcrumb}
                    </Text>
                ) : null}
                <Text className="text-[17px] font-semibold tracking-tight text-foreground" numberOfLines={1}>
                    {conversationTitle ?? title}
                </Text>
            </View>

            {rightSlot ? (
                <View className="flex-row items-center gap-1">{rightSlot}</View>
            ) : (
                <TouchableOpacity onPress={onMenuPress} className="w-10 h-10 items-center justify-center rounded-full hover:bg-muted active:bg-muted">
                    <EllipsisVertical size={20} className="text-foreground" strokeWidth={2.5} />
                </TouchableOpacity>
            )}
        </View>
    );
}

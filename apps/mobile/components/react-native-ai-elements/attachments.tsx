import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { X, FileText, Image as ImageIcon, Music, Video, Link2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export type AttachmentType = 'image' | 'video' | 'audio' | 'document' | 'link' | 'unknown';
export type AttachmentVariant = 'grid' | 'list' | 'inline';

export interface AttachmentData {
    id: string;
    type: AttachmentType;
    url?: string;
    filename?: string;
    mimeType?: string;
}

export interface AttachmentsProps {
    data: AttachmentData[];
    variant?: AttachmentVariant;
    onRemove?: (id: string) => void;
}

const TYPE_ICONS = {
    image: ImageIcon,
    video: Video,
    audio: Music,
    document: FileText,
    link: Link2,
    unknown: FileText,
};

export function Attachments({ data, variant = 'grid', onRemove }: AttachmentsProps) {
    if (!data.length) return null;

    const isGrid = variant === 'grid';

    return (
        <View className={`flex-row ${isGrid ? 'flex-wrap' : 'flex-col'} gap-2 ${isGrid ? 'mb-2' : 'mb-4'}`}>
            {data.map((attachment) => (
                <AttachmentItem
                    key={attachment.id}
                    attachment={attachment}
                    variant={variant}
                    onRemove={onRemove ? () => onRemove(attachment.id) : undefined}
                />
            ))}
        </View>
    );
}

function AttachmentItem({
    attachment,
    variant,
    onRemove
}: {
    attachment: AttachmentData;
    variant: AttachmentVariant;
    onRemove?: () => void;
}) {
    const isImage = attachment.type === 'image' && attachment.url;
    const Icon = TYPE_ICONS[attachment.type] || TYPE_ICONS.unknown;
    const isGrid = variant === 'grid';
    const isInline = variant === 'inline';

    if (isGrid) {
        return (
            <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border/50"
            >
                {isImage ? (
                    <Image source={{ uri: attachment.url }} className="w-full h-full" resizeMode="cover" />
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <Icon size={24} className="text-muted-foreground" />
                        <Text className="text-[10px] text-muted-foreground mt-1 text-center px-1" numberOfLines={1}>
                            {attachment.filename || 'File'}
                        </Text>
                    </View>
                )}
                {onRemove && (
                    <TouchableOpacity
                        onPress={onRemove}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 items-center justify-center backdrop-blur-md"
                        accessibilityRole="button"
                        accessibilityLabel="Remove attachment"
                    >
                        <X size={12} className="text-foreground" strokeWidth={3} />
                    </TouchableOpacity>
                )}
            </Animated.View>
        );
    }

    if (isInline) {
        return (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="flex-row items-center bg-accent/50 border border-border/50 rounded-md px-2 py-1 self-start mb-2 mr-2">
                <Icon size={14} className="text-muted-foreground mr-1.5" />
                <Text className="text-sm font-medium text-foreground mr-1" numberOfLines={1} style={{ maxWidth: 150 }}>
                    {attachment.filename || 'Link'}
                </Text>
                {onRemove && (
                    <TouchableOpacity onPress={onRemove} className="ml-1 p-0.5">
                        <X size={12} className="text-muted-foreground" />
                    </TouchableOpacity>
                )}
            </Animated.View>
        );
    }

    // List view
    return (
        <Animated.View entering={FadeIn} exiting={FadeOut} className="flex-row items-center p-3 rounded-xl border border-border/50 bg-card">
            <View className="w-10 h-10 rounded-lg bg-muted items-center justify-center mr-3 overflow-hidden">
                {isImage ? (
                    <Image source={{ uri: attachment.url }} className="w-full h-full" resizeMode="cover" />
                ) : (
                    <Icon size={20} className="text-muted-foreground" />
                )}
            </View>
            <View className="flex-1 justify-center">
                <Text className="text-[15px] font-medium text-foreground" numberOfLines={1}>
                    {attachment.filename || 'Document'}
                </Text>
                {attachment.mimeType && (
                    <Text className="text-[12px] text-muted-foreground mt-0.5" numberOfLines={1}>
                        {attachment.mimeType}
                    </Text>
                )}
            </View>
            {onRemove && (
                <TouchableOpacity onPress={onRemove} className="p-2 ml-2 rounded-full hover:bg-muted">
                    <X size={16} className="text-muted-foreground" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

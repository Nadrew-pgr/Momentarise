import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withDelay
} from 'react-native-reanimated';
import { Mic, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';

export interface SpeechInputProps {
    onAudioRecorded?: (uri: string) => Promise<string>;
    onTranscriptionChange?: (text: string) => void;
    disabled?: boolean;
    className?: string;
}

export function SpeechInput({
    onAudioRecorded,
    onTranscriptionChange,
    disabled = false,
    className = ""
}: SpeechInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const recordingRef = useRef<Audio.Recording | null>(null);

    // Animation values for the pulsing rings
    const scale1 = useSharedValue(1);
    const opacity1 = useSharedValue(0.5);
    const scale2 = useSharedValue(1);
    const opacity2 = useSharedValue(0.5);

    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();

        return () => {
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync();
            }
        };
    }, []);

    useEffect(() => {
        if (isListening) {
            startPulsing();
        } else {
            stopPulsing();
        }
    }, [isListening]);

    const startPulsing = () => {
        const createPulse = (scaleValue: Animated.SharedValue<number>, opacityValue: Animated.SharedValue<number>, delay: number) => {
            scaleValue.value = withDelay(
                delay,
                withRepeat(withTiming(1.6, { duration: 1500 }), -1, false)
            );
            opacityValue.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(0, { duration: 1500 }),
                        withTiming(0.5, { duration: 0 })
                    ),
                    -1,
                    false
                )
            );
        };

        createPulse(scale1, opacity1, 0);
        createPulse(scale2, opacity2, 750);
    };

    const stopPulsing = () => {
        scale1.value = 1;
        opacity1.value = 0;
        scale2.value = 1;
        opacity2.value = 0;
    };

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: scale1.value }],
        opacity: opacity1.value,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: scale2.value }],
        opacity: opacity2.value,
    }));

    const startRecording = async () => {
        try {
            if (!hasPermission) {
                const { status } = await Audio.requestPermissionsAsync();
                if (status !== 'granted') return;
                setHasPermission(true);
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            recordingRef.current = recording;
            setIsListening(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            setIsListening(false);
        }
    };

    const stopRecording = async () => {
        if (!recordingRef.current) return;

        try {
            setIsListening(false);
            setIsProcessing(true);

            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            if (uri && onAudioRecorded) {
                try {
                    const transcript = await onAudioRecorded(uri);
                    if (transcript && onTranscriptionChange) {
                        onTranscriptionChange(transcript);
                    }
                } catch (e) {
                    console.error('Transcription failed:', e);
                }
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const isDisabled = disabled || isProcessing;

    return (
        <View className={`relative items-center justify-center ${className}`}>
            {/* Animated Rings */}
            {isListening && (
                <>
                    <Animated.View
                        style={[ring1Style, { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, borderWidth: 2, borderColor: '#ef4444' }]}
                    />
                    <Animated.View
                        style={[ring2Style, { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, borderWidth: 2, borderColor: '#ef4444' }]}
                    />
                </>
            )}

            <TouchableOpacity
                onPress={toggleListening}
                disabled={isDisabled}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors z-10 ${isListening ? 'bg-destructive' : 'bg-muted'
                    }`}
                accessibilityRole="button"
                accessibilityLabel={isListening ? "Stop dictation" : "Start dictation"}
            >
                {isListening ? (
                    <Square size={16} color="#FFFFFF" fill="currentColor" />
                ) : (
                    <Mic size={18} className="text-foreground" strokeWidth={2.5} />
                )}
            </TouchableOpacity>
        </View>
    );
}

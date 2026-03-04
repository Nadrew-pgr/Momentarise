"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSegments } from "expo-router";
import { useTranslation } from "react-i18next";
import { BlurView } from "expo-blur";
import { Bot, Calendar, Camera, FileImage, FileText, Link2, Mic, X } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateSheet } from "@/lib/store";
import { useCreateActions } from "@/hooks/use-create-actions";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACTION_KEYS = ["note", "voice", "photo", "gallery", "file", "link", "event", "sync"] as const;
const RADIUS = 110;
const BUTTON_SIZE = 56;
const STAGGER_MS = 15;

function getActionPosition(index: number, centerX: number, centerY: number) {
  const angleDeg = -90 + (index * 360) / ACTION_KEYS.length;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = centerX + Math.cos(angleRad) * RADIUS - BUTTON_SIZE / 2;
  const y = centerY + Math.sin(angleRad) * RADIUS - BUTTON_SIZE / 2;
  return { left: x, top: y };
}

function ActionButton({
  scale,
  left,
  top,
  label,
  icon,
  onPress,
  disabled,
}: {
  scale: Animated.SharedValue<number>;
  left: number;
  top: number;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));
  return (
    <Animated.View
      style={[
        styles.actionButtonWrapper,
        { left, top, width: BUTTON_SIZE, height: BUTTON_SIZE },
        animatedStyle,
      ]}
      pointerEvents="auto"
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={styles.actionButton}
      >
        {icon}
        <Text numberOfLines={1} style={styles.actionLabel}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function CaptureFab() {
  const segments = useSegments();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isOpen, close } = useCreateSheet();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const actions = useCreateActions(close);
  const {
    openNoteCapture,
    openSync,
    openEvent,
    openFileCapture,
    openPhotoCapture,
    openPhotoLibraryCapture,
    handleVoiceCapture,
    submitLinkCapture,
    isBusy,
    isRecording,
  } = actions;

  const inTabs = segments[0] === "(tabs)";
  const { width, height } = Dimensions.get("window");
  const centerX = width / 2;
  const centerY = height / 2;

  const overlayOpacity = useSharedValue(0);
  const centerScale = useSharedValue(0);
  const actionScales = ACTION_KEYS.map(() => useSharedValue(0));

  useEffect(() => {
    if (isOpen) {
      overlayOpacity.value = withTiming(1, { duration: 120 });
      centerScale.value = withSpring(1, { damping: 18, stiffness: 220 });
      actionScales.forEach((s, i) => {
        s.value = withDelay(
          i * STAGGER_MS,
          withSpring(1, { damping: 16, stiffness: 200 })
        );
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 100 });
      centerScale.value = withTiming(0, { duration: 90 });
      actionScales.forEach((s) => {
        s.value = withTiming(0, { duration: 70 });
      });
    }
  }, [isOpen, overlayOpacity, centerScale, actionScales]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const centerButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
    opacity: centerScale.value,
  }));

  const handleAction = useCallback(
    (key: (typeof ACTION_KEYS)[number]) => {
      if (key === "note") {
        openNoteCapture();
        return;
      }
      if (key === "voice") {
        handleVoiceCapture();
        return;
      }
      if (key === "photo") {
        void openPhotoCapture();
        close();
        return;
      }
      if (key === "gallery") {
        void openPhotoLibraryCapture();
        close();
        return;
      }
      if (key === "file") {
        void openFileCapture();
        close();
        return;
      }
      if (key === "link") {
        setLinkValue("");
        setShowLinkModal(true);
        return;
      }
      if (key === "event") {
        openEvent();
        return;
      }
      if (key === "sync") {
        openSync();
      }
    },
    [
      close,
      handleVoiceCapture,
      openEvent,
      openFileCapture,
      openNoteCapture,
      openPhotoCapture,
      openPhotoLibraryCapture,
      openSync,
    ]
  );

  const handleSubmitLink = useCallback(() => {
    submitLinkCapture(linkValue);
    setShowLinkModal(false);
    setLinkValue("");
    close();
  }, [close, linkValue, submitLinkCapture]);

  const fr = (i18n.language || "").toLowerCase().startsWith("fr");
  const actionLabels: Record<(typeof ACTION_KEYS)[number], string> = {
    note: t("create.options.note.title"),
    voice: isRecording ? (fr ? "Arrêter" : "Stop") : t("create.options.voice.title"),
    photo: t("create.options.photo.title"),
    gallery: t("create.options.gallery.title"),
    file: t("create.options.file.title"),
    link: t("create.options.link.title"),
    event: t("create.options.event.title"),
    sync: t("create.options.sync.title"),
  };

  const actionIcons: Record<(typeof ACTION_KEYS)[number], React.ReactNode> = {
    note: <FileText size={24} color="#171717" />,
    voice: <Mic size={24} color="#171717" />,
    photo: <Camera size={24} color="#171717" />,
    gallery: <FileImage size={24} color="#171717" />,
    file: <FileText size={24} color="#171717" />,
    link: <Link2 size={24} color="#171717" />,
    event: <Calendar size={24} color="#171717" />,
    sync: <Bot size={24} color="#171717" />,
  };

  if (!inTabs) return null;

  return (
    <>
      {/* Overlay: blur + circle + center X — always mounted when inTabs for stable hooks */}
      {/* The + trigger is now in the tab bar (see (tabs)/_layout.tsx) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          overlayAnimatedStyle,
          { zIndex: 90, elevation: 90 },
        ]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <BlurView
          intensity={60}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel={t("common.cancel")}
        />

        {/* Action buttons in circle */}
        {ACTION_KEYS.map((key, index) => {
          const pos = getActionPosition(index, centerX, centerY);
          return (
            <ActionButton
              key={key}
              scale={actionScales[index]}
              left={pos.left}
              top={pos.top}
              label={actionLabels[key]}
              icon={actionIcons[key]}
              onPress={() => handleAction(key)}
              disabled={isBusy && key !== "voice"}
            />
          );
        })}

        {/* Center X button */}
        <Animated.View
          style={[
            styles.centerButtonWrapper,
            {
              left: centerX - 28,
              top: centerY - 28,
            },
            centerButtonAnimatedStyle,
          ]}
          pointerEvents="auto"
        >
          <Pressable
            onPress={close}
            style={styles.centerButton}
            accessibilityLabel={t("common.cancel")}
          >
            <X size={28} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Recording pill */}
      {isOpen && isRecording && (
        <View
          style={[
            styles.recordingPill,
            { bottom: insets.bottom + 100 },
          ]}
        >
          <Text style={styles.recordingPillText}>
            {fr ? "Enregistrement…" : "Recording…"}
          </Text>
          <Pressable
            onPress={() => handleVoiceCapture()}
            style={styles.recordingPillButton}
          >
            <Text style={styles.recordingPillButtonText}>
              {fr ? "Arrêter" : "Stop"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Link URL modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create.options.link.title")}</DialogTitle>
          </DialogHeader>
          <Input
            value={linkValue}
            onChangeText={setLinkValue}
            placeholder="https://example.com"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Pressable style={styles.modalCancelButton}>
                <Text>{t("common.cancel")}</Text>
              </Pressable>
            </DialogClose>
            <Pressable
              onPress={handleSubmitLink}
              disabled={!linkValue.trim() || isBusy}
              style={[
                styles.modalSubmitButton,
                (!linkValue.trim() || isBusy) && styles.modalSubmitButtonDisabled,
              ]}
            >
              <Text style={styles.modalSubmitButtonText}>
                {t("create.options.link.title")}
              </Text>
            </Pressable>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  actionButtonWrapper: {
    position: "absolute",
    zIndex: 102,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  actionLabel: {
    fontSize: 9,
    color: "#171717",
    marginTop: 2,
    maxWidth: BUTTON_SIZE - 4,
  },
  centerButtonWrapper: {
    position: "absolute",
    width: 56,
    height: 56,
    zIndex: 103,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingPill: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    zIndex: 104,
    elevation: 10,
  },
  recordingPillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  recordingPillButton: {
    backgroundColor: "rgba(239,68,68,0.9)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  recordingPillButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a3a3a3",
  },
  modalSubmitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#171717",
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },
  modalSubmitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

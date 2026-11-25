import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../constants/theme";

type AppModalProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  destructive?: boolean;
};

export function AppModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  destructive = false,
}: AppModalProps) {
  const [rendered, setRendered] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 24,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, backdropOpacity, cardTranslateY]);

  const requestClose = () => {
    if (visible) onClose();
  };

  if (!rendered) return null;

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={requestClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>
        <Animated.View
          style={[styles.card, { transform: [{ translateY: cardTranslateY }] }]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text
                style={[styles.title, destructive && styles.destructiveTitle]}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ModalActions({
  primaryLabel,
  onPrimary,
  secondaryLabel = "Cancel",
  onSecondary,
  busy = false,
  destructive = false,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  return (
    <View style={styles.actions}>
      <Pressable
        onPress={onSecondary}
        disabled={busy}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelText}>{secondaryLabel}</Text>
      </Pressable>
      <Pressable
        onPress={onPrimary}
        disabled={busy}
        style={[
          styles.primaryButton,
          destructive && styles.destructiveButton,
          busy && styles.disabled,
        ]}
      >
        <Text style={styles.primaryText}>
          {busy ? "Working…" : primaryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 16 },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(33, 26, 24, 0.52)",
  },
  card: {
    maxHeight: "92%",
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerCopy: { flex: 1, gap: 4 },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "900" },
  destructiveTitle: { color: theme.colors.primaryDark },
  subtitle: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: theme.colors.primary, fontSize: 25, lineHeight: 28 },
  content: { paddingHorizontal: 18, paddingBottom: 18, gap: 12 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 14,
  },
  actions: { flexDirection: "row", gap: 9 },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: theme.colors.primary, fontSize: 13, fontWeight: "800" },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveButton: { backgroundColor: "#9B1C1C" },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.5 },
});

import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type AppModalProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  destructive?: boolean;
};

export function AppModal({ visible, title, subtitle, onClose, children, footer, destructive = false }: AppModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, destructive && styles.destructiveTitle]}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ModalActions({
  primaryLabel,
  onPrimary,
  secondaryLabel = 'Cancel',
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
      <Pressable onPress={onSecondary} disabled={busy} style={styles.cancelButton}>
        <Text style={styles.cancelText}>{secondaryLabel}</Text>
      </Pressable>
      <Pressable onPress={onPrimary} disabled={busy} style={[styles.primaryButton, destructive && styles.destructiveButton, busy && styles.disabled]}>
        <Text style={styles.primaryText}>{busy ? 'Working…' : primaryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(33, 26, 24, 0.52)', justifyContent: 'center', padding: 16 },
  card: { maxHeight: '92%', borderRadius: 20, backgroundColor: theme.colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  headerCopy: { flex: 1, gap: 4 },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '900' },
  destructiveTitle: { color: theme.colors.primaryDark },
  subtitle: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: theme.colors.primary, fontSize: 25, lineHeight: 28 },
  content: { paddingHorizontal: 18, paddingBottom: 18, gap: 12 },
  footer: { borderTopWidth: 1, borderTopColor: theme.colors.border, padding: 14 },
  actions: { flexDirection: 'row', gap: 9 },
  cancelButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  primaryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  destructiveButton: { backgroundColor: '#9B1C1C' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});

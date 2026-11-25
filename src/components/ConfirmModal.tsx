import { ReactNode } from 'react';
import { Text, StyleSheet } from 'react-native';
import { AppModal, ModalActions } from './AppModal';
import { theme } from '../constants/theme';

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  destructive = false,
  children,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  destructive?: boolean;
  children?: ReactNode;
}) {
  return (
    <AppModal
      visible={visible}
      title={title}
      subtitle={destructive ? 'Please review this action before continuing.' : undefined}
      onClose={onCancel}
      destructive={destructive}
      footer={
        <ModalActions
          primaryLabel={confirmLabel}
          onPrimary={onConfirm}
          onSecondary={onCancel}
          busy={busy}
          destructive={destructive}
        />
      }
    >
      <Text style={styles.message}>{message}</Text>
      {children}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  message: { color: theme.colors.text, fontSize: 13, lineHeight: 19 },
});

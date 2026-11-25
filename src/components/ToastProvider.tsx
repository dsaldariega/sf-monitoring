import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

type ToastState = {
  message: string;
  kind: ToastKind;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const value = useMemo<ToastContextValue>(() => ({
    showToast: (message, kind = 'success') => {
      setToast({ message, kind });
      setTimeout(() => setToast(null), 2600);
    },
  }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.host}>
          <View style={[styles.toast, styles[toast.kind]]}>
            <Text style={styles.title}>{toast.kind === 'success' ? 'Success' : toast.kind === 'error' ? 'Error' : toast.kind === 'warning' ? 'Notice' : 'Info'}</Text>
            <Text style={styles.message}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider.');
  return value;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  success: { backgroundColor: '#E8F5EE', borderColor: '#9AD4B2' },
  error: { backgroundColor: '#FCE8E6', borderColor: '#E2A5A0' },
  warning: { backgroundColor: '#FFF4E5', borderColor: '#F1C48B' },
  info: { backgroundColor: theme.colors.accent, borderColor: theme.colors.border },
  title: { color: theme.colors.text, fontSize: 11, fontWeight: '900' },
  message: { color: theme.colors.text, fontSize: 12, lineHeight: 17, marginTop: 2 },
});

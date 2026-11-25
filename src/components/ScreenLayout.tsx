import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

type ScreenLayoutProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function ScreenLayout({ title, description, children }: ScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>SINKING FUND MONTHLY MONITOR</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 36,
    gap: theme.spacing.lg,
  },
  heading: {
    gap: 7,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  title: {
    color: theme.colors.text,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});

import type { PropsWithChildren } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
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
        <View style={styles.brandRow}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <View style={styles.brandText}>
            <Text style={styles.eyebrow}>SINKING FUND</Text>
            <Text style={styles.brandName}>Monthly Monitor</Text>
          </View>
        </View>

        <View style={styles.heading}>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  brandText: {
    gap: 1,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heading: {
    gap: 7,
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

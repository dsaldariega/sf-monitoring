import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import type { MemberRecord } from '../database/database.types';
import { createMember, listMembers, setMemberActive } from '../services/memberService';
import { theme } from '../constants/theme';

export function MembersScreen() {
  const db = useSQLiteContext();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [memberCode, setMemberCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshMembers = useCallback(async () => {
    try {
      setMembers(await listMembers(db));
    } catch {
      setError('Unable to load member records.');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshMembers();
    }, [refreshMembers])
  );

  const handleAddMember = async () => {
    setError('');
    setSaving(true);
    try {
      await createMember(db, { memberCode, fullName, contactNumber, referenceNote });
      setMemberCode('');
      setFullName('');
      setContactNumber('');
      setReferenceNote('');
      await refreshMembers();
      Alert.alert('Member added', 'The member record was saved on this device.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this member.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (member: MemberRecord) => {
    const nextActive = member.is_active !== 1;
    Alert.alert(
      nextActive ? 'Reactivate member?' : 'Deactivate member?',
      nextActive
        ? `Reactivate ${member.member_code}?`
        : `Deactivate ${member.member_code}? Existing loan and payment history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextActive ? 'Reactivate' : 'Deactivate',
          style: nextActive ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await setMemberActive(db, member.id, nextActive);
              await refreshMembers();
            } catch {
              setError('Unable to update this member.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenLayout
      title="Members"
      description="Register members using their assigned ID. These details remain in the local database on this device."
    >
      <SectionCard title="Add member" subtitle="Use an ID such as A1, A2, or another unique reference.">
        <Field label="Member ID" value={memberCode} onChangeText={setMemberCode} placeholder="e.g. A1" autoCapitalize="characters" />
        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Member full name" />
        <Field label="Contact number (optional)" value={contactNumber} onChangeText={setContactNumber} placeholder="Contact number" keyboardType="phone-pad" />
        <Field label="Private reference / remarks (optional)" value={referenceNote} onChangeText={setReferenceNote} placeholder="Optional note" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={saving ? 'Saving…' : 'Save member'} onPress={handleAddMember} disabled={saving} />
      </SectionCard>

      <SectionCard title={`Member records · ${members.length}`} subtitle="Deactivated members are retained so their loan history is not lost.">
        {members.length === 0 ? (
          <Text style={styles.empty}>No members registered yet.</Text>
        ) : members.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberCode}>{member.member_code}</Text>
              <Text style={styles.memberName}>{member.full_name}</Text>
              {member.contact_number ? <Text style={styles.meta}>{member.contact_number}</Text> : null}
              {member.is_active !== 1 ? <Text style={styles.inactive}>Inactive</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleToggleActive(member)}
              style={[styles.smallButton, member.is_active === 1 && styles.deactivateButton]}
            >
              <Text style={[styles.smallButtonText, member.is_active === 1 && styles.deactivateText]}>
                {member.is_active === 1 ? 'Deactivate' : 'Reactivate'}
              </Text>
            </Pressable>
          </View>
        ))}
      </SectionCard>
    </ScreenLayout>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} style={styles.input} placeholderTextColor={theme.colors.muted} />
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabled]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    color: theme.colors.text,
    fontSize: 14,
  },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  empty: { color: theme.colors.muted, fontSize: 13 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  memberInfo: { flex: 1, gap: 3 },
  memberCode: { color: theme.colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  memberName: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  meta: { color: theme.colors.muted, fontSize: 11 },
  inactive: { color: theme.colors.warning, fontSize: 11, fontWeight: '700' },
  smallButton: { borderRadius: 9, backgroundColor: theme.colors.accent, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  deactivateButton: { backgroundColor: '#FCE8E6' },
  deactivateText: { color: '#B42318' },
});

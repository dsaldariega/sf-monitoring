import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import type { MemberRecord } from '../database/database.types';
import { createMember, listMembers, setMemberActive, updateMemberHeads } from '../services/memberService';
import { theme } from '../constants/theme';

export function MembersScreen() {
  const db = useSQLiteContext();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [memberCode, setMemberCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [heads, setHeads] = useState('1');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingHeads, setEditingHeads] = useState('');

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
      await createMember(db, { memberCode, fullName, heads: Number(heads), contactNumber });
      setMemberCode('');
      setFullName('');
      setHeads('1');
      setContactNumber('');
      await refreshMembers();
      Alert.alert('Member added', 'The member record was saved on this device.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this member.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateHeads = async (memberId: number) => {
    setError('');
    const nextHeads = Number(editingHeads);
    if (!Number.isSafeInteger(nextHeads) || nextHeads < 1 || nextHeads > 999) {
      setError('Heads must be a whole number from 1 to 999.');
      return;
    }

    try {
      await updateMemberHeads(db, memberId, nextHeads);
      setEditingMemberId(null);
      setEditingHeads('');
      await refreshMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update member heads.');
    }
  };

  const handleToggleActive = (member: MemberRecord) => {
    const nextActive = member.is_active !== 1;
    Alert.alert(
      nextActive ? 'Reactivate member?' : 'Deactivate member?',
      nextActive
        ? `Reactivate Member ${member.member_code}?`
        : `Deactivate Member ${member.member_code}? Existing loan and payment history will be preserved.`,
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
      description="Register members using a simple numeric ID. Full name is optional for privacy."
    >
      <SectionCard title="Add member" subtitle="Use a numeric member ID such as 1, 2, 3, and so on.">
        <Field
          label="Member ID"
          value={memberCode}
          onChangeText={setMemberCode}
          placeholder="e.g. 1"
          keyboardType="number-pad"
        />
        <Field
          label="Heads"
          value={heads}
          onChangeText={setHeads}
          placeholder="e.g. 4"
          keyboardType="number-pad"
        />
        <Field
          label="Full name (optional)"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Leave blank for privacy"
        />
        <Field
          label="Contact number (optional)"
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="Contact number"
          keyboardType="phone-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={saving ? 'Saving…' : 'Save member'} onPress={handleAddMember} disabled={saving} />
      </SectionCard>

      <SectionCard title={`Member records · ${members.length}`} subtitle="Deactivated members are retained so their loan history is not lost.">
        {members.length === 0 ? (
          <Text style={styles.empty}>No members registered yet.</Text>
        ) : members.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberCode}>Member {member.member_code}</Text>
              <Text style={styles.memberName}>
                {member.full_name.trim() || 'Name not provided'}
              </Text>
              <Text style={styles.meta}>{member.heads} heads · {formatWeeklyDue(member.heads)}</Text>
              {member.contact_number ? <Text style={styles.meta}>{member.contact_number}</Text> : null}
              {member.is_active !== 1 ? <Text style={styles.inactive}>Inactive</Text> : null}
              {editingMemberId === member.id ? (
                <View style={styles.editHeadsRow}>
                  <TextInput
                    value={editingHeads}
                    onChangeText={setEditingHeads}
                    keyboardType="number-pad"
                    style={styles.editHeadsInput}
                    placeholder="Heads"
                    placeholderTextColor={theme.colors.muted}
                  />
                  <Pressable style={styles.saveHeadsButton} onPress={() => void handleUpdateHeads(member.id)}>
                    <Text style={styles.saveHeadsText}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.cancelHeadsButton} onPress={() => setEditingMemberId(null)}>
                    <Text style={styles.cancelHeadsText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <View style={styles.memberActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setEditingMemberId(member.id);
                  setEditingHeads(String(member.heads));
                }}
                style={styles.smallButton}
              >
                <Text style={styles.smallButtonText}>Edit heads</Text>
              </Pressable>
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
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
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

function formatWeeklyDue(heads: number): string {
  return `PHP ${(heads * 50).toLocaleString('en-PH')}/week`;
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
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editHeadsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  editHeadsInput: { width: 70, minHeight: 36, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, paddingHorizontal: 8, color: theme.colors.text, backgroundColor: theme.colors.background, fontSize: 12 },
  saveHeadsButton: { borderRadius: 9, backgroundColor: theme.colors.primary, paddingHorizontal: 9, paddingVertical: 8 },
  saveHeadsText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  cancelHeadsButton: { borderRadius: 9, backgroundColor: theme.colors.accent, paddingHorizontal: 9, paddingVertical: 8 },
  cancelHeadsText: { color: theme.colors.primary, fontSize: 10, fontWeight: '800' },
  smallButton: { borderRadius: 9, backgroundColor: theme.colors.accent, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  deactivateButton: { backgroundColor: '#FCE8E6' },
  deactivateText: { color: '#B42318' },
});

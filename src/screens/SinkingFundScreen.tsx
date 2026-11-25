import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { AppModal, ModalActions } from '../components/AppModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { DatePickerField } from '../components/DatePickerField';
import { MetricCard } from '../components/MetricCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { useToast } from '../components/ToastProvider';
import { currentSinkingFundWeek, deleteSinkingFundPayment, getWeeklySinkingFundSummary, listRecentSinkingFundPayments, recordSinkingFundPayment, type WeeklySinkingFundPayment, type WeeklySinkingFundSummary } from '../services/sinkingFundService';
import { formatCentavos, parsePesoAmount } from '../utils/money';

function shiftWeek(weekStart: string, amount: number): string {
  const [year, month, day] = weekStart.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + amount * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function displayWeek(weekStart: string): string {
  const [year, month, day] = weekStart.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function SinkingFundScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(currentSinkingFundWeek());
  const [summary, setSummary] = useState<WeeklySinkingFundSummary | null>(null);
  const [payments, setPayments] = useState<WeeklySinkingFundPayment[]>([]);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [memberPickerVisible, setMemberPickerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WeeklySinkingFundPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedMember = summary?.memberRows.find(row => row.memberId === memberId) ?? null;
  const refresh = useCallback(async () => {
    try {
      setError('');
      const [nextSummary, nextPayments] = await Promise.all([getWeeklySinkingFundSummary(db, weekStart), listRecentSinkingFundPayments(db)]);
      setSummary(nextSummary); setPayments(nextPayments);
      setMemberId(current => current && nextSummary.memberRows.some(row => row.memberId === current) ? current : nextSummary.memberRows[0]?.memberId ?? null);
    } catch { setError('Unable to load the weekly sinking fund records.'); }
  }, [db, weekStart]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const openCollectionModal = () => {
    const localNow = new Date();
    const localToday = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
    setError('');
    setMemberPickerVisible(false);
    setAmount(selectedMember?.remainingCentavos ? (selectedMember.remainingCentavos / 100).toFixed(2) : '');
    setNotes('');
    setPaidOn(localToday);
    setFormVisible(true);
  };

  const handleSave = async () => {
    setError('');
    if (!selectedMember) { setError('Select a member first.'); return; }
    const amountCentavos = parsePesoAmount(amount);
    if (amountCentavos === null || amountCentavos <= 0) { setError('Enter a valid collection amount in pesos.'); return; }
    setSaving(true);
    try {
      await recordSinkingFundPayment(db, { memberId: selectedMember.memberId, weekStart, amountCentavos, paidOn, notes });
      const memberLabel = `Member ${selectedMember.memberCode}`;
      setFormVisible(false);
      await refresh();
      showToast(`Sinking Fund collection for ${memberLabel} recorded successfully.`, 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to record this collection.';
      setError(message);
      showToast(message, 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteCollection = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const memberLabel = `Member ${deleteTarget.memberCode}`;
      await deleteSinkingFundPayment(db, deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
      showToast(`Sinking Fund collection for ${memberLabel} deleted.`, 'destructive');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this collection.');
      showToast(cause instanceof Error ? cause.message : 'Unable to delete this collection.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const progress = summary && summary.targetCentavos > 0 ? Math.min(100, (summary.collectedCentavos / summary.targetCentavos) * 100) : 0;

  return (
    <ScreenLayout title="Sinking Fund" description="Track the strict weekly ₱50-per-head collection that builds the fund used for loans.">
      <SectionCard title="Weekly collection" subtitle="Every head contributes ₱50 each week. Weekly collection is tracked by Sunday.">
        <View style={styles.weekSelector}>
          <Pressable style={styles.weekArrow} onPress={() => setWeekStart(value => shiftWeek(value, -1))}><Text style={styles.arrowText}>‹</Text></Pressable>
          <View style={styles.weekTitleWrap}><Text style={styles.weekLabel}>COLLECTION WEEK</Text><Text style={styles.weekTitle}>{displayWeek(weekStart)}</Text></View>
          <Pressable style={[styles.weekArrow, weekStart >= currentSinkingFundWeek() && styles.disabled]} disabled={weekStart >= currentSinkingFundWeek()} onPress={() => setWeekStart(value => shiftWeek(value, 1))}><Text style={styles.arrowText}>›</Text></Pressable>
        </View>
        <View style={styles.metrics}>
          <MetricCard label="Total heads" value={String(summary?.totalHeads ?? 0)} helper="Registered active heads" />
          <MetricCard label="Weekly target" value={formatCentavos(summary?.targetCentavos ?? 0)} helper="₱50 × total heads" />
          <MetricCard label="Collected" value={formatCentavos(summary?.collectedCentavos ?? 0)} helper="Payments allocated to this week" emphasized />
          <MetricCard label="Remaining" value={formatCentavos(summary?.remainingCentavos ?? 0)} helper="Still to collect" />
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        <Text style={styles.progressText}>{progress.toFixed(1)}% of this week's target collected</Text>
      </SectionCard>

      <SectionCard title="Weekly collection" subtitle="Open the collection form, review the member and amount, then save.">
        <Pressable style={styles.primaryButton} onPress={openCollectionModal} disabled={!summary?.memberRows.length}>
          <Text style={styles.primaryButtonText}>+ Record weekly collection</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title={`Member weekly status · ${summary?.memberRows.length ?? 0}`} subtitle="A member may be fully covered, partially paid, or ahead through advance payment.">
        {summary?.memberRows.length ? summary.memberRows.map(row => (
          <View key={row.memberId} style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <Text style={styles.memberTitle}>Member {row.memberCode}</Text>
              <Text style={styles.statusMeta}>{row.heads} heads · Due {formatCentavos(row.dueCentavos)}</Text>
              {row.paidCentavos > row.dueCentavos ? <Text style={styles.advanceText}>Includes advance credit</Text> : null}
            </View>
            <View style={styles.statusAmount}>
              <Text style={styles.statusPaid}>{formatCentavos(row.paidCentavos)}</Text>
              <Text style={row.remainingCentavos > 0 ? styles.remainingText : styles.paidText}>{row.remainingCentavos > 0 ? `${formatCentavos(row.remainingCentavos)} remaining` : 'Paid'}</Text>
            </View>
          </View>
        )) : <Text style={styles.empty}>No weekly records yet.</Text>}
      </SectionCard>

      <SectionCard title={`Recent Sinking Fund collections · ${payments.length}`} subtitle="Latest weekly contributions on this device.">
        {payments.length ? payments.map(payment => (
          <View key={payment.id} style={styles.paymentRow}>
            <View style={styles.paymentHeader}><View style={styles.paymentIdentity}><Text style={styles.memberTitle}>Member {payment.memberCode}</Text><Text style={styles.statusMeta}>{payment.memberName || 'Name not provided'} · {payment.paidOn}</Text></View><Text style={styles.paymentAmount}>{formatCentavos(payment.amountCentavos)}</Text></View>
            {payment.notes ? <Text style={styles.statusMeta}>{payment.notes}</Text> : null}
            <Pressable style={styles.deleteButton} onPress={() => setDeleteTarget(payment)}>
              <Text style={styles.deleteButtonText}>Delete collection</Text>
            </Pressable>
          </View>
        )) : <Text style={styles.empty}>No Sinking Fund collections recorded yet.</Text>}
      </SectionCard>

      <AppModal visible={formVisible} title="Record weekly collection" subtitle={`Week of ${displayWeek(weekStart)} · ₱50 per head`}
        onClose={() => { if (!saving) setFormVisible(false); }}
        footer={<ModalActions primaryLabel="Save collection" onPrimary={() => void handleSave()} onSecondary={() => setFormVisible(false)} busy={saving} />}>
        <Text style={styles.label}>Member</Text>
        <Pressable style={styles.dropdown} onPress={() => setMemberPickerVisible(value => !value)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dropdownValue}>{selectedMember ? `Member ${selectedMember.memberCode}` : 'Select a member'}</Text>
            {selectedMember ? <Text style={styles.dropdownHint}>{selectedMember.heads} heads · Due {formatCentavos(selectedMember.dueCentavos)} · Remaining {formatCentavos(selectedMember.remainingCentavos)}</Text> : null}
          </View>
          <Text style={styles.chevron}>{memberPickerVisible ? '⌃' : '⌄'}</Text>
        </Pressable>
        {memberPickerVisible ? (
          <View style={styles.memberDropdown}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator={(summary?.memberRows.length ?? 0) > 6}>
            {(summary?.memberRows ?? []).map(row => <Pressable key={row.memberId} style={[styles.memberOption, row.memberId === memberId && styles.memberOptionSelected]}
              onPress={() => { setMemberId(row.memberId); setMemberPickerVisible(false); setAmount(row.remainingCentavos > 0 ? (row.remainingCentavos / 100).toFixed(2) : ''); }}>
              <Text style={styles.memberOptionTitle}>Member {row.memberCode}</Text>
              <Text style={styles.memberOptionMeta}>{row.heads} heads · {formatCentavos(row.remainingCentavos)} remaining</Text>
            </Pressable>)}
          </ScrollView></View>
        ) : null}
        <Field label="Collection amount (PHP)" value={amount} onChangeText={setAmount} placeholder={selectedMember ? `e.g. ${(selectedMember.dueCentavos / 100).toFixed(2)}` : 'e.g. 250.00'} keyboardType="decimal-pad" />
        <DatePickerField label="Payment date" value={paidOn} onChange={setPaidOn} />
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Optional collection note" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppModal>

      <ConfirmModal visible={Boolean(deleteTarget)} title="Delete Sinking Fund collection?"
        message={deleteTarget ? `Permanently delete the ${formatCentavos(deleteTarget.amountCentavos)} collection from Member ${deleteTarget.memberCode} dated ${deleteTarget.paidOn}? Any weekly/advance allocation and the linked Fund contribution will also be removed. This cannot be undone.` : ''}
        confirmLabel="Delete collection" onConfirm={() => void handleDeleteCollection()} onCancel={() => setDeleteTarget(null)} busy={deleting} destructive />
    </ScreenLayout>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad'; }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor={theme.colors.muted} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  weekSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekArrow: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: theme.colors.primary, fontSize: 28, lineHeight: 30 },
  weekTitleWrap: { alignItems: 'center', flex: 1 },
  weekLabel: { color: theme.colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  weekTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progressTrack: { height: 9, backgroundColor: theme.colors.accent, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary },
  progressText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14 },
  dropdown: { minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropdownValue: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  dropdownHint: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: theme.colors.primary, fontSize: 22 },
  memberDropdown: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, maxHeight: 220, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  memberOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  memberOptionSelected: { backgroundColor: theme.colors.accent },
  memberOptionTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  memberOptionMeta: { color: theme.colors.muted, fontSize: 10, marginTop: 2 },
  statusRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statusInfo: { flex: 1, gap: 3 },
  statusAmount: { alignItems: 'flex-end', gap: 3 },
  memberTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  statusMeta: { color: theme.colors.muted, fontSize: 10 },
  statusPaid: { color: theme.colors.primary, fontSize: 12, fontWeight: '900' },
  remainingText: { color: theme.colors.warning, fontSize: 10, fontWeight: '800' },
  paidText: { color: theme.colors.primary, fontSize: 10, fontWeight: '800' },
  advanceText: { color: theme.colors.primaryDark, fontSize: 10, fontWeight: '800' },
  paymentRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 11, gap: 3 },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  paymentAmount: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
  paymentIdentity: { flex: 1, gap: 2 },
  deleteButton: { alignSelf: 'flex-start', marginTop: 7, borderRadius: 9, backgroundColor: '#FCE8E6', paddingHorizontal: 11, paddingVertical: 8 },
  deleteButtonText: { color: '#B42318', fontSize: 10, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});

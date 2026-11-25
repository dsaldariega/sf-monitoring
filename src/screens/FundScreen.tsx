import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
import type { FundTransactionRecord } from '../database/database.types';
import { addManualFundTransaction, deleteManualFundTransaction, getFundSummary, listFundTransactions, type FundSummary, type ManualFundTransactionType } from '../services/fundService';
import { formatCentavos, parsePesoAmount } from '../utils/money';

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const movementOptions: { value: ManualFundTransactionType; label: string }[] = [
  { value: 'initial_fund', label: 'Initial fund' },
  { value: 'other_in', label: 'Other income' },
  { value: 'other_out', label: 'Other expense' },
];

function transactionLabel(type: FundTransactionRecord['transaction_type']): string {
  switch (type) {
    case 'initial_fund': return 'Initial fund';
    case 'contribution': return 'Sinking Fund contribution';
    case 'loan_release': return 'Loan released';
    case 'loan_collection': return 'Loan collection';
    case 'other_in': return 'Other income';
    case 'other_out': return 'Other expense';
  }
}
function isInflow(type: FundTransactionRecord['transaction_type']): boolean {
  return ['initial_fund', 'contribution', 'loan_collection', 'other_in'].includes(type);
}
function sourceLabel(type: FundTransactionRecord['transaction_type']): string {
  switch (type) {
    case 'contribution': return 'Sinking Fund';
    case 'loan_release': return 'Loans';
    case 'loan_collection': return 'Payments';
    default: return 'Fund';
  }
}

export function FundScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [transactions, setTransactions] = useState<FundTransactionRecord[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [movement, setMovement] = useState<ManualFundTransactionType>('initial_fund');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FundTransactionRecord | null>(null);
  const [expandedTransactionId, setExpandedTransactionId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextSummary, nextTransactions] = await Promise.all([getFundSummary(db), listFundTransactions(db)]);
      setSummary(nextSummary); setTransactions(nextTransactions);
      setMovement(current => current === 'initial_fund' && nextSummary.initialFundCount > 0 ? 'other_in' : current);
      setError('');
    } catch { setError('Unable to load fund records from this device.'); }
  }, [db]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const openFundModal = () => {
    setError(''); setAmount(''); setNotes(''); setTransactionDate(today);
    setMovement(summary?.initialFundCount ? 'other_in' : 'initial_fund');
    setFormVisible(true);
  };

  const handleSave = async () => {
    setError('');
    const amountCentavos = parsePesoAmount(amount);
    if (amountCentavos === null || amountCentavos <= 0) { setError('Enter a valid amount in pesos.'); return; }
    if (movement === 'initial_fund' && (summary?.initialFundCount ?? 0) > 0) { setError('The initial fund has already been recorded.'); return; }

    setSaving(true);
    try {
      await addManualFundTransaction(db, { type: movement, amountCentavos, transactionDate, notes });
      const movementLabel = movement === 'initial_fund' ? 'Initial fund' : movement === 'other_in' ? 'Other income' : 'Other expense';
      setFormVisible(false);
      await refresh();
      showToast(`${movementLabel} recorded successfully.`, movement === 'other_out' ? 'warning' : 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to save this Fund record.';
      setError(message);
      showToast(message, 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const label = transactionLabel(deleteTarget.transaction_type);
      await deleteManualFundTransaction(db, deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
      showToast(`${label} deleted successfully.`, 'destructive');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to delete this Fund record.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenLayout title="Fund" description="Track the available Sinking Fund balance and every recorded movement of money.">
      <View style={styles.metrics}>
        <MetricCard label="Available balance" value={formatCentavos(summary?.availableBalanceCentavos ?? 0)} helper="Calculated from the Fund ledger" emphasized />
        <MetricCard label="Total inflow" value={formatCentavos(summary?.totalInflowCentavos ?? 0)} helper="Sinking Fund contributions and other inflows" />
        <MetricCard label="Total outflow" value={formatCentavos(summary?.totalOutflowCentavos ?? 0)} helper="Loan releases and other expenses" />
      </View>

      <SectionCard title="Fund" subtitle="Weekly Sinking Fund collections, loan releases, and loan collections are recorded automatically.">
        <Pressable style={styles.primaryButton} onPress={openFundModal}>
          <Text style={styles.primaryButtonText}>+ Add Fund record</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title={`Fund ledger · ${transactions.length}`} subtitle="Latest 100 transactions. Automatic loan and Sinking Fund activity remains linked to its source record.">
        {transactions.length === 0 ? <Text style={styles.empty}>No Fund transactions recorded yet.</Text> : transactions.map(item => {
          const isExpanded = item.id === expandedTransactionId;
          const isManual = item.reference_type === null && ['initial_fund', 'other_in', 'other_out'].includes(item.transaction_type);
          return (
            <View key={item.id} style={[styles.transactionRow, isExpanded && styles.expandedRow]}>
              <Pressable style={styles.transactionDetails} onPress={() => setExpandedTransactionId(current => current === item.id ? null : item.id)}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionTitle}>{transactionLabel(item.transaction_type)}</Text>
                  <Text style={[styles.transactionAmount, isInflow(item.transaction_type) ? styles.inflow : styles.outflow]}>
                    {isInflow(item.transaction_type) ? '+' : '−'}{formatCentavos(item.amount_centavos)}
                  </Text>
                </View>
                <Text style={styles.meta}>{item.transaction_date}</Text>
                {isExpanded ? (
                  <>
                    {item.reference_type ? <Text style={styles.meta}>Reference: {item.reference_type} #{item.reference_id}</Text> : null}
                    {item.notes ? <Text style={styles.meta}>{item.notes}</Text> : null}
                    {isManual ? (
                      <Text style={styles.meta}>Manually added to Fund.</Text>
                    ) : (
                      <Text style={styles.linkedRecord}>
                        Automatically recorded from {sourceLabel(item.transaction_type)}. Manage this record from {sourceLabel(item.transaction_type)}.
                      </Text>
                    )}
                  </>
                ) : null}
                <Text style={styles.expandHint}>{isExpanded ? 'Tap to collapse' : 'Tap to view actions'}</Text>
              </Pressable>
              {isExpanded && isManual ? (
                <Pressable style={styles.deleteButton} onPress={() => setDeleteTarget(item)}>
                  <Text style={styles.deleteButtonText}>Delete Fund record</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </SectionCard>

      <AppModal visible={formVisible} title="Fund" subtitle="Add a manual Sinking Fund ledger movement."
        onClose={() => { if (!saving) setFormVisible(false); }}
        footer={<ModalActions primaryLabel="Save Fund" onPrimary={() => void handleSave()} onSecondary={() => setFormVisible(false)} busy={saving} />}>
        <View style={styles.fixedType}>
          <Text style={styles.fixedTypeLabel}>Fund type</Text>
          <Text style={styles.fixedTypeValue}>Sinking Fund</Text>
          <Text style={styles.fixedTypeHint}>This application currently manages one fund only.</Text>
        </View>

        <Text style={styles.label}>Transaction</Text>
        <View style={styles.typeOptions}>
          {movementOptions.map(option => {
            const disabled = option.value === 'initial_fund' && (summary?.initialFundCount ?? 0) > 0;
            return <Pressable key={option.value} disabled={disabled} style={[styles.typeOption, movement === option.value && styles.typeOptionSelected, disabled && styles.disabled]}
              onPress={() => setMovement(option.value)}>
              <Text style={[styles.typeOptionText, movement === option.value && styles.typeOptionTextSelected]}>{option.label}</Text>
            </Pressable>;
          })}
        </View>
        <Field label="Amount (PHP)" value={amount} onChangeText={setAmount} placeholder="e.g. 5000.00" keyboardType="decimal-pad" />
        <DatePickerField label="Transaction date" value={transactionDate} onChange={setTransactionDate} />
        <Field label="Description / notes (optional)" value={notes} onChangeText={setNotes} placeholder="Optional Fund note" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppModal>

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="Delete Fund record?"
        message={deleteTarget ? `Permanently delete this ${transactionLabel(deleteTarget.transaction_type).toLowerCase()} of ${formatCentavos(deleteTarget.amount_centavos)} dated ${deleteTarget.transaction_date}? Only manual Fund records can be deleted here. Automatic Sinking Fund and loan transactions remain linked to their source records. This cannot be undone.` : ''}
        confirmLabel="Delete Fund record"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
        busy={deleting}
        destructive
      />
    </ScreenLayout>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad'; }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor={theme.colors.muted} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14 },
  fixedType: { backgroundColor: theme.colors.accent, borderRadius: 12, padding: 12, gap: 4 },
  fixedTypeLabel: { color: theme.colors.muted, fontSize: 10, fontWeight: '800' },
  fixedTypeValue: { color: theme.colors.primaryDark, fontSize: 15, fontWeight: '900' },
  fixedTypeHint: { color: theme.colors.muted, fontSize: 10 },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  typeOption: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11 },
  typeOptionSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.primary },
  typeOptionText: { color: theme.colors.muted, fontSize: 11, fontWeight: '700' },
  typeOptionTextSelected: { color: theme.colors.primary, fontWeight: '900' },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  transactionDetails: { flex: 1, gap: 4 },
  expandedRow: { backgroundColor: theme.colors.accent, paddingHorizontal: 8, borderRadius: 10 },
  transactionRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 11, gap: 4 },
  transactionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  transactionTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800', flex: 1 },
  transactionAmount: { fontSize: 13, fontWeight: '900' },
  inflow: { color: theme.colors.primary },
  outflow: { color: '#B42318' },
  meta: { color: theme.colors.muted, fontSize: 10, lineHeight: 15 },
  deleteButton: { alignSelf: 'flex-start', marginTop: 7, borderRadius: 9, backgroundColor: '#FCE8E6', paddingHorizontal: 11, paddingVertical: 8 },
  deleteButtonText: { color: '#B42318', fontSize: 10, fontWeight: '800' },
  linkedRecord: { color: theme.colors.muted, fontSize: 10, fontWeight: '700', lineHeight: 15, marginTop: 4 },
  expandHint: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 },
});

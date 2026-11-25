import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { DatePickerField } from '../components/DatePickerField';
import { MetricCard } from '../components/MetricCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import type { FundTransactionRecord } from '../database/database.types';
import {
  addManualFundTransaction,
  getFundSummary,
  listFundTransactions,
  type FundSummary,
  type ManualFundTransactionType,
} from '../services/fundService';
import { formatCentavos, parsePesoAmount } from '../utils/money';

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const transactionOptions: { value: ManualFundTransactionType; label: string }[] = [
  { value: 'initial_fund', label: 'Initial fund' },
  { value: 'other_in', label: 'Other income' },
  { value: 'other_out', label: 'Other expense' },
];

function transactionLabel(type: FundTransactionRecord['transaction_type']): string {
  switch (type) {
    case 'initial_fund': return 'Initial fund';
    case 'contribution': return 'Contribution';
    case 'loan_release': return 'Loan released';
    case 'loan_collection': return 'Loan collection';
    case 'other_in': return 'Other income';
    case 'other_out': return 'Other expense';
  }
}

function isInflow(type: FundTransactionRecord['transaction_type']): boolean {
  return ['initial_fund', 'contribution', 'loan_collection', 'other_in'].includes(type);
}

export function FundScreen() {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [transactions, setTransactions] = useState<FundTransactionRecord[]>([]);
  const [type, setType] = useState<ManualFundTransactionType>('initial_fund');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextSummary, nextTransactions] = await Promise.all([
        getFundSummary(db),
        listFundTransactions(db),
      ]);
      setSummary(nextSummary);
      setTransactions(nextTransactions);
      setType(current => current === 'initial_fund' && nextSummary.initialFundCount > 0 ? 'other_in' : current);
      setError('');
    } catch {
      setError('Unable to load fund records from this device.');
    }
  }, [db]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const handleSave = async () => {
    setError('');
    const amountCentavos = parsePesoAmount(amount);
    if (amountCentavos === null || amountCentavos <= 0) {
      setError('Enter a valid amount in pesos.');
      return;
    }
    if (type === 'initial_fund' && (summary?.initialFundCount ?? 0) > 0) {
      setError('The initial fund has already been recorded.');
      return;
    }

    setSaving(true);
    try {
      await addManualFundTransaction(db, {
        type,
        amountCentavos,
        transactionDate,
        notes,
      });
      setAmount('');
      setNotes('');
      await refresh();
      Alert.alert('Fund entry saved', 'The transaction has been added to the local fund ledger.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this fund entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Fund" description="Track the available sinking fund balance and every recorded movement of money.">
      <View style={styles.metrics}>
        <MetricCard label="Available balance" value={formatCentavos(summary?.availableBalanceCentavos ?? 0)} helper="Calculated from all ledger entries" emphasized />
        <MetricCard label="Total inflow" value={formatCentavos(summary?.totalInflowCentavos ?? 0)} helper="Initial fund, weekly contributions and loan collections" />
        <MetricCard label="Total outflow" value={formatCentavos(summary?.totalOutflowCentavos ?? 0)} helper="Loan releases and other expenses" />
      </View>

      <SectionCard title="Add fund entry" subtitle="Weekly Sinking Fund collections, loan releases, and loan collections are recorded automatically. Add only the initial fund or other fund movements here.">
        <Text style={styles.label}>Transaction type</Text>
        <View style={styles.typeOptions}>
          {transactionOptions.map(option => {
            const disabled = option.value === 'initial_fund' && (summary?.initialFundCount ?? 0) > 0;
            return (
              <Pressable key={option.value} disabled={disabled}
                style={[styles.typeOption, type === option.value && styles.typeOptionSelected, disabled && styles.disabled]}
                onPress={() => setType(option.value)}>
                <Text style={[styles.typeOptionText, type === option.value && styles.typeOptionTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {type === 'initial_fund' && (summary?.initialFundCount ?? 0) > 0 ? (
          <Text style={styles.hint}>The initial fund is already recorded. Use Other income for additional funds.</Text>
        ) : null}
        <View style={styles.field}>
          <Text style={styles.label}>Amount (PHP)</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="e.g. 5000.00"
            keyboardType="decimal-pad" placeholderTextColor={theme.colors.muted} style={styles.input} />
        </View>
        <DatePickerField label="Transaction date" value={transactionDate} onChange={setTransactionDate} />
        <View style={styles.field}>
          <Text style={styles.label}>Description / notes (optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="e.g. Opening fund balance"
            placeholderTextColor={theme.colors.muted} style={styles.input} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={handleSave} disabled={saving}
          style={[styles.primaryButton, saving && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save fund entry'}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title={`Fund ledger · ${transactions.length}`} subtitle="Latest 100 transactions. Loan activity is linked to its original loan or payment record.">
        {transactions.length === 0 ? <Text style={styles.empty}>No fund transactions recorded yet.</Text> : transactions.map(item => (
          <View key={item.id} style={styles.transactionRow}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionTitle}>{transactionLabel(item.transaction_type)}</Text>
              <Text style={[styles.transactionAmount, isInflow(item.transaction_type) ? styles.inflow : styles.outflow]}>
                {isInflow(item.transaction_type) ? '+' : '−'}{formatCentavos(item.amount_centavos)}
              </Text>
            </View>
            <Text style={styles.meta}>{item.transaction_date}{item.reference_type ? ` · Ref: ${item.reference_type} #${item.reference_id}` : ''}</Text>
            {item.notes ? <Text style={styles.meta}>{item.notes}</Text> : null}
          </View>
        ))}
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14 },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  typeOption: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11 },
  typeOptionSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.primary },
  typeOptionText: { color: theme.colors.muted, fontSize: 11, fontWeight: '700' },
  typeOptionTextSelected: { color: theme.colors.primary, fontWeight: '900' },
  hint: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  transactionRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 11, gap: 4 },
  transactionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  transactionTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800', flex: 1 },
  transactionAmount: { fontSize: 13, fontWeight: '900' },
  inflow: { color: theme.colors.primary },
  outflow: { color: '#B42318' },
  meta: { color: theme.colors.muted, fontSize: 10, lineHeight: 15 },
});

import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { DatePickerField } from '../components/DatePickerField';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { assessOverdueInstallments } from '../services/loanService';
import {
  listLoansForPayment,
  listPaymentHistory,
  recordLoanPayment,
  type PaymentHistoryItem,
  type PaymentLoanOption,
} from '../services/paymentService';
import { formatCentavos, parsePesoAmount } from '../utils/money';

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function PaymentsScreen() {
  const db = useSQLiteContext();
  const [loans, setLoans] = useState<PaymentLoanOption[]>([]);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loanId, setLoanId] = useState<number | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(today);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedLoan = loans.find(loan => loan.id === loanId) ?? null;
  const amountCentavos = parsePesoAmount(amount);

  const refreshData = useCallback(async () => {
    try {
      await assessOverdueInstallments(db);
      const [loanRows, paymentRows] = await Promise.all([
        listLoansForPayment(db),
        listPaymentHistory(db),
      ]);
      setLoans(loanRows);
      setHistory(paymentRows);
      setLoanId(current => current && loanRows.some(loan => loan.id === current)
        ? current : loanRows[0]?.id ?? null);
    } catch {
      setError('Unable to load loans or payment history.');
    }
  }, [db]);

  useFocusEffect(useCallback(() => { void refreshData(); }, [refreshData]));

  const handleSave = async () => {
    setError('');
    if (!selectedLoan) {
      setError('Select an active loan first.');
      return;
    }
    if (amountCentavos === null || amountCentavos <= 0) {
      setError('Enter a valid payment amount in pesos.');
      return;
    }

    setSaving(true);
    try {
      await recordLoanPayment(db, {
        loanId: selectedLoan.id,
        amountCentavos,
        paidOn,
        notes,
      });
      setAmount('');
      setNotes('');
      await refreshData();
      Alert.alert('Payment recorded', 'The payment was saved and applied to the oldest outstanding installments.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record this payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout title="Payments" description="Record partial or full collections against an active loan.">
      <SectionCard title="Record payment" subtitle="Payments are applied to the oldest unpaid installment first. Any penalty on that installment is settled before its scheduled amount.">
        <Text style={styles.label}>Loan</Text>
        {loans.length === 0 ? (
          <Text style={styles.empty}>There are no active loans with an outstanding balance.</Text>
        ) : (
          <>
            <Pressable style={styles.dropdown} onPress={() => setDropdownVisible(value => !value)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownValue}>
                  {selectedLoan ? `${selectedLoan.member_code} · ${selectedLoan.alias || selectedLoan.member_name}` : 'Select a loan'}
                </Text>
                {selectedLoan ? <Text style={styles.dropdownHint}>{selectedLoan.member_name} · Balance {formatCentavos(selectedLoan.outstanding_centavos)}</Text> : null}
              </View>
              <Text style={styles.chevron}>{dropdownVisible ? '⌃' : '⌄'}</Text>
            </Pressable>
            {dropdownVisible ? (
              <View style={styles.options}>
                {loans.map(loan => (
                  <Pressable key={loan.id} style={[styles.option, loan.id === loanId && styles.optionSelected]}
                    onPress={() => { setLoanId(loan.id); setDropdownVisible(false); }}>
                    <Text style={styles.optionTitle}>{loan.member_code} · {loan.alias || loan.member_name}</Text>
                    <Text style={styles.dropdownHint}>{loan.member_name} · Balance {formatCentavos(loan.outstanding_centavos)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {selectedLoan ? (
              <View style={styles.balanceCard}>
                <View style={styles.balanceLine}><Text style={styles.balanceLabel}>Original principal</Text><Text style={styles.balanceValue}>{formatCentavos(selectedLoan.principal_amount_centavos)}</Text></View>
                <View style={styles.balanceLine}><Text style={styles.balanceLabel}>Scheduled amount paid</Text><Text style={styles.balanceValue}>{formatCentavos(selectedLoan.total_paid_centavos)}</Text></View>
                <View style={styles.balanceLine}><Text style={styles.balanceLabel}>Penalties outstanding</Text><Text style={styles.penaltyValue}>{formatCentavos(selectedLoan.total_penalties_centavos - selectedLoan.total_penalties_paid_centavos)}</Text></View>
                <View style={styles.balanceLine}><Text style={styles.totalLabel}>Outstanding balance</Text><Text style={styles.totalValue}>{formatCentavos(selectedLoan.outstanding_centavos)}</Text></View>
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>Payment amount (PHP)</Text>
              <TextInput value={amount} onChangeText={setAmount} placeholder="e.g. 2750.00"
                keyboardType="decimal-pad" placeholderTextColor={theme.colors.muted} style={styles.input} />
            </View>
            <DatePickerField label="Payment date" value={paidOn} onChange={setPaidOn} />
            <View style={styles.field}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="Optional payment note"
                placeholderTextColor={theme.colors.muted} style={styles.input} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" onPress={handleSave} disabled={saving || !selectedLoan}
              style={[styles.primaryButton, (saving || !selectedLoan) && styles.disabled]}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save payment'}</Text>
            </Pressable>
          </>
        )}
      </SectionCard>

      <SectionCard title={`Recent payments · ${history.length}`} subtitle="The latest 50 recorded loan collections on this device.">
        {history.length === 0 ? <Text style={styles.empty}>No payments recorded yet.</Text> : history.map(payment => (
          <View key={payment.id} style={styles.historyRow}>
            <View style={styles.historyHeader}>
              <Text style={styles.optionTitle}>{payment.member_code} · {payment.alias || payment.member_name}</Text>
              <Text style={styles.historyAmount}>{formatCentavos(payment.amount_centavos)}</Text>
            </View>
            <Text style={styles.dropdownHint}>{payment.member_name} · {payment.paid_on}</Text>
            {payment.penalty_allocated_centavos > 0 ? (
              <Text style={styles.penaltyNote}>Includes {formatCentavos(payment.penalty_allocated_centavos)} penalty settlement</Text>
            ) : null}
            {payment.notes ? <Text style={styles.dropdownHint}>{payment.notes}</Text> : null}
          </View>
        ))}
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14 },
  dropdown: { minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropdownValue: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  dropdownHint: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: theme.colors.primary, fontSize: 22, paddingHorizontal: 4 },
  options: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 6, maxHeight: 220, backgroundColor: theme.colors.surface },
  option: { padding: 11, borderRadius: 9, gap: 2 },
  optionSelected: { backgroundColor: theme.colors.accent },
  optionTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  balanceCard: { backgroundColor: theme.colors.accent, borderRadius: 12, padding: 12, gap: 9 },
  balanceLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  balanceLabel: { color: theme.colors.muted, fontSize: 11, flex: 1 },
  balanceValue: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  totalLabel: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '800', flex: 1 },
  totalValue: { color: theme.colors.primary, fontSize: 15, fontWeight: '900' },
  penaltyValue: { color: '#B42318', fontSize: 12, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  historyRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 12, gap: 4 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  historyAmount: { color: theme.colors.primary, fontSize: 14, fontWeight: '900' },
  penaltyNote: { color: '#B42318', fontSize: 11, fontWeight: '700' },
});

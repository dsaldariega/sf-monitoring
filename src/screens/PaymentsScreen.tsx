import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { AppModal, ModalActions } from '../components/AppModal';
import { DatePickerField } from '../components/DatePickerField';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { theme } from '../constants/theme';
import { useToast } from '../components/ToastProvider';
import { assessOverdueInstallments } from '../services/loanService';
import { listLoansForPayment, listPaymentHistory, recordLoanPayment, type PaymentHistoryItem, type PaymentLoanOption } from '../services/paymentService';
import { formatCentavos, parsePesoAmount } from '../utils/money';

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function PaymentsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const [loans, setLoans] = useState<PaymentLoanOption[]>([]);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loanId, setLoanId] = useState<number | null>(null);
  const [formVisible, setFormVisible] = useState(false);
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
      const [loanRows, paymentRows] = await Promise.all([listLoansForPayment(db), listPaymentHistory(db)]);
      setLoans(loanRows); setHistory(paymentRows);
      setLoanId(current => current && loanRows.some(loan => loan.id === current) ? current : loanRows[0]?.id ?? null);
    } catch { setError('Unable to load loans or payment history.'); }
  }, [db]);

  useFocusEffect(useCallback(() => { void refreshData(); }, [refreshData]));

  const openPaymentModal = () => {
    setError(''); setDropdownVisible(false); setAmount(''); setNotes(''); setPaidOn(today); setFormVisible(true);
  };

  const handleSave = async () => {
    setError('');
    if (!selectedLoan) { setError('Select an active loan first.'); return; }
    if (amountCentavos === null || amountCentavos <= 0) { setError('Enter a valid payment amount in pesos.'); return; }

    setSaving(true);
    try {
      await recordLoanPayment(db, { loanId: selectedLoan.id, amountCentavos, paidOn, notes });
      const paymentLabel = `Member ${selectedLoan.member_code} · ${selectedLoan.alias || 'No alias'}`;
      setFormVisible(false);
      await refreshData();
      showToast(`Payment for ${paymentLabel} recorded successfully.`, 'success');
    } catch (cause) {
const message = cause instanceof Error ? cause.message : 'Unable to record this payment.';
      setError(message);
      showToast(message, 'error');
    } finally { setSaving(false); }
  };

  return (
    <ScreenLayout title="Payments" description="Record partial or full collections against an active loan.">
      <SectionCard title="Loan payments" subtitle="Open the payment form, review the loan details, then save the collection.">
        <Pressable style={styles.primaryButton} onPress={openPaymentModal} disabled={loans.length === 0}>
          <Text style={styles.primaryButtonText}>+ Record payment</Text>
        </Pressable>
        {loans.length === 0 ? <Text style={styles.empty}>There are no active loans with an outstanding balance.</Text> : null}
      </SectionCard>

      <SectionCard title={`Recent payments · ${history.length}`} subtitle="The latest 50 recorded loan collections on this device.">
        {history.length === 0 ? <Text style={styles.empty}>No payments recorded yet.</Text> : history.map(payment => (
          <View key={payment.id} style={styles.historyRow}>
            <View style={styles.historyHeader}>
              <Text style={styles.optionTitle}>Member {payment.member_code} · {payment.alias || 'No alias'}</Text>
              <Text style={styles.historyAmount}>{formatCentavos(payment.amount_centavos)}</Text>
            </View>
            <Text style={styles.dropdownHint}>{payment.member_name || 'Name not provided'} · {payment.paid_on}</Text>
            {payment.penalty_allocated_centavos > 0 ? <Text style={styles.penaltyNote}>Includes {formatCentavos(payment.penalty_allocated_centavos)} penalty settlement</Text> : null}
            {payment.notes ? <Text style={styles.dropdownHint}>{payment.notes}</Text> : null}
          </View>
        ))}
      </SectionCard>

      <AppModal visible={formVisible} title="Record payment" subtitle="Review the loan and payment details before saving."
        onClose={() => { if (!saving) setFormVisible(false); }}
        footer={<ModalActions primaryLabel="Save payment" onPrimary={() => void handleSave()} onSecondary={() => setFormVisible(false)} busy={saving} />}>
        <Text style={styles.label}>Loan</Text>
        <Pressable style={styles.dropdown} onPress={() => setDropdownVisible(value => !value)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dropdownValue}>{selectedLoan ? `Member ${selectedLoan.member_code} · ${selectedLoan.alias || 'No alias'}` : 'Select a loan'}</Text>
            {selectedLoan ? <Text style={styles.dropdownHint}>{selectedLoan.next_due_date ? `Next due ${selectedLoan.next_due_date} · ` : ''}Balance {formatCentavos(selectedLoan.outstanding_centavos)}</Text> : null}
          </View>
          <Text style={styles.chevron}>{dropdownVisible ? '⌃' : '⌄'}</Text>
        </Pressable>
        {dropdownVisible ? (
          <View style={styles.options}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={loans.length > 6}>
              {loans.map(loan => (
                <Pressable key={loan.id} style={[styles.option, loan.id === loanId && styles.optionSelected]}
                  onPress={() => { setLoanId(loan.id); setDropdownVisible(false); setAmount(''); }}>
                  <Text style={styles.optionTitle}>Member {loan.member_code} · {loan.alias || 'No alias'}</Text>
                  <Text style={styles.dropdownHint}>{loan.next_due_date ? `Next due ${loan.next_due_date} · ` : ''}Balance {formatCentavos(loan.outstanding_centavos)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {selectedLoan ? (
          <View style={styles.balanceCard}>
            <Line label="Original principal" value={formatCentavos(selectedLoan.principal_amount_centavos)} />
            <Line label="Payment per due date" value={formatCentavos(selectedLoan.next_payment_centavos)} strong />
            {selectedLoan.next_due_date ? <Line label="Next payment date" value={selectedLoan.next_due_date} /> : null}
            <Line label="Scheduled amount paid" value={formatCentavos(selectedLoan.total_paid_centavos)} />
            <Line label="Penalties outstanding" value={formatCentavos(selectedLoan.total_penalties_centavos - selectedLoan.total_penalties_paid_centavos)} danger />
            <Line label="Outstanding balance" value={formatCentavos(selectedLoan.outstanding_centavos)} strong />
          </View>
        ) : null}

        <Field label="Payment amount (PHP)" value={amount} onChangeText={setAmount} placeholder={selectedLoan ? `e.g. ${(selectedLoan.next_payment_centavos / 100).toFixed(2)}` : 'e.g. 2750.00'} keyboardType="decimal-pad" />
        <DatePickerField label="Payment date" value={paidOn} onChange={setPaidOn} />
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Optional payment note" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppModal>
    </ScreenLayout>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad';
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor={theme.colors.muted} style={styles.input} /></View>;
}

function Line({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return <View style={styles.line}><Text style={styles.balanceLabel}>{label}</Text><Text style={[styles.balanceValue, strong && styles.totalValue, danger && styles.penaltyValue]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14 },
  dropdown: { minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropdownValue: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  dropdownHint: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: theme.colors.primary, fontSize: 22 },
  options: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, maxHeight: 230, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  option: { padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionSelected: { backgroundColor: theme.colors.accent },
  optionTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  balanceCard: { backgroundColor: theme.colors.accent, borderRadius: 12, padding: 12, gap: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  balanceLabel: { color: theme.colors.muted, fontSize: 11, flex: 1 },
  balanceValue: { color: theme.colors.text, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  totalValue: { color: theme.colors.primary, fontSize: 14, fontWeight: '900' },
  penaltyValue: { color: '#B42318', fontSize: 12, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 18 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  historyRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 12, gap: 4 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  historyAmount: { color: theme.colors.primary, fontSize: 14, fontWeight: '900' },
  penaltyNote: { color: '#B42318', fontSize: 11, fontWeight: '700' },
});

import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import type { InterestMethod, MemberRecord, PaymentAllocationMethod } from '../database/database.types';
import { listActiveMembers } from '../services/memberService';
import { createLoan, listLoans, type LoanListItem } from '../services/loanService';
import { formatCentavos, parsePesoAmount } from '../utils/money';
import { theme } from '../constants/theme';

const currentDate = new Date();
const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
const currentMonth = today.slice(0, 7);

export function LoansScreen() {
  const db = useSQLiteContext();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loans, setLoans] = useState<LoanListItem[]>([]);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [principal, setPrincipal] = useState('');
  const [interestMethod, setInterestMethod] = useState<InterestMethod>('monthly_rate');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [fixedInterest, setFixedInterest] = useState('');
  const [loanDate, setLoanDate] = useState(today);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [expectedEndMonth, setExpectedEndMonth] = useState('');
  const [allocationMethod, setAllocationMethod] = useState<PaymentAllocationMethod>('interest_first');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [memberRows, loanRows] = await Promise.all([listActiveMembers(db), listLoans(db)]);
      setMembers(memberRows);
      setLoans(loanRows);
      setMemberId(current => current && memberRows.some(member => member.id === current) ? current : memberRows[0]?.id ?? null);
    } catch {
      setError('Unable to load members or loan records.');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshData();
    }, [refreshData])
  );

  const handleSaveLoan = async () => {
    setError('');
    const principalCentavos = parsePesoAmount(principal);
    if (principalCentavos === null || principalCentavos <= 0) {
      setError('Enter a valid loan amount in pesos (up to two decimal places).');
      return;
    }

    let rateBasisPoints: number | undefined;
    let fixedInterestCentavos: number | undefined;
    if (interestMethod === 'monthly_rate') {
      const rate = monthlyRate.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(rate) || !Number.isFinite(Number(rate))) {
        setError('Enter a valid monthly rate, for example 2 or 1.5.');
        return;
      }
      rateBasisPoints = Math.round(Number(rate) * 100);
    } else {
      fixedInterestCentavos = parsePesoAmount(fixedInterest) ?? undefined;
      if (fixedInterestCentavos === undefined) {
        setError('Enter a valid fixed total interest amount.');
        return;
      }
    }

    if (!memberId) {
      setError('Add or select a member before registering a loan.');
      return;
    }

    setSaving(true);
    try {
      await createLoan(db, {
        memberId,
        principalAmountCentavos: principalCentavos,
        interestMethod,
        monthlyRateBasisPoints: rateBasisPoints,
        fixedInterestCentavos,
        loanDate,
        startMonth,
        expectedEndMonth,
        allocationMethod,
        remarks,
      });
      setPrincipal('');
      setMonthlyRate('');
      setFixedInterest('');
      setExpectedEndMonth('');
      setRemarks('');
      await refreshData();
      Alert.alert('Loan registered', 'The loan record was saved on this device.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to save this loan.';
      setError(message.includes('UNIQUE') ? 'A record with this reference already exists.' : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout
      title="Loans"
      description="Register member loans and define their interest and payment-allocation terms."
    >
      <SectionCard title="Register loan" subtitle="All money amounts are saved as integer centavos. No interest or penalty is calculated automatically in this phase.">
        <Text style={styles.label}>Member</Text>
        {members.length === 0 ? (
          <Text style={styles.empty}>No active members yet. Add a member in the Members tab first.</Text>
        ) : (
          <View style={styles.choiceWrap}>
            {members.map(member => (
              <Choice key={member.id} label={`${member.member_code} · ${member.full_name}`} selected={memberId === member.id} onPress={() => setMemberId(member.id)} />
            ))}
          </View>
        )}

        <Field label="Loan amount (PHP)" value={principal} onChangeText={setPrincipal} placeholder="e.g. 5000.00" keyboardType="decimal-pad" />

        <Text style={styles.label}>Interest type</Text>
        <View style={styles.choiceWrap}>
          <Choice label="Monthly rate" selected={interestMethod === 'monthly_rate'} onPress={() => setInterestMethod('monthly_rate')} />
          <Choice label="Fixed total interest" selected={interestMethod === 'fixed_total'} onPress={() => setInterestMethod('fixed_total')} />
        </View>
        {interestMethod === 'monthly_rate' ? (
          <Field label="Monthly interest rate (%)" value={monthlyRate} onChangeText={setMonthlyRate} placeholder="e.g. 2 or 1.5" keyboardType="decimal-pad" />
        ) : (
          <Field label="Fixed total interest (PHP)" value={fixedInterest} onChangeText={setFixedInterest} placeholder="e.g. 500.00" keyboardType="decimal-pad" />
        )}

        <Field label="Loan date (YYYY-MM-DD)" value={loanDate} onChangeText={setLoanDate} placeholder="2026-11-25" />
        <Field label="Starting month (YYYY-MM)" value={startMonth} onChangeText={setStartMonth} placeholder="2026-11" />
        <Field label="Expected end month (optional, YYYY-MM)" value={expectedEndMonth} onChangeText={setExpectedEndMonth} placeholder="2027-01" />

        <Text style={styles.label}>Payment allocation</Text>
        <View style={styles.choiceWrap}>
          <Choice label="Interest first" selected={allocationMethod === 'interest_first'} onPress={() => setAllocationMethod('interest_first')} />
          <Choice label="Principal first" selected={allocationMethod === 'principal_first'} onPress={() => setAllocationMethod('principal_first')} />
          <Choice label="Manual" selected={allocationMethod === 'manual'} onPress={() => setAllocationMethod('manual')} />
        </View>
        <Field label="Remarks (optional)" value={remarks} onChangeText={setRemarks} placeholder="Optional loan note" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={saving ? 'Saving…' : 'Save loan'} onPress={handleSaveLoan} disabled={saving || members.length === 0} />
      </SectionCard>

      <SectionCard title={`Loan portfolio · ${loans.length}`} subtitle="Active, paid, and cancelled loan records.">
        {loans.length === 0 ? (
          <Text style={styles.empty}>No loan records yet.</Text>
        ) : loans.map(loan => (
          <View key={loan.id} style={styles.loanRow}>
            <View style={styles.loanHeader}>
              <Text style={styles.memberCode}>{loan.member_code}</Text>
              <Text style={[styles.status, loan.status === 'active' ? styles.activeStatus : null]}>{loan.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.memberName}>{loan.member_name}</Text>
            <Text style={styles.amount}>{formatCentavos(loan.principal_amount_centavos)}</Text>
            <Text style={styles.meta}>
              {loan.interest_method === 'monthly_rate'
                ? `${((loan.monthly_rate_basis_points ?? 0) / 100).toFixed(2)}% monthly`
                : `${formatCentavos(loan.fixed_interest_centavos ?? 0)} fixed interest`}
              {' · '}Starts {loan.start_month}
            </Text>
          </View>
        ))}
      </SectionCard>
    </ScreenLayout>
  );
}

function Field({ label, ...props }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor={theme.colors.muted} />
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
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
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: theme.colors.background },
  choiceSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.primary },
  choiceText: { color: theme.colors.muted, fontSize: 11, fontWeight: '700' },
  choiceTextSelected: { color: theme.colors.primary },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  loanRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 12, gap: 4 },
  loanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberCode: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  memberName: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  amount: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: theme.colors.muted, fontSize: 11 },
  status: { color: theme.colors.muted, fontSize: 10, fontWeight: '800' },
  activeStatus: { color: theme.colors.primary },
});

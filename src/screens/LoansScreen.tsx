import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { AppModal, ModalActions } from '../components/AppModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { DatePickerField } from '../components/DatePickerField';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import type { MemberRecord } from '../database/database.types';
import { listActiveMembers } from '../services/memberService';
import {
  assessOverdueInstallments,
  buildInstallmentSchedule,
  calculateLoanTerms,
  createLoan,
  deleteLoan,
  listLoans,
  type LoanListItem,
} from '../services/loanService';
import { formatCentavos, parsePesoAmount } from '../utils/money';
import { theme } from '../constants/theme';
import { useToast } from '../components/ToastProvider';

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function LoansScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loans, setLoans] = useState<LoanListItem[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [memberPickerVisible, setMemberPickerVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoanListItem | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [principal, setPrincipal] = useState('');
  const [alias, setAlias] = useState('');
  const [termMonths, setTermMonths] = useState('2');
  const [loanDate, setLoanDate] = useState(today);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedMember = members.find(member => member.id === memberId) ?? null;
  const principalCentavos = parsePesoAmount(principal);
  const term = Number(termMonths);
  const validPreview = principalCentavos !== null && principalCentavos > 0 && Number.isSafeInteger(term) && term >= 1 && term <= 36;
  const terms = validPreview ? calculateLoanTerms(principalCentavos, term) : null;
  const schedule = useMemo(() => {
    if (!validPreview) return [];
    try { return buildInstallmentSchedule(principalCentavos, term, loanDate); }
    catch { return []; }
  }, [principalCentavos, term, loanDate, validPreview]);

  const refreshData = useCallback(async () => {
    try {
      await assessOverdueInstallments(db);
      const [memberRows, loanRows] = await Promise.all([listActiveMembers(db), listLoans(db)]);
      setMembers(memberRows);
      setLoans(loanRows);
      setMemberId(current => current && memberRows.some(member => member.id === current) ? current : memberRows[0]?.id ?? null);
    } catch { setError('Unable to load members or loan records.'); }
  }, [db]);

  useFocusEffect(useCallback(() => { void refreshData(); }, [refreshData]));

  const openCreateModal = () => {
    setError('');
    setMemberPickerVisible(false);
    setPrincipal('');
    setAlias('');
    setTermMonths('2');
    setLoanDate(today);
    setRemarks('');
    setFormVisible(true);
  };

  const handleSaveLoan = async () => {
    setError('');
    if (principalCentavos === null || principalCentavos <= 0) { setError('Enter a valid loan amount in pesos.'); return; }
    if (!Number.isSafeInteger(term) || term < 1 || term > 36) { setError('Loan term must be between 1 and 36 months.'); return; }
    if (!memberId) { setError('Add or select a member before registering a loan.'); return; }

    setSaving(true);
    try {
      await createLoan(db, { memberId, principalAmountCentavos: principalCentavos, alias, loanDate, termMonths: term, remarks });
      setFormVisible(false);
      await refreshData();
      showToast(`Loan ${alias.trim().toUpperCase() || 'record'} created successfully.`, 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to save this loan.';
      setError(message);
      showToast(message, 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteLoan = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const deletedLabel = `Member ${deleteTarget.member_code}${deleteTarget.alias ? ` · ${deleteTarget.alias}` : ''}`;
      await deleteLoan(db, deleteTarget.id);
      setDeleteTarget(null);
      await refreshData();
      showToast(`${deletedLabel} loan deleted successfully.`, 'destructive');
    } catch (cause) {
      setDeleteTarget(null);
const message = cause instanceof Error ? cause.message : 'Unable to delete this loan.';
      setError(message);
      showToast(message, 'error');
    } finally { setDeleting(false); }
  };

  const activeLoans = loans.filter(loan => !loan.archived_at);

  return (
    <ScreenLayout title="Loans" description="Register loans with a 15-day repayment schedule and automatic overdue penalties.">
      <SectionCard title="Loan portfolio" subtitle="Create a loan from a modal. Delete is permanent and should only be used for records that need to be removed.">
        <Pressable style={styles.primaryButton} onPress={openCreateModal} disabled={members.length === 0}>
          <Text style={styles.primaryButtonText}>+ Register loan</Text>
        </Pressable>
        {members.length === 0 ? <Text style={styles.empty}>No members yet. Add a member first before registering a loan.</Text> : null}
      </SectionCard>

      <SectionCard title={`Loan portfolio · ${activeLoans.length}`} subtitle="Active and paid loans currently in the portfolio.">
        {activeLoans.length === 0 ? <Text style={styles.empty}>No loan records in the active portfolio.</Text> : activeLoans.map(loan => {
          const isExpanded = loan.id === expandedLoanId;
          return (
            <View key={loan.id} style={[styles.loanRow, isExpanded && styles.expandedRow]}>
              <Pressable style={styles.loanDetails} onPress={() => setExpandedLoanId(current => current === loan.id ? null : loan.id)}>
                <View style={styles.loanHeader}>
                  <Text style={styles.memberCode}>Member {loan.member_code}</Text>
                  <Text style={[styles.status, loan.status === 'active' && styles.activeStatus]}>{loan.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.memberName}>{loan.alias || 'No alias'}</Text>
                {loan.alias ? <Text style={styles.meta}>{loan.member_name || 'Name not provided'}</Text> : null}
                <Text style={styles.amount}>{formatCentavos(loan.principal_amount_centavos)}</Text>
                <Text style={styles.meta}>5% monthly · {loan.term_months} month(s) · Starts {loan.loan_date}</Text>
                <Text style={styles.expandHint}>{isExpanded ? 'Tap to collapse' : 'Tap to view actions'}</Text>
              </Pressable>
              {isExpanded ? (
                <Pressable style={styles.deleteButton} onPress={() => setDeleteTarget(loan)}>
                  <Text style={styles.deleteButtonText}>Delete loan</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      </SectionCard>

      <AppModal visible={formVisible} title="Register loan" subtitle="Review the loan details and calculated schedule before saving."
        onClose={() => { if (!saving) setFormVisible(false); }}
        footer={<ModalActions primaryLabel="Save loan" onPrimary={() => void handleSaveLoan()} onSecondary={() => setFormVisible(false)} busy={saving} />}>
        <Text style={styles.label}>Member</Text>
        {members.length ? (
          <>
            <Pressable style={styles.dropdown} onPress={() => setMemberPickerVisible(value => !value)}>
              <View style={{ flex: 1 }}>
                <Text style={selectedMember ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {selectedMember ? `Member ${selectedMember.member_code} · ${selectedMember.full_name || 'Name not provided'}` : 'Select a member'}
                </Text>
              </View>
              <Text style={styles.chevron}>{memberPickerVisible ? '⌃' : '⌄'}</Text>
            </Pressable>
            {memberPickerVisible ? (
              <View style={styles.memberDropdown}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={members.length > 6}>
                  {members.map(member => (
                    <Pressable key={member.id} style={[styles.memberOption, member.id === memberId && styles.memberOptionSelected]}
                      onPress={() => { setMemberId(member.id); setMemberPickerVisible(false); }}>
                      <Text style={styles.memberOptionCode}>Member {member.member_code}</Text>
                      <Text style={styles.memberOptionName} numberOfLines={1}>{member.full_name || 'Name not provided'}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        ) : <Text style={styles.empty}>No active members available.</Text>}

        <Field label="Loan alias (optional)" value={alias} onChangeText={setAlias} placeholder="e.g. A1" />
        <Field label="Loan amount (PHP)" value={principal} onChangeText={setPrincipal} placeholder="e.g. 10000.00" keyboardType="decimal-pad" />
        <DatePickerField label="Loan release date" value={loanDate} onChange={setLoanDate} />
        <Field label="Loan term (months)" value={termMonths} onChangeText={setTermMonths} placeholder="e.g. 2" keyboardType="number-pad" />

        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>Loan calculation rules</Text>
          <Text style={styles.ruleDescription}>Monthly interest: 5% of original principal</Text>
          <Text style={styles.ruleDescription}>Payment frequency: every 15 calendar days</Text>
          <Text style={styles.ruleDescription}>Late penalty: 2.5% of original principal for each missed due date</Text>
          <Text style={styles.ruleHint}>Assessed once per overdue installment; penalties are not compounded.</Text>
        </View>

        {terms ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Payment summary</Text>
            <Line label="Total interest" value={formatCentavos(terms.totalInterestCentavos)} />
            <Line label="Total payable" value={formatCentavos(terms.totalPayableCentavos)} strong />
            <Line label="Installments" value={`${terms.installmentCount} payments`} />
            <Line label="Regular installment" value={formatCentavos(terms.baseInstallment)} strong />
            <Line label="Penalty per missed due date" value={formatCentavos(terms.penaltyCentavos)} danger />
            {schedule.length ? (
              <View style={styles.scheduleList}>
                <Text style={styles.scheduleTitle}>Scheduled due dates</Text>
                {schedule.map(item => <Line key={item.installmentNumber} label={`Payment ${item.installmentNumber} · ${item.dueDate}`} value={formatCentavos(item.scheduledAmountCentavos)} />)}
              </View>
            ) : null}
          </View>
        ) : <Text style={styles.hint}>Enter a valid principal and term to preview the repayment schedule.</Text>}

        <Field label="Remarks (optional)" value={remarks} onChangeText={setRemarks} placeholder="Optional loan note" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppModal>

      <ConfirmModal visible={Boolean(deleteTarget)} title="Delete loan?"
        message={deleteTarget ? `Permanently delete the loan for Member ${deleteTarget.member_code} (${deleteTarget.alias || 'No alias'})? This removes the loan's payments, installment records, related fund transactions, and live monthly monitoring record. Finalized report snapshots are not rewritten. This cannot be undone.` : ''}
        confirmLabel="Delete loan" onConfirm={() => void handleDeleteLoan()} onCancel={() => setDeleteTarget(null)} busy={deleting} destructive />
    </ScreenLayout>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType}
      placeholderTextColor={theme.colors.muted} style={styles.input} />
  </View>;
}

function Line({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return <View style={styles.line}><Text style={styles.ruleLabel}>{label}</Text>
    <Text style={[styles.ruleValue, strong && styles.totalValue, danger && styles.penaltyValue]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.text, fontSize: 14 },
  dropdown: { minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropdownValue: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  dropdownPlaceholder: { color: theme.colors.muted, fontSize: 13 },
  chevron: { color: theme.colors.primary, fontSize: 22 },
  memberDropdown: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, maxHeight: 230, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  memberOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  memberOptionSelected: { backgroundColor: theme.colors.accent },
  memberOptionCode: { color: theme.colors.primary, fontSize: 11, fontWeight: '900' },
  memberOptionName: { color: theme.colors.text, fontSize: 11, marginTop: 2 },
  ruleCard: { backgroundColor: theme.colors.accent, borderRadius: 12, padding: 12, gap: 7 },
  ruleTitle: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '900' },
  ruleDescription: { color: theme.colors.text, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  ruleHint: { color: theme.colors.muted, fontSize: 10, lineHeight: 15 },
  preview: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 12, gap: 8 },
  previewTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '900' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  ruleLabel: { color: theme.colors.muted, fontSize: 11, flex: 1 },
  ruleValue: { color: theme.colors.text, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  totalValue: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
  penaltyValue: { color: '#B42318', fontSize: 12, fontWeight: '800' },
  scheduleList: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 9, gap: 7 },
  scheduleTitle: { color: theme.colors.text, fontSize: 11, fontWeight: '900' },
  hint: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 18 },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  deleteButton: { alignSelf: 'flex-start', marginTop: 5, borderRadius: 9, backgroundColor: '#FCE8E6', paddingHorizontal: 11, paddingVertical: 8 },
  deleteButtonText: { color: '#B42318', fontSize: 11, fontWeight: '800' },
  loanDetails: { flex: 1, gap: 3 },
  expandedRow: { backgroundColor: theme.colors.accent, paddingHorizontal: 8, borderRadius: 10 },
  loanRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 12, gap: 4 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberCode: { color: theme.colors.primary, fontSize: 11, fontWeight: '900' },
  memberName: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  meta: { color: theme.colors.muted, fontSize: 10, lineHeight: 15 },
  expandHint: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  amount: { color: theme.colors.text, fontSize: 15, fontWeight: '900', marginTop: 2 },
  status: { color: theme.colors.muted, fontSize: 9, fontWeight: '900' },
  activeStatus: { color: theme.colors.primary },
});

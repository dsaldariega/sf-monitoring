import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import type { MemberRecord } from "../database/database.types";
import { listActiveMembers } from "../services/memberService";
import {
  archiveLoan,
  restoreLoan,
  assessOverdueInstallments,
  buildInstallmentSchedule,
  calculateLoanTerms,
  createLoan,
  listLoans,
  type LoanListItem,
} from "../services/loanService";
import { formatCentavos, parsePesoAmount } from "../utils/money";
import { DatePickerField } from "../components/DatePickerField";
import { theme } from "../constants/theme";

const currentDate = new Date();
const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

export function LoansScreen() {
  const db = useSQLiteContext();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loans, setLoans] = useState<LoanListItem[]>([]);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [memberPickerVisible, setMemberPickerVisible] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [alias, setAlias] = useState("");
  const [termMonths, setTermMonths] = useState("2");
  const [loanDate, setLoanDate] = useState(today);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMember =
    members.find((member) => member.id === memberId) ?? null;
  const principalCentavos = parsePesoAmount(principal);
  const term = Number(termMonths);
  const validPreview =
    principalCentavos !== null &&
    principalCentavos > 0 &&
    Number.isSafeInteger(term) &&
    term >= 1 &&
    term <= 36;
  const terms = validPreview
    ? calculateLoanTerms(principalCentavos, term)
    : null;
  const schedule = useMemo(() => {
    if (!validPreview) return [];
    try {
      return buildInstallmentSchedule(principalCentavos, term, loanDate);
    } catch {
      return [];
    }
  }, [principalCentavos, term, loanDate, validPreview]);

  const refreshData = useCallback(async () => {
    try {
      await assessOverdueInstallments(db);
      const [memberRows, loanRows] = await Promise.all([
        listActiveMembers(db),
        listLoans(db),
      ]);
      setMembers(memberRows);
      setLoans(loanRows);
      setMemberId((current) =>
        current && memberRows.some((member) => member.id === current)
          ? current
          : (memberRows[0]?.id ?? null),
      );
    } catch {
      setError("Unable to load members or loan records.");
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshData();
    }, [refreshData]),
  );

  const handleSaveLoan = async () => {
    setError("");
    if (principalCentavos === null || principalCentavos <= 0) {
      setError(
        "Enter a valid loan amount in pesos (up to two decimal places).",
      );
      return;
    }
    if (!Number.isSafeInteger(term) || term < 1 || term > 36) {
      setError("Loan term must be between 1 and 36 months.");
      return;
    }
    if (!memberId) {
      setError("Add or select a member before registering a loan.");
      return;
    }

    setSaving(true);
    try {
      await createLoan(db, {
        memberId,
        principalAmountCentavos: principalCentavos,
        alias,
        loanDate,
        termMonths: term,
        remarks,
      });
      setPrincipal("");
      setAlias("");
      setTermMonths("2");
      setRemarks("");
      await refreshData();
      Alert.alert(
        "Loan registered",
        "The loan and its 15-day installment schedule were saved on this device.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save this loan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveLoan = (loan: LoanListItem) => {
    Alert.alert(
      "Archive loan?",
      "This hides the loan from the active portfolio and payment selector. Any unpaid balance remains; nothing is forgiven or erased. Payments, fund transactions, and audit history are retained, and you can restore the loan later.",
      [
        { text: "Keep loan", style: "cancel" },
        {
          text: "Archive loan",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveLoan(db, loan.id);
              await refreshData();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Unable to archive this loan.",
              );
            }
          },
        },
      ],
    );
  };

  const handleRestoreLoan = async (loan: LoanListItem) => {
    try {
      await restoreLoan(db, loan.id);
      await refreshData();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to restore this loan.",
      );
    }
  };

  return (
    <ScreenLayout
      title="Loans"
      description="Register loans with a 15-day repayment schedule and automatic overdue penalties."
    >
      <SectionCard
        title="Register loan"
        subtitle="Interest and late charges follow the fixed loan rules."
      >
        <Text style={styles.label}>Member</Text>
        {members.length === 0 ? (
          <Text style={styles.empty}>
            No active members yet. Add a member in the Members tab first.
          </Text>
        ) : (
          <Pressable
            style={styles.dropdown}
            onPress={() => setMemberPickerVisible((value) => !value)}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={
                  selectedMember
                    ? styles.dropdownValue
                    : styles.dropdownPlaceholder
                }
              >
                {selectedMember
                  ? `${selectedMember.member_code} · ${selectedMember.full_name}`
                  : "Select a member"}
              </Text>
            </View>
            <Text style={styles.chevron}>
              {memberPickerVisible ? "⌃" : "⌄"}
            </Text>
          </Pressable>
        )}

        {memberPickerVisible && members.length > 0 ? (
          <View style={styles.memberDropdown}>
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={members.length > 6}
            >
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  style={[
                    styles.memberOption,
                    member.id === memberId && styles.memberOptionSelected,
                  ]}
                  onPress={() => {
                    setMemberId(member.id);
                    setMemberPickerVisible(false);
                  }}
                >
                  <Text style={styles.memberOptionCode}>
                    {member.member_code}
                  </Text>
                  <Text
                    style={styles.memberOptionName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {member.full_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Field
          label="Loan alias (optional)"
          value={alias}
          onChangeText={setAlias}
          placeholder="e.g. Emergency loan"
        />
        <Field
          label="Loan amount (PHP)"
          value={principal}
          onChangeText={setPrincipal}
          placeholder="e.g. 10000.00"
          keyboardType="decimal-pad"
        />
        <DatePickerField
          label="Loan release date"
          value={loanDate}
          onChange={setLoanDate}
        />
        <Field
          label="Loan term (months)"
          value={termMonths}
          onChangeText={setTermMonths}
          placeholder="e.g. 2"
          keyboardType="number-pad"
        />

        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>Loan calculation rules</Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Monthly interest</Text>
            <Text style={styles.ruleDescription}>5% of original principal</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Payment frequency</Text>
            <Text style={styles.ruleDescription}>Every 15 calendar days</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Late penalty</Text>
            <Text style={styles.ruleDescription}>
              2.5% of original principal for each missed due date
            </Text>
          </View>
          <Text style={styles.ruleHint}>
            Assessed once per overdue installment; penalties are not compounded.
          </Text>
        </View>

        {terms ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Payment summary</Text>
            <View style={styles.ruleLine}>
              <Text style={styles.ruleLabel}>Total interest</Text>
              <Text style={styles.ruleValue}>
                {formatCentavos(terms.totalInterestCentavos)}
              </Text>
            </View>
            <View style={styles.ruleLine}>
              <Text style={styles.ruleLabel}>Total payable</Text>
              <Text style={styles.totalValue}>
                {formatCentavos(terms.totalPayableCentavos)}
              </Text>
            </View>
            <View style={styles.ruleLine}>
              <Text style={styles.ruleLabel}>Installments</Text>
              <Text style={styles.ruleValue}>
                {terms.installmentCount} payments
              </Text>
            </View>
            <View style={styles.ruleLine}>
              <Text style={styles.ruleLabel}>Regular installment</Text>
              <Text style={styles.totalValue}>
                {formatCentavos(terms.baseInstallment)}
              </Text>
            </View>
            <View style={styles.ruleLine}>
              <Text style={styles.ruleLabel}>Penalty per missed due date</Text>
              <Text style={styles.penaltyValue}>
                {formatCentavos(terms.penaltyCentavos)}
              </Text>
            </View>
            {schedule.length > 0 ? (
              <View style={styles.scheduleList}>
                <Text style={styles.scheduleTitle}>Scheduled due dates</Text>
                {schedule.map((item) => (
                  <View key={item.installmentNumber} style={styles.scheduleRow}>
                    <Text style={styles.ruleLabel}>
                      Payment {item.installmentNumber} · {item.dueDate}
                    </Text>
                    <Text style={styles.ruleValue}>
                      {formatCentavos(item.scheduledAmountCentavos)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.hint}>
            Enter a valid principal and term to preview the repayment schedule.
          </Text>
        )}

        <Field
          label="Remarks (optional)"
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Optional loan note"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={saving ? "Saving…" : "Save loan"}
          onPress={handleSaveLoan}
          disabled={saving || members.length === 0}
        />
      </SectionCard>

      <SectionCard
        title={`Loan portfolio · ${loans.filter((loan) => !loan.archived_at).length}`}
        subtitle="Active, paid, and cancelled loan records. Archive a record to remove it from the active portfolio without erasing its history."
      >
        {loans.filter((loan) => !loan.archived_at).length === 0 ? (
          <Text style={styles.empty}>
            No loan records in the active portfolio.
          </Text>
        ) : (
          loans
            .filter((loan) => !loan.archived_at)
            .map((loan) => (
              <View key={loan.id} style={styles.loanRow}>
                <View style={styles.loanHeader}>
                  <Text style={styles.memberCode}>{loan.member_code}</Text>
                  <Text
                    style={[
                      styles.status,
                      loan.status === "active" ? styles.activeStatus : null,
                    ]}
                  >
                    {loan.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>
                  {loan.alias || loan.member_name}
                </Text>
                {loan.alias ? (
                  <Text style={styles.meta}>{loan.member_name}</Text>
                ) : null}
                <Text style={styles.amount}>
                  {formatCentavos(loan.principal_amount_centavos)}
                </Text>
                <Text style={styles.meta}>
                  5% monthly · {loan.term_months} month(s) · Starts{" "}
                  {loan.loan_date}
                </Text>
                <Pressable
                  style={styles.archiveButton}
                  onPress={() => handleArchiveLoan(loan)}
                >
                  <Text style={styles.archiveButtonText}>Archive loan</Text>
                </Pressable>
              </View>
            ))
        )}
      </SectionCard>

      <SectionCard
        title={`Archived loans · ${loans.filter((loan) => Boolean(loan.archived_at)).length}`}
        subtitle="Archived records are hidden from the active portfolio and payment selector. Their financial history is retained."
      >
        {loans.filter((loan) => Boolean(loan.archived_at)).length === 0 ? (
          <Text style={styles.empty}>No archived loans.</Text>
        ) : (
          loans
            .filter((loan) => Boolean(loan.archived_at))
            .map((loan) => (
              <View key={loan.id} style={styles.loanRow}>
                <View style={styles.loanHeader}>
                  <Text style={styles.memberCode}>{loan.member_code}</Text>
                  <Text style={styles.status}>ARCHIVED</Text>
                </View>
                <Text style={styles.memberName}>
                  {loan.alias || loan.member_name}
                </Text>
                {loan.alias ? (
                  <Text style={styles.meta}>{loan.member_name}</Text>
                ) : null}
                <Text style={styles.amount}>
                  {formatCentavos(loan.principal_amount_centavos)}
                </Text>
                <Text style={styles.meta}>
                  {loan.status.toUpperCase()} · {loan.loan_date} ·{" "}
                  {loan.archive_reason || "Archived"}
                </Text>
                <Pressable
                  style={styles.restoreButton}
                  onPress={() => void handleRestoreLoan(loan)}
                >
                  <Text style={styles.restoreButtonText}>
                    Restore to portfolio
                  </Text>
                </Pressable>
              </View>
            ))
        )}
      </SectionCard>
    </ScreenLayout>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor={theme.colors.muted}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontSize: 12, fontWeight: "700" },
  field: { gap: 6 },
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
  dropdown: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropdownValue: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  dropdownPlaceholder: { color: theme.colors.muted, fontSize: 14 },
  dropdownHint: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: theme.colors.primary, fontSize: 22, paddingHorizontal: 4 },
  ruleCard: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    padding: 12,
    gap: 9,
  },
  ruleTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  ruleLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  ruleItem: { gap: 3 },
  ruleDescription: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  ruleLabel: { color: theme.colors.muted, fontSize: 11, flex: 1 },
  ruleValue: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
  ruleHint: { color: theme.colors.muted, fontSize: 10, lineHeight: 15 },
  preview: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 9,
  },
  previewTitle: { color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  totalValue: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  penaltyValue: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  scheduleList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    gap: 7,
  },
  scheduleTitle: { color: theme.colors.text, fontSize: 12, fontWeight: "800" },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  hint: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  error: { color: "#B42318", fontSize: 12, lineHeight: 18 },
  empty: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.6 },
  loanRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 12,
    gap: 4,
  },
  loanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberCode: { color: theme.colors.primary, fontSize: 11, fontWeight: "800" },
  memberName: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
  amount: { color: theme.colors.text, fontSize: 17, fontWeight: "800" },
  meta: { color: theme.colors.muted, fontSize: 11 },
  status: { color: theme.colors.muted, fontSize: 10, fontWeight: "800" },
  activeStatus: { color: theme.colors.primary },
  archiveButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B42318",
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 4,
  },
  archiveButtonText: { color: "#B42318", fontSize: 11, fontWeight: "800" },
  restoreButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 4,
  },
  restoreButtonText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  deleteButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B42318",
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 4,
  },
  deleteButtonText: { color: "#B42318", fontSize: 11, fontWeight: "900" },
  memberDropdown: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    maxHeight: 240,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  memberOption: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberOptionSelected: {
    backgroundColor: theme.colors.accent,
  },
  memberOptionCode: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "800",
    minWidth: 52,
  },
  memberOptionName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
});

import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppModal, ModalActions } from '../components/AppModal';
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import { theme } from "../constants/theme";
import { exportMonthlyReportCsv } from "../services/backupService";
import {
  currentPeriodMonth,
  finalizeMonthlyReport,
  getMonthlySummary,
  listMonthlyReports,
  type MonthlyReportRecord,
  type MonthlySummary,
  type MonthlyLoanLine,
} from "../services/reportService";
import { formatCentavos } from "../utils/money";

function shiftMonth(period: string, amount: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function displayMonth(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1, 12).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

export function ReportsScreen() {
  const db = useSQLiteContext();
  const [period, setPeriod] = useState(currentPeriodMonth());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [reports, setReports] = useState<MonthlyReportRecord[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const latestPeriod = currentPeriodMonth();

  const selectedReport =
    reports.find((report) => report.id === selectedReportId) ?? null;
  const finalizedForPeriod =
    reports.find((report) => report.period_month === period) ?? null;
  const finalizedPeriodSnapshot = useMemo(() => {
    if (!finalizedForPeriod) return null;
    try {
      return JSON.parse(finalizedForPeriod.report_snapshot_json) as {
        metrics: {
          activeLoans: number;
          principalReleasedCentavos: number;
          interestExpectedCentavos: number;
          installmentTargetCentavos: number;
          collectedCentavos: number;
          dueGapCentavos: number;
          portfolioOutstandingCentavos: number;
          overdueInstallments: number;
        };
        loans: MonthlyLoanLine[];
      };
    } catch {
      return null;
    }
  }, [finalizedForPeriod]);
  const displayedSummary = useMemo((): MonthlySummary | null => {
    if (!finalizedPeriodSnapshot) return summary;
    return {
      periodMonth: period,
      ...finalizedPeriodSnapshot.metrics,
      loanLines: finalizedPeriodSnapshot.loans,
    };
  }, [summary, period, finalizedPeriodSnapshot]);
  const isFinalized = reports.some((report) => report.period_month === period);
  const canFinalize = period <= latestPeriod && !isFinalized;

  const refresh = useCallback(async () => {
    try {
      setError("");
      const [nextSummary, nextReports] = await Promise.all([
        getMonthlySummary(db, period),
        listMonthlyReports(db),
      ]);
      setSummary(nextSummary);
      setReports(nextReports);
    } catch {
      setError(`Unable to load this month's report data.`);
    }
  }, [db, period]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleExportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      await exportMonthlyReportCsv(db, period);
      setExportModalVisible(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to export this report.",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleFinalize = () => {
    Alert.alert(
      "Finalize monthly report?",
      `The ${displayMonth(period)} report will be saved as a permanent snapshot. It cannot be overwritten.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finalize report",
          onPress: async () => {
            setBusy(true);
            try {
              await finalizeMonthlyReport(db, period);
              setSelectedReportId(null);
              await refresh();
              Alert.alert(
                "Report finalized",
                "The monthly loan report snapshot has been saved on this device.",
              );
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Unable to finalize this report.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const snapshot = useMemo(() => {
    if (!selectedReport) return null;
    try {
      return JSON.parse(selectedReport.report_snapshot_json) as {
        metrics: Record<string, number>;
        loans: Array<{
          loanId: number;
          memberCode: string;
          memberName: string;
          alias: string | null;
          principalCentavos: number;
          installmentTargetCentavos: number;
          collectedCentavos: number;
          outstandingCentavos: number;
        }>;
      };
    } catch {
      return null;
    }
  }, [selectedReport]);

  return (
    <ScreenLayout
      title="Loan Reports"
      description="Review monthly loan collections, portfolio activity, and finalized historical loan reports."
    >
      <SectionCard
        title="Monthly loan collection report"
        subtitle="Choose a month to review the loan collection target, actual payments, and portfolio activity."
      >
        <View style={styles.monthSelector}>
          <Pressable
            style={styles.monthArrow}
            onPress={() => setPeriod((value) => shiftMonth(value, -1))}
          >
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{displayMonth(period)}</Text>
          <Pressable
            style={[
              styles.monthArrow,
              period >= latestPeriod && styles.disabled,
            ]}
            disabled={period >= latestPeriod}
            onPress={() => setPeriod((value) => shiftMonth(value, 1))}
          >
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
        {displayedSummary ? (
          <>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Principal released</Text>
              <Text style={styles.metricValue}>
                {formatCentavos(displayedSummary.principalReleasedCentavos)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Interest expected</Text>
              <Text style={styles.metricValue}>
                {formatCentavos(displayedSummary.interestExpectedCentavos)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Installments scheduled</Text>
              <Text style={styles.metricValue}>
                {formatCentavos(displayedSummary.installmentTargetCentavos)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Payments received</Text>
              <Text style={styles.metricValue}>
                {formatCentavos(displayedSummary.collectedCentavos)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>
                Remaining portfolio balance
              </Text>
              <Text style={styles.metricValue}>
                {formatCentavos(displayedSummary.portfolioOutstandingCentavos)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Overdue installments</Text>
              <Text style={styles.metricValue}>
                {displayedSummary.overdueInstallments}
              </Text>
            </View>
            <Text style={styles.sectionCaption}>
              Loan activity · {displayedSummary.loanLines.length}
            </Text>
            {displayedSummary.loanLines.length === 0 ? (
              <Text style={styles.empty}>No loan activity for this month.</Text>
            ) : (
              displayedSummary.loanLines.map((line) => (
                <View key={line.loanId} style={styles.loanLine}>
                  <View style={styles.loanHeading}>
                    <Text style={styles.loanName}>
                      {line.memberCode} · {line.alias || line.memberName}
                    </Text>
                    <Text style={styles.loanAmount}>
                      {formatCentavos(line.installmentTargetCentavos)}
                    </Text>
                  </View>
                  <Text style={styles.loanMeta}>
                    {line.memberName} · Collected{" "}
                    {formatCentavos(line.collectedCentavos)}
                  </Text>
                </View>
              ))
            )}
            <Pressable
              style={[styles.secondaryButton, exporting && styles.disabled]}
              disabled={exporting}
              onPress={() => setExportModalVisible(true)}
            >
              <Text style={styles.secondaryButtonText}>
                {exporting ? "Exporting…" : "Export this month as CSV"}
              </Text>
            </Pressable>
            {isFinalized ? (
              <Text style={styles.finalized}>
                This month has been finalized. The saved snapshot is read-only.
              </Text>
            ) : (
              <Pressable
                style={[
                  styles.primaryButton,
                  (!canFinalize || busy) && styles.disabled,
                ]}
                disabled={!canFinalize || busy}
                onPress={handleFinalize}
              >
                <Text style={styles.primaryButtonText}>
                  {busy
                    ? "Saving…"
                    : canFinalize
                      ? "Finalize report"
                      : "Future months cannot be finalized"}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.empty}>Loading report preview…</Text>
        )}
      </SectionCard>

      <SectionCard
        title={`Finalized reports · ${reports.length}`}
        subtitle="Saved snapshots are kept separately from live records."
      >
        {reports.length === 0 ? (
          <Text style={styles.empty}>No finalized reports yet.</Text>
        ) : (
          reports.map((report) => (
            <Pressable
              key={report.id}
              style={[
                styles.historyItem,
                report.id === selectedReportId && styles.historySelected,
              ]}
              onPress={() =>
                setSelectedReportId((current) =>
                  current === report.id ? null : report.id,
                )
              }
            >
              <View style={styles.loanHeading}>
                <Text style={styles.loanName}>
                  {displayMonth(report.period_month)}
                </Text>
                <Text style={styles.loanAmount}>
                  {formatCentavos(report.total_collected_centavos)}
                </Text>
              </View>
              <Text style={styles.loanMeta}>
                Finalized {report.finalized_at}
              </Text>
              {report.id === selectedReportId && snapshot ? (
                <View style={styles.snapshot}>
                  <Text style={styles.metricLabel}>
                    Saved principal released:{" "}
                    {formatCentavos(snapshot.metrics.principalReleasedCentavos)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    Saved installment target:{" "}
                    {formatCentavos(snapshot.metrics.installmentTargetCentavos)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    Saved portfolio outstanding:{" "}
                    {formatCentavos(
                      snapshot.metrics.portfolioOutstandingCentavos,
                    )}
                  </Text>
                  {snapshot.loans.map((line) => (
                    <Text key={line.loanId} style={styles.snapshotLoan}>
                      {line.memberCode} · {line.alias || line.memberName} —{" "}
                      {formatCentavos(line.collectedCentavos)} collected
                    </Text>
                  ))}
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </SectionCard>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppModal
        visible={exportModalVisible}
        title="Export this month as CSV?"
        subtitle={displayMonth(period)}
        onClose={() => { if (!exporting) setExportModalVisible(false); }}
        footer={<ModalActions primaryLabel="Export CSV" onPrimary={() => void handleExportCsv()} onSecondary={() => setExportModalVisible(false)} busy={exporting} />}
      >
        <Text style={styles.exportMessage}>
          This will export the selected month's loan collection report as a CSV file. The export includes loan summary figures and per-loan collection details. The file will be prepared for sharing after you confirm.
        </Text>
        <Text style={styles.exportHint}>
          Review the selected month before continuing.
        </Text>
      </AppModal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: { color: theme.colors.primary, fontSize: 28, lineHeight: 30 },
  monthTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "800" },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metricLabel: { color: theme.colors.muted, fontSize: 12, flex: 1 },
  metricValue: { color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  sectionCaption: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  empty: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  loanLine: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    gap: 4,
  },
  loanHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  loanName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  loanAmount: { color: theme.colors.primary, fontSize: 12, fontWeight: "800" },
  loanMeta: { color: theme.colors.muted, fontSize: 10 },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.4 },
  finalized: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 12,
    gap: 5,
  },
  historySelected: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  snapshot: { gap: 7, paddingTop: 7 },
  snapshotLoan: { color: theme.colors.text, fontSize: 11, lineHeight: 16 },
  error: { color: "#B42318", fontSize: 12 },
  exportMessage: { color: theme.colors.text, fontSize: 13, lineHeight: 19 },
  exportHint: { color: theme.colors.muted, fontSize: 11, lineHeight: 17 },
});

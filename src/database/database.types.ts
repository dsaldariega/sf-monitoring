export type InterestMethod = 'monthly_rate' | 'fixed_total';
export type PaymentAllocationMethod = 'interest_first' | 'principal_first' | 'manual';
export type LoanStatus = 'active' | 'paid' | 'cancelled';
export type MonitoringStatus = 'open' | 'partial' | 'paid' | 'finalized';
export type FundTransactionType =
  | 'initial_fund'
  | 'contribution'
  | 'loan_release'
  | 'loan_collection'
  | 'other_in'
  | 'other_out';

/** All monetary values persisted in SQLite are integer centavos. */
export type MemberRecord = {
  id: number;
  member_code: string;
  full_name: string;
  contact_number: string | null;
  reference_note: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type LoanRecord = {
  id: number;
  member_id: number;
  principal_amount_centavos: number;
  interest_method: InterestMethod;
  monthly_rate_basis_points: number | null;
  fixed_interest_centavos: number | null;
  loan_date: string;
  start_month: string;
  expected_end_month: string | null;
  allocation_method: PaymentAllocationMethod;
  status: LoanStatus;
  remarks: string | null;
  alias: string | null;
  term_months: number;
  archived_at: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type LoanInstallmentRecord = {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  scheduled_amount_centavos: number;
  penalty_amount_centavos: number;
  penalty_paid_centavos: number;
  paid_amount_centavos: number;
  penalty_assessed_at: string | null;
};

export type MonthlyMonitoringRecord = {
  id: number;
  loan_id: number;
  period_month: string;
  expected_principal_centavos: number;
  expected_interest_centavos: number;
  expected_total_centavos: number;
  actual_collected_centavos: number;
  outstanding_centavos: number;
  status: MonitoringStatus;
};


export type FundTransactionRecord = {
  id: number;
  transaction_type: FundTransactionType;
  amount_centavos: number;
  transaction_date: string;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
};

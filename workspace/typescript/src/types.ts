export type SkipReason =
  | "duplicate_id"
  | "invalid_amount"
  | "missing_due_date"
  | "invalid_due_date"
  | "invalid_paid_date";

export interface Invoice {
  id: string;
  customer: string;
  email?: string;
  amount: number;
  currency: string;
  due_date: string;
  paid_date: string | null;
}

export interface SentReminder {
  invoice_id: string;
  step: "friendly" | "firm" | "final";
  sent_on?: string;
}

export interface Action {
  invoice_id: string;
  step: "friendly" | "firm" | "final";
  needs_approval: boolean;
  days_overdue: number;
  message: string;
}

export interface SkippedItem {
  invoice_id: string;
  reason: SkipReason;
}

export interface Plan {
  today: string;
  actions: Action[];
  skipped: SkippedItem[];
}

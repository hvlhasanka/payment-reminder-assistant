// Payment reminder rules engine (part 1).
//
// Run from inside typescript/ (after npm install):
//
//   npm run plan -- --invoices ../data/invoices.json --sent ../data/sent.json --today 2026-10-12 --out ../actions.json
//

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Action, Invoice, Plan, SentReminder, SkippedItem } from "./types";
import { daysBetween, isValidCalendarDate } from "./utils/date";
import { buildMessage, Step } from "./utils/message";
import { getSkipReason } from "./utils/validator";

export * from "./types";

const STEP_RANK: Record<Step, number> = {
  friendly: 1,
  firm: 2,
  final: 3,
};

/**
 * Return the plan for `today`.
 * invoices: the list from invoices.json
 * sent: the list from sent.json
 * today: a date string, YYYY-MM-DD
 */
export function buildPlan(invoices: unknown[], sent: unknown[], today: string): Plan {
  const actions: Action[] = [];
  const skipped: SkippedItem[] = [];

  // Step 1: Pre-pass to identify duplicate invoice IDs across the input
  const idCounts = new Map<string, number>();
  for (const item of invoices) {
    if (typeof item === "object" && item !== null && "id" in item && typeof (item as { id: unknown }).id === "string") {
      const id = (item as { id: string }).id;
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
  }

  // Set to keep track of skipped invoice IDs so each duplicate ID is recorded once in skipped
  const recordedSkippedIds = new Set<string>();

  // Filter and index sent reminders: ignore invalid steps or unknown shapes
  const maxSentRankByInvoice = new Map<string, number>();
  if (Array.isArray(sent)) {
    for (const record of sent) {
      if (
        typeof record === "object" &&
        record !== null &&
        "invoice_id" in record &&
        "step" in record
      ) {
        const sr = record as SentReminder;
        if (sr.step in STEP_RANK && typeof sr.invoice_id === "string") {
          const rank = STEP_RANK[sr.step as Step];
          const currentMax = maxSentRankByInvoice.get(sr.invoice_id) ?? 0;
          if (rank > currentMax) {
            maxSentRankByInvoice.set(sr.invoice_id, rank);
          }
        }
      }
    }
  }

  // Process invoices
  if (Array.isArray(invoices)) {
    for (const rawInvoice of invoices) {
      const inv = rawInvoice as Partial<Invoice> | null | undefined;
      const invoiceId = inv?.id ?? "";
      const isDuplicate = invoiceId !== "" && (idCounts.get(invoiceId) ?? 0) > 1;

      // 1. Validation pipeline
      const skipReason = getSkipReason(rawInvoice, isDuplicate, today);
      if (skipReason) {
        if (!recordedSkippedIds.has(invoiceId)) {
          recordedSkippedIds.add(invoiceId);
          skipped.push({
            invoice_id: invoiceId,
            reason: skipReason,
          });
        }
        continue;
      }

      // Valid invoice guarantee
      const validInvoice = rawInvoice as Invoice;

      // 2. Paid check: if paid on or before today, plan nothing
      if (validInvoice.paid_date !== null && validInvoice.paid_date <= today) {
        continue;
      }

      // 3. Days overdue
      const daysOverdue = daysBetween(validInvoice.due_date, today);
      if (daysOverdue < 3) {
        continue;
      }

      // 4. Action threshold: determine highest qualifying step
      let qualifyingStep: Step;
      let needsApproval: boolean;

      if (daysOverdue >= 24) {
        qualifyingStep = "final";
        needsApproval = true;
      } else if (daysOverdue >= 10) {
        qualifyingStep = "firm";
        needsApproval = true;
      } else {
        qualifyingStep = "friendly";
        needsApproval = false;
      }

      // Deduplication against sent.json:
      // If qualifying step OR a higher step was already sent, plan nothing.
      const highestSentRank = maxSentRankByInvoice.get(validInvoice.id) ?? 0;
      const qualifyingRank = STEP_RANK[qualifyingStep];

      if (highestSentRank >= qualifyingRank) {
        continue;
      }

      // Generate message
      const message = buildMessage(qualifyingStep, {
        customer: validInvoice.customer,
        invoiceId: validInvoice.id,
        dueDate: validInvoice.due_date,
        amount: validInvoice.amount,
        currency: validInvoice.currency,
        daysOverdue,
      });

      actions.push({
        invoice_id: validInvoice.id,
        step: qualifyingStep,
        needs_approval: needsApproval,
        days_overdue: daysOverdue,
        message,
      });
    }
  }

  // Plain-text character-by-character sort by invoice_id
  const plainTextCompare = (a: { invoice_id: string }, b: { invoice_id: string }): number => {
    if (a.invoice_id < b.invoice_id) return -1;
    if (a.invoice_id > b.invoice_id) return 1;
    return 0;
  };

  actions.sort(plainTextCompare);
  skipped.sort(plainTextCompare);

  return {
    today,
    actions,
    skipped,
  };
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function main(): void {
  const { values } = parseArgs({
    options: {
      invoices: { type: "string" },
      sent: { type: "string" },
      today: { type: "string" },
      out: { type: "string" },
    },
  });

  if (!values.invoices || !values.sent || !values.today || !values.out) {
    console.error("Usage: npm run plan -- --invoices FILE --sent FILE --today YYYY-MM-DD --out FILE");
    process.exit(2);
  }

  if (!isValidCalendarDate(values.today)) {
    console.error(`Invalid date for --today: "${values.today}". Expected valid calendar YYYY-MM-DD date.`);
    process.exit(1);
  }

  let invoices: unknown[];
  let sent: unknown[];

  try {
    invoices = readJson(values.invoices) as unknown[];
  } catch (err) {
    console.error(`Failed to read or parse invoices file at "${values.invoices}":`, err);
    process.exit(1);
  }

  try {
    sent = readJson(values.sent) as unknown[];
  } catch (err) {
    console.error(`Failed to read or parse sent file at "${values.sent}":`, err);
    process.exit(1);
  }

  const plan = buildPlan(invoices, sent, values.today);
  writeFileSync(values.out, JSON.stringify(plan, null, 2) + "\n", "utf-8");
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

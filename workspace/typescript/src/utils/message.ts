import { formatAmount } from "./format";

export type Step = "friendly" | "firm" | "final";

export interface MessageParams {
  customer: string;
  invoiceId: string;
  dueDate: string;
  amount: number;
  currency: string;
  daysOverdue: number;
}

/**
 * Generate an email reminder message matching the step tone (friendly, firm, or final).
 *
 */
export function buildMessage(step: Step, params: MessageParams): string {
  const formattedAmount = formatAmount(params.amount, params.currency);
  const daysText = params.daysOverdue === 1 ? "1 day" : `${params.daysOverdue} days`;

  switch (step) {
    case "friendly":
      return (
        `Dear ${params.customer},\n\n` +
        `This is a friendly reminder that invoice ${params.invoiceId} was due on ${params.dueDate} and is currently ${daysText} overdue. ` +
        `The outstanding balance is ${formattedAmount}.\n\n` +
        `Please arrange for payment at your earliest convenience.`
      );

    case "firm":
      return (
        `Dear ${params.customer},\n\n` +
        `Invoice ${params.invoiceId} for ${formattedAmount} is now ${daysText} overdue (due date: ${params.dueDate}).\n\n` +
        `Please attend to this outstanding payment as soon as possible.`
      );

    case "final":
      return (
        `Dear ${params.customer},\n\n` +
        `Invoice ${params.invoiceId} with an outstanding balance of ${formattedAmount} is now ${daysText} overdue (due date: ${params.dueDate}).\n\n` +
        `Prompt settlement of this invoice is required.`
      );
  }
}

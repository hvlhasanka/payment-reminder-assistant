import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSkipReason } from "../src/utils/validator";

describe("Validator - Skippable Reasons", () => {
  const today = "2026-10-12";

  it("passes a completely valid invoice", () => {
    const validInvoice = {
      id: "INV-1001",
      customer: "Example Ltd",
      amount: 1250.0,
      currency: "EUR",
      due_date: "2026-09-30",
      paid_date: null,
    };
    assert.equal(getSkipReason(validInvoice, false, today), null);
  });

  it("passes an invoice paid on or before today", () => {
    const paidInvoice = {
      id: "INV-1002",
      customer: "Example Ltd",
      amount: 500,
      currency: "EUR",
      due_date: "2026-09-30",
      paid_date: "2026-10-10",
    };
    assert.equal(getSkipReason(paidInvoice, false, today), null);
  });

  it("1. duplicate_id: flags duplicate ID ahead of all other flaws", () => {
    const badInvoice = {
      id: "INV-DUP",
      amount: -100, // also invalid_amount
      due_date: "", // also missing_due_date
    };
    assert.equal(getSkipReason(badInvoice, true, today), "duplicate_id");
  });

  it("2. invalid_amount: missing amount", () => {
    const inv = { id: "INV-1", due_date: "2026-09-30", paid_date: null };
    assert.equal(getSkipReason(inv, false, today), "invalid_amount");
  });

  it("2. invalid_amount: non-number types (string, boolean, null)", () => {
    assert.equal(getSkipReason({ amount: "100", due_date: "2026-09-30" }, false, today), "invalid_amount");
    assert.equal(getSkipReason({ amount: true, due_date: "2026-09-30" }, false, today), "invalid_amount");
    assert.equal(getSkipReason({ amount: null, due_date: "2026-09-30" }, false, today), "invalid_amount");
    assert.equal(getSkipReason({ amount: NaN, due_date: "2026-09-30" }, false, today), "invalid_amount");
    assert.equal(getSkipReason({ amount: Infinity, due_date: "2026-09-30" }, false, today), "invalid_amount");
  });

  it("2. invalid_amount: zero or negative amounts", () => {
    assert.equal(getSkipReason({ amount: 0, due_date: "2026-09-30" }, false, today), "invalid_amount");
    assert.equal(getSkipReason({ amount: -50, due_date: "2026-09-30" }, false, today), "invalid_amount");
  });

  it("2. invalid_amount precedes missing_due_date", () => {
    const inv = { amount: -50, due_date: null };
    assert.equal(getSkipReason(inv, false, today), "invalid_amount");
  });

  it("3. missing_due_date: missing, null, or empty string", () => {
    assert.equal(getSkipReason({ amount: 100 }, false, today), "missing_due_date");
    assert.equal(getSkipReason({ amount: 100, due_date: null }, false, today), "missing_due_date");
    assert.equal(getSkipReason({ amount: 100, due_date: "" }, false, today), "missing_due_date");
  });

  it("3. missing_due_date precedes invalid_due_date", () => {
    assert.equal(getSkipReason({ amount: 100, due_date: "" }, false, today), "missing_due_date");
  });

  it("4. invalid_due_date: invalid calendar date or non-ISO format", () => {
    assert.equal(getSkipReason({ amount: 100, due_date: "2026-02-30" }, false, today), "invalid_due_date");
    assert.equal(getSkipReason({ amount: 100, due_date: "30/09/2026" }, false, today), "invalid_due_date");
    assert.equal(getSkipReason({ amount: 100, due_date: "not-a-date" }, false, today), "invalid_due_date");
  });

  it("4. invalid_due_date precedes invalid_paid_date", () => {
    const inv = {
      amount: 100,
      due_date: "2026-02-30", // invalid due date
      paid_date: "2026-10-25", // also invalid paid date (> today)
    };
    assert.equal(getSkipReason(inv, false, today), "invalid_due_date");
  });

  it("5. invalid_paid_date: non-null non-date or invalid calendar date", () => {
    assert.equal(getSkipReason({ amount: 100, due_date: "2026-09-30", paid_date: "" }, false, today), "invalid_paid_date");
    assert.equal(getSkipReason({ amount: 100, due_date: "2026-09-30", paid_date: "2026-02-30" }, false, today), "invalid_paid_date");
    assert.equal(getSkipReason({ amount: 100, due_date: "2026-09-30", paid_date: "05/10/2026" }, false, today), "invalid_paid_date");
  });

  it("5. invalid_paid_date: paid date after today", () => {
    assert.equal(getSkipReason({ amount: 100, due_date: "2026-09-30", paid_date: "2026-10-13" }, false, today), "invalid_paid_date");
  });
});

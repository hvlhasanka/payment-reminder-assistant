import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPlan } from "../src/plan";

describe("Plan Engine - buildPlan", () => {
  const today = "2026-10-12";

  it("empty input gives an empty plan", () => {
    assert.deepEqual(buildPlan([], [], today), {
      today,
      actions: [],
      skipped: [],
    });
  });

  describe("Thresholds and Overdue Progression", () => {
    it("plans nothing if less than 3 days overdue", () => {
      const invoices = [
        {
          id: "INV-1",
          customer: "Client A",
          amount: 100,
          currency: "EUR",
          due_date: "2026-10-10", // 2 days overdue
          paid_date: null,
        },
        {
          id: "INV-2",
          customer: "Client B",
          amount: 100,
          currency: "EUR",
          due_date: "2026-10-12", // 0 days overdue
          paid_date: null,
        },
      ];
      const plan = buildPlan(invoices, [], today);
      assert.equal(plan.actions.length, 0);
      assert.equal(plan.skipped.length, 0);
    });

    it("qualifies for friendly at 3 days overdue (needs_approval: false)", () => {
      const invoices = [
        {
          id: "INV-1",
          customer: "Client A",
          amount: 250,
          currency: "EUR",
          due_date: "2026-10-09", // exactly 3 days
          paid_date: null,
        },
      ];
      const plan = buildPlan(invoices, [], today);
      assert.equal(plan.actions.length, 1);
      assert.equal(plan.actions[0].step, "friendly");
      assert.equal(plan.actions[0].needs_approval, false);
      assert.equal(plan.actions[0].days_overdue, 3);
    });

    it("qualifies for firm at 10 days overdue (needs_approval: true)", () => {
      const invoices = [
        {
          id: "INV-1",
          customer: "Client A",
          amount: 500,
          currency: "EUR",
          due_date: "2026-10-02", // exactly 10 days
          paid_date: null,
        },
      ];
      const plan = buildPlan(invoices, [], today);
      assert.equal(plan.actions.length, 1);
      assert.equal(plan.actions[0].step, "firm");
      assert.equal(plan.actions[0].needs_approval, true);
      assert.equal(plan.actions[0].days_overdue, 10);
    });

    it("tests threshold boundaries: 0, 2 (none), 3 (friendly), 9 (friendly), 10 (firm), 23 (firm), 24 (final)", () => {
      const invoices = [
        { id: "INV-0", customer: "A", amount: 100, currency: "EUR", due_date: "2026-10-12", paid_date: null }, // 0 days
        { id: "INV-2", customer: "A", amount: 100, currency: "EUR", due_date: "2026-10-10", paid_date: null }, // 2 days
        { id: "INV-3", customer: "A", amount: 100, currency: "EUR", due_date: "2026-10-09", paid_date: null }, // 3 days -> friendly
        { id: "INV-9", customer: "A", amount: 100, currency: "EUR", due_date: "2026-10-03", paid_date: null }, // 9 days -> friendly
        { id: "INV-10", customer: "A", amount: 100, currency: "EUR", due_date: "2026-10-02", paid_date: null }, // 10 days -> firm
        { id: "INV-23", customer: "A", amount: 100, currency: "EUR", due_date: "2026-09-19", paid_date: null }, // 23 days -> firm
        { id: "INV-24", customer: "A", amount: 100, currency: "EUR", due_date: "2026-09-18", paid_date: null }, // 24 days -> final
      ];
      const plan = buildPlan(invoices, [], today);
      const actionMap = new Map(plan.actions.map((a) => [a.invoice_id, a.step]));
      assert.equal(actionMap.has("INV-0"), false);
      assert.equal(actionMap.has("INV-2"), false);
      assert.equal(actionMap.get("INV-3"), "friendly");
      assert.equal(actionMap.get("INV-9"), "friendly");
      assert.equal(actionMap.get("INV-10"), "firm");
      assert.equal(actionMap.get("INV-23"), "firm");
      assert.equal(actionMap.get("INV-24"), "final");
    });
  });

  describe("Duplicate Invoice IDs", () => {
    it("skips all duplicate invoices and records the invoice ID only once in skipped", () => {
      const invoices = [
        { id: "INV-DUP", customer: "A", amount: 100, currency: "EUR", due_date: "2026-09-01", paid_date: null },
        { id: "INV-DUP", customer: "A", amount: 200, currency: "EUR", due_date: "2026-09-01", paid_date: null },
        { id: "INV-DUP", customer: "A", amount: 300, currency: "EUR", due_date: "2026-09-01", paid_date: null },
        { id: "INV-VALID", customer: "B", amount: 100, currency: "EUR", due_date: "2026-10-09", paid_date: null },
      ];
      const plan = buildPlan(invoices, [], today);
      assert.equal(plan.actions.length, 1);
      assert.equal(plan.actions[0].invoice_id, "INV-VALID");

      assert.equal(plan.skipped.length, 1);
      assert.deepEqual(plan.skipped[0], {
        invoice_id: "INV-DUP",
        reason: "duplicate_id",
      });
    });
  });

  describe("Paid Invoices", () => {
    it("plans nothing if paid on today", () => {
      const invoices = [
        {
          id: "INV-1",
          customer: "Client A",
          amount: 100,
          currency: "EUR",
          due_date: "2026-09-01",
          paid_date: "2026-10-12", // today
        },
      ];
      const plan = buildPlan(invoices, [], today);
      assert.equal(plan.actions.length, 0);
    });

    it("plans nothing if paid before today even if past reminders were sent", () => {
      const invoices = [
        {
          id: "INV-1",
          customer: "Client A",
          amount: 100,
          currency: "EUR",
          due_date: "2026-09-01",
          paid_date: "2026-10-05",
        },
      ];
      const sent = [{ invoice_id: "INV-1", step: "friendly", sent_on: "2026-09-10" }];
      const plan = buildPlan(invoices, sent, today);
      assert.equal(plan.actions.length, 0);
    });
  });

  describe("Deduplication against sent.json", () => {
    const invoice = {
      id: "INV-1",
      customer: "Client A",
      amount: 100,
      currency: "EUR",
      due_date: "2026-09-30", // 12 days overdue -> qualifies for firm
      paid_date: null,
    };

    it("plans firm if nothing was sent", () => {
      const plan = buildPlan([invoice], [], today);
      assert.equal(plan.actions.length, 1);
      assert.equal(plan.actions[0].step, "firm");
    });

    it("plans firm if only friendly was previously sent", () => {
      const sent = [{ invoice_id: "INV-1", step: "friendly", sent_on: "2026-10-04" }];
      const plan = buildPlan([invoice], sent, today);
      assert.equal(plan.actions.length, 1);
      assert.equal(plan.actions[0].step, "firm");
    });

    it("plans nothing if firm was already sent", () => {
      const sent = [{ invoice_id: "INV-1", step: "firm", sent_on: "2026-10-11" }];
      const plan = buildPlan([invoice], sent, today);
      assert.equal(plan.actions.length, 0);
    });

    it("plans nothing if final was already sent", () => {
      const sent = [{ invoice_id: "INV-1", step: "final", sent_on: "2026-10-11" }];
      const plan = buildPlan([invoice], sent, today);
      assert.equal(plan.actions.length, 0);
    });

    it("ignores sent records with unrecognized steps or invalid invoice IDs", () => {
      const sent = [
        { invoice_id: "INV-1", step: "unknown_step" },
        { invoice_id: "NON_EXISTENT", step: "firm" },
      ];
      const plan = buildPlan([invoice], sent, today);
      assert.equal(plan.actions.length, 1);
      assert.equal(plan.actions[0].step, "firm");
    });
  });

  describe("Plain text character-by-character sorting", () => {
    it("sorts actions lexicographically so INV-100 comes before INV-99", () => {
      const invoices = [
        { id: "INV-99", customer: "A", amount: 100, currency: "EUR", due_date: "2026-10-01", paid_date: null },
        { id: "INV-100", customer: "B", amount: 100, currency: "EUR", due_date: "2026-10-01", paid_date: null },
        { id: "INV-10", customer: "C", amount: 100, currency: "EUR", due_date: "2026-10-01", paid_date: null },
      ];
      const plan = buildPlan(invoices, [], today);
      assert.deepEqual(
        plan.actions.map((a) => a.invoice_id),
        ["INV-10", "INV-100", "INV-99"]
      );
    });

    it("sorts skipped items alphabetical order", () => {
      const invoices = [
        { id: "INV-99", customer: "A", amount: -10, currency: "EUR", due_date: "2026-10-01", paid_date: null },
        { id: "INV-100", customer: "B", amount: -10, currency: "EUR", due_date: "2026-10-01", paid_date: null },
      ];
      const plan = buildPlan(invoices, [], today);
      assert.deepEqual(
        plan.skipped.map((s) => s.invoice_id),
        ["INV-100", "INV-99"]
      );
    });
  });

  describe("Message content guarantees", () => {
    it("includes customer, invoice ID, due date, formatted amount, and days overdue", () => {
      const invoice = {
        id: "INV-1234",
        customer: "AMAX Corporation",
        amount: 1250,
        currency: "EUR",
        due_date: "2026-09-30",
        paid_date: null,
      };
      const plan = buildPlan([invoice], [], today);
      const action = plan.actions[0];

      assert.match(action.message, /AMAX Corporation/);
      assert.match(action.message, /INV-1234/);
      assert.match(action.message, /2026-09-30/);
      assert.match(action.message, /EUR 1250\.00/);
      assert.match(action.message, /12 days/);
    });
  });
});

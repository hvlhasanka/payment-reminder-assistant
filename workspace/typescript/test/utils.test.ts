import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidCalendarDate, daysBetween } from "../src/utils/date";
import { formatAmount } from "../src/utils/format";

describe("Date utilities", () => {
  describe("isValidCalendarDate", () => {
    it("accepts valid standard calendar dates", () => {
      assert.equal(isValidCalendarDate("2026-10-12"), true);
      assert.equal(isValidCalendarDate("2026-01-01"), true);
      assert.equal(isValidCalendarDate("2026-12-31"), true);
    });

    it("accepts leap day on leap years", () => {
      assert.equal(isValidCalendarDate("2024-02-29"), true);
      assert.equal(isValidCalendarDate("2000-02-29"), true);
    });

    it("rejects leap day on non-leap years", () => {
      assert.equal(isValidCalendarDate("2026-02-29"), false);
      assert.equal(isValidCalendarDate("2025-02-29"), false);
      assert.equal(isValidCalendarDate("1900-02-29"), false);
    });

    it("rejects non-existent days in months with 30 days", () => {
      assert.equal(isValidCalendarDate("2026-04-31"), false);
      assert.equal(isValidCalendarDate("2026-06-31"), false);
      assert.equal(isValidCalendarDate("2026-09-31"), false);
      assert.equal(isValidCalendarDate("2026-11-31"), false);
    });

    it("rejects impossible calendar dates", () => {
      assert.equal(isValidCalendarDate("2026-02-30"), false);
      assert.equal(isValidCalendarDate("2026-13-01"), false);
      assert.equal(isValidCalendarDate("2026-00-10"), false);
      assert.equal(isValidCalendarDate("2026-05-00"), false);
      assert.equal(isValidCalendarDate("2026-05-32"), false);
    });

    it("rejects malformed string formats", () => {
      assert.equal(isValidCalendarDate("30/09/2026"), false);
      assert.equal(isValidCalendarDate("2026/09/30"), false);
      assert.equal(isValidCalendarDate("2026-9-5"), false);
      assert.equal(isValidCalendarDate("2026-09-5"), false);
      assert.equal(isValidCalendarDate("2026-9-05"), false);
      assert.equal(isValidCalendarDate(""), false);
      assert.equal(isValidCalendarDate("2026-10-12T00:00:00Z"), false);
      // @ts-expect-error test non-string types
      assert.equal(isValidCalendarDate(null), false);
      // @ts-expect-error test non-string types
      assert.equal(isValidCalendarDate(undefined), false);
    });
  });

  describe("daysBetween", () => {
    it("returns 0 when fromDate equals toDate", () => {
      assert.equal(daysBetween("2026-10-12", "2026-10-12"), 0);
    });

    it("calculates positive difference when toDate is after fromDate", () => {
      assert.equal(daysBetween("2026-09-30", "2026-10-12"), 12);
      assert.equal(daysBetween("2026-10-09", "2026-10-12"), 3);
      assert.equal(daysBetween("2026-10-02", "2026-10-12"), 10);
      assert.equal(daysBetween("2026-09-18", "2026-10-12"), 24);
    });

    it("calculates negative difference when toDate is before fromDate", () => {
      assert.equal(daysBetween("2026-10-15", "2026-10-12"), -3);
    });

    it("handles month and year boundaries correctly across leap years", () => {
      assert.equal(daysBetween("2024-02-28", "2024-03-01"), 2); // 2024 has 29 Feb
      assert.equal(daysBetween("2025-02-28", "2025-03-01"), 1); // 2025 has 28 Feb
      assert.equal(daysBetween("2025-12-31", "2026-01-01"), 1);
    });
  });
});

describe("Format utilities", () => {
  describe("formatAmount", () => {
    it("formats integer amounts with 2 decimals", () => {
      assert.equal(formatAmount(1250, "EUR"), "EUR 1250.00");
    });

    it("formats single decimal amounts with 2 decimals", () => {
      assert.equal(formatAmount(1250.5, "EUR"), "EUR 1250.50");
    });

    it("formats fractional amounts with 2 decimals", () => {
      assert.equal(formatAmount(1250.99, "USD"), "USD 1250.99");
    });
  });
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("CLI Integration - plan.ts", () => {
  const tsxPath = join(process.cwd(), "node_modules/.bin/tsx");
  const planScript = join(process.cwd(), "src/plan.ts");
  const validInvoices = join(process.cwd(), "../data/invoices.json");
  const validSent = join(process.cwd(), "../data/sent.json");
  const tmpOut = join(process.cwd(), "test_cli_out.json");

  const runCli = (args: string[]) => {
    try {
      const stdout = execFileSync(tsxPath, [planScript, ...args], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { status: 0, stdout, stderr: "" };
    } catch (error: unknown) {
      const err = error as { status?: number; stdout?: string; stderr?: string };
      return {
        status: err.status ?? 1,
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
      };
    }
  };

  it("exits with 0 and writes expected JSON output when given valid arguments", () => {
    const res = runCli([
      "--invoices", validInvoices,
      "--sent", validSent,
      "--today", "2026-10-12",
      "--out", tmpOut,
    ]);

    assert.equal(res.status, 0);
    const content = JSON.parse(readFileSync(tmpOut, "utf-8"));
    assert.equal(content.today, "2026-10-12");
    assert.ok(Array.isArray(content.actions));
    assert.ok(Array.isArray(content.skipped));
    assert.ok(content.actions.length > 0);

    unlinkSync(tmpOut);
  });

  it("exits with non-zero when required options are missing", () => {
    const res = runCli(["--invoices", validInvoices]);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Usage:/);
  });

  it("exits with non-zero when --today is not a valid date", () => {
    const res = runCli([
      "--invoices", validInvoices,
      "--sent", validSent,
      "--today", "2026-02-30",
      "--out", tmpOut,
    ]);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Invalid date for --today/);
  });

  it("exits with non-zero when invoices file does not exist", () => {
    const res = runCli([
      "--invoices", "non_existent_invoices.json",
      "--sent", validSent,
      "--today", "2026-10-12",
      "--out", tmpOut,
    ]);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Failed to read or parse invoices file/);
  });

  it("exits with non-zero when sent file does not exist", () => {
    const res = runCli([
      "--invoices", validInvoices,
      "--sent", "non_existent_sent.json",
      "--today", "2026-10-12",
      "--out", tmpOut,
    ]);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Failed to read or parse sent file/);
  });
});

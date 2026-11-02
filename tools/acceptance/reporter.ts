import type {
  Reporter,
  FullResult,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { context } from "./context";
export default class AcceptanceReporter implements Reporter {
  private cases: Array<{
    title: string;
    file: string;
    line: number;
    status: string;
    durationMs: number;
  }> = [];
  onError(error: { message?: string }) {
    console.error(error.message ?? "Playwright infrastructure failure");
  }
  onStdErr(chunk: string | Buffer) {
    process.stderr.write(chunk);
  }
  onTestEnd(test: TestCase, result: TestResult) {
    this.cases.push({
      title: test.titlePath().join(" > "),
      file: relative(process.cwd(), test.location.file),
      line: test.location.line,
      status: result.status,
      durationMs: result.duration,
    });
  }
  onEnd(result: FullResult) {
    writeFileSync(
      resolve(context().output, "cases.json"),
      JSON.stringify(
        {
          status: result.status,
          cases: this.cases,
        },
        null,
        2,
      ) + "\n",
    );
  }
}

import { readFile } from "node:fs/promises";

const report = JSON.parse(await readFile("reports/cucumber-report.json", "utf8"));
const scenarios = report.flatMap((feature) => feature.elements ?? []);
const results = scenarios.flatMap((scenario) => scenario.steps ?? []).map((step) => step.result?.status);
const failed = results.filter((status) => status === "failed").length;
console.log(`Scenarios: ${scenarios.length}; failed steps: ${failed}`);
process.exitCode = failed ? 1 : 0;


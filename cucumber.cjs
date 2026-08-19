module.exports = {
  default: {
    paths: ["automation/features/**/*.feature"],
    import: [
      "automation/src/support/**/*.ts",
      "automation/src/steps/**/*.ts"
    ],
    format: [
      "progress-bar",
      "html:reports/cucumber-report.html",
      "json:reports/cucumber-report.json",
      "junit:reports/cucumber-report.xml"
    ],
    formatOptions: { snippetInterface: "async-await" },
    parallel: 1
  }
};

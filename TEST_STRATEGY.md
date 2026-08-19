# Tourney System Test Strategy

## 1. Purpose

This document explains the product's business flow, the risks selected for
testing, the ten most important user scenarios, and the architecture used to
automate them. It lets a reviewer understand both **what is tested** and **why
the solution was designed this way** without first reading the implementation.

The goal is not to automate every possible case. The goal is to prove the
highest-value behaviour across the complete system boundary:

```text
User action in UI -> API processing -> MySQL state -> Updated user outcome
```

### Reviewer summary

Nine focused scenarios automate the highest-risk creation, validation, table
scoring, duplicate protection, knockout progression, score-boundary and API
error paths. They use the UI for user behaviour, direct API calls for contract
edges, and MySQL for independent business-state verification. All 9 scenarios
and 38 steps pass against the supplied Docker system. Remaining priorities are
knockout byes, valid rating updates and language switching. Environment and
contract observations are recorded separately in `FINDINGS.md`.

## 2. Application and business flow

The system has two user-facing React applications:

- **Tournament Setup (`:3001`)** - an administrator selects a sport and format,
  configures a tournament, adds contestants, and creates it.
- **Match Entry (`:3002`)** - a score-entry user selects a tournament and match,
  submits a sport-specific score, and views the resulting standings, rating, or
  knockout progression.

The black-box API (`:8080`) applies the business rules and persists data in
MySQL. The supplied OpenAPI file describes the intended contract, while the
database provides an independent source for verifying actual system state.

### Main end-to-end flow

```text
Administrator creates tournament
              |
              v
API stores tournament and contestants
              |
              v
System generates matches (or user creates a rating match)
              |
              v
Score-entry user selects a pending match
              |
              v
Sport schema renders the required score form
              |
              v
API validates score and calculates outcome
              |
              v
MySQL stores score/outcome and updates tournament state
              |
              v
UI shows standings, rating, or knockout progression
```

### Tournament formats

- **Table:** scheduled matches produce wins, draws, losses and configurable
  points. The main risk is incorrect or duplicate standings updates.
- **Knockout:** a winner must progress to the correct next-round match. The main
  risk is corrupting the bracket or advancing the wrong contestant.
- **Rating:** users create matches between contestants and results change their
  ratings. The main risk is accepting invalid pairings or calculating ratings
  more than once.

## 3. Risk-based automation approach

The assessment was approached in this order:

1. **Understand the system:** read the README, OpenAPI contract, score-entry
   schema and React source before choosing scenarios.
2. **Explore the running application:** confirm both UIs, API health, seeded
   sports and actual MySQL tables.
3. **Identify business risks:** prioritize persistence, data integrity,
   tournament progression, validation and repeated actions.
4. **Build one vertical test first:** drive the UI and verify the same operation
   in MySQL to prove the architecture end to end.
5. **Add distinct negative coverage:** test validation and invalid rating-match
   behaviour without duplicating the successful creation scenario.
6. **Control test data:** create unique records per scenario and remove only
   records owned by that scenario.
7. **Verify at the correct layer:** use the UI for user behaviour, API for
   contract/error investigation, and MySQL for persistent business state.
8. **Produce reviewable evidence:** generate HTML, JSON and JUnit reports and
   attach a screenshot when a scenario fails.

This avoids two common weaknesses: tests that assert only visible UI text, and
large suites containing many low-value variations of the same journey.

## 4. Ten important business scenarios

Seven of the ten core business scenarios are automated. Three deliberately
remain as visible next coverage; planned scenarios are not reported as passing.
Two additional API `404` contract scenarios bring the executable total to nine.

| # | Priority | Business scenario | Status |
|---|---|---|---|
| 1 | P0 | Create a table tournament and verify persistence | Automated and passing |
| 2 | P0 | Prevent tournament creation without a name | Automated and passing |
| 3 | P0 | Prevent a rating contestant playing themselves | Automated and passing |
| 4 | P0 | Score a table match and update standings | Automated and passing |
| 5 | P0 | Reject a second score for an already decided match | Automated and passing |
| 6 | P0 | Progress the correct knockout winner | Automated and passing |
| 7 | P1 | Handle a non-power-of-two knockout using byes | Planned investigation |
| 8 | P1 | Enforce minimum, maximum and required score values | Partially automated: schema bounds and below-minimum rejection |
| 9 | P1 | Create and score a valid rating match | Planned |
| 10 | P2 | Preserve behaviour when switching French and English | Planned |

### Scenario 1 - Create a table tournament

**User flow:** The administrator creates a four-contestant table tournament
with win/draw/loss points of `3/1/0`.

**Expected outcome:**

- The new tournament appears in Tournament Setup.
- MySQL contains the correct name, format and point configuration.
- Exactly four correctly named contestants belong to the tournament.
- Initial table matches are generated.

**Why it matters:** This is the core configuration journey and proves the
complete UI-to-database test architecture.

### Scenario 2 - Tournament name is required

**User flow:** The administrator completes the table-tournament form but leaves
the tournament name empty.

**Expected outcome:**

- Browser validation prevents submission.
- No tournament with the scenario's data is stored in MySQL.

**Why it matters:** A visible validation message is insufficient if partial
records are still written. The database no-write assertion protects integrity.

### Scenario 3 - Prevent a rating self-match

**User flow:** The user selects the same contestant as Player A and Player B.

**Expected outcome:**

- A clear explanation is displayed.
- The Create Match button is disabled.
- The match count in MySQL does not change.

**Why it matters:** A self-match is invalid and could corrupt rating history.

### Scenario 4 - Table score updates standings

**User flow:** The user submits a valid winning score for a pending table match.

**Expected outcome:**

- The raw score and winner are stored on the correct match.
- Both contestants' played counts increase once.
- The winner receives configured win points and the loser receives configured
  loss points.
- UI standings match MySQL standings.

**Why it matters:** Standings are the primary table-tournament business result.

### Scenario 5 - Reject duplicate score submission

**User flow:** A user attempts to submit a second result for an already decided
match.

**Expected outcome:**

- The second request is rejected, expected by contract as a conflict.
- The original score and outcome remain unchanged.
- Points, ratings or bracket progression are not applied twice.

**Why it matters:** Repeated clicks, retries and concurrent users can otherwise
cause severe data corruption.

### Scenario 6 - Knockout winner progresses

**User flow:** The user submits a valid result for a first-round knockout match.

**Expected outcome:**

- The correct winner is recorded.
- Only the winner appears in the appropriate next-round match.
- The loser does not progress and unrelated matches do not change.

**Why it matters:** One incorrect progression invalidates the whole bracket.

### Scenario 7 - Knockout tournament with byes

**User flow:** The administrator creates a knockout tournament with a
non-power-of-two contestant count, such as five.

**Expected outcome to investigate:**

- The API contract says byes are assigned automatically.
- Every contestant appears exactly once in the valid bracket state.
- The correct number of initial matches and byes is generated.

**Why it matters:** The UI suggests only 4, 8 or 16 contestants while the
OpenAPI contract says any count is supported. This must be investigated and
documented before fixing an expectation in automation.

### Scenario 8 - Score schema boundaries

**User flow:** The user submits minimum, maximum, below-minimum, above-maximum
and incomplete values in a schema-driven score form.

**Expected outcome:**

- Documented minimum and maximum values are accepted.
- Invalid or incomplete values are blocked or rejected.
- A rejected score leaves the match pending and causes no downstream update.

**Why it matters:** Every sport depends on the schema and scorer agreeing on the
submitted data shape.

### Scenario 9 - Valid rating match and rating update

**User flow:** The user creates a match between two different rating contestants
and submits a valid result.

**Expected outcome:**

- One pending match is created for the selected contestants.
- The result is stored once.
- Both ratings change according to the observed business rules.
- UI ranking order agrees with MySQL values.

**Why it matters:** This covers the complete rating workflow, not only its
invalid-input guard.

### Scenario 10 - Language switching

**User flow:** The user opens the default French UI, enters data, switches to
English and continues the workflow.

**Expected outcome:**

- Labels and actions change to English.
- Entered business data is not lost or modified.
- API and database values remain language-independent.

**Why it matters:** Both supplied UIs default to French and expose language
switching, creating a risk around state preservation and locator reliability.

## 5. Automation architecture

The framework follows the requested dependency flow:

```text
Test -> Fixtures -> Workflow -> Page Objects -> Verification
                          \-> Data / Services -> Application -> Report
```

### Layer responsibilities

| Layer | Responsibility | Must not contain |
|---|---|---|
| Test | Business-readable Gherkin scenarios | CSS selectors or SQL |
| Fixtures | Browser, page, database connection and scenario lifecycle | Business assertions |
| Workflow | Coordinates a complete user journey across pages | Low-level selector details |
| Page Objects | User interactions and page-specific observable state | Direct SQL |
| Verification | UI and database business assertions | Test-data creation |
| Data | Unique scenario-owned names and contestants | Browser actions |
| Services | Application readiness and parameterized database access | Gherkin wording |
| App | Docker-hosted UIs, API and MySQL under test | Test implementation |
| Report | Results and failure evidence | Test logic |

### Execution sequence for one scenario

```text
1. Hook checks API and both UIs are ready
2. Hook launches an isolated browser context
3. Hook opens a MySQL connection
4. Data builder creates a unique SDET-prefixed dataset
5. Workflow performs the user journey
6. Page object waits for observable UI completion
7. Verifier compares UI outcome with MySQL records
8. Failure screenshot is attached when required
9. Hook deletes only scenario-owned data in a transaction
10. Browser and database connections are closed
```

## 6. Why these tools are used

| Tool | Reason |
|---|---|
| TypeScript | Compile-time checks for page, workflow, data and database contracts |
| Playwright | Reliable modern browser automation, semantic locators, auto-waiting and screenshots |
| Cucumber/Gherkin | Business-readable scenarios and a confirmed role requirement |
| Cucumber World/Hooks | Isolated fixtures and guaranteed setup/cleanup for every scenario |
| `mysql2` | Parameterized MySQL queries for independent persistence verification |
| `dotenv` | Keeps URLs, ports and credentials outside test implementation |
| Docker Compose | Runs the supplied application consistently as four connected services |
| HTML/JSON/JUnit reports | Human review, machine-readable evidence and CI compatibility |
| Git | Preserves the supplied baseline and records intentional engineering changes |

Playwright assertions and observable state are used instead of fixed sleeps.
Parameterized queries are used instead of building SQL from test strings.

## 7. Locator and synchronization strategy

Locator priority is:

1. Role and accessible name.
2. User-visible label or placeholder.
3. Stable application test ID if semantic markup is insufficient.
4. Scoped CSS only for stable structural components.

The framework never uses arbitrary `waitForTimeout` calls. After creation it
waits for the uniquely named tournament row to appear before database
verification. This prevents race conditions while still testing what the user
can observe.

## 8. Test-data and cleanup strategy

- Every scenario creates a unique `SDET-<timestamp>-<random>` tournament name.
- Tests do not depend on existing tournament records or execution order.
- UI creates business data when creation is the behaviour under test.
- SQL reads provide independent verification of stored state.
- Cleanup targets the exact tournament ID discovered for the unique test name.
- Deletion is guarded by the `SDET-` prefix and executed transactionally.
- Supplied, manually created and unrelated records are never deleted.

This makes the suite repeatable while respecting the shared assessment
environment.

## 9. Configuration and secrets

Runtime configuration is loaded from `.env`:

- Application and API URLs.
- MySQL host, port, database and credentials.
- Browser selection and headless mode.
- Default timeout.

`.env` and generated reports are excluded from Git. `.env.example` documents
the required keys using only the credentials supplied for the local exercise.
No tokens, passwords or environment-specific URLs are embedded in test code.

## 10. Reporting and failure investigation

Each run creates:

- `reports/cucumber-report.html` for reviewer-friendly results.
- `reports/cucumber-report.json` for result processing.
- `reports/cucumber-report.xml` for CI systems.
- A full-page screenshot and Playwright trace attached to a failed scenario.

When a test fails, investigation follows the same system boundary as the user
journey:

```text
UI state -> network/API response -> API logs -> MySQL record
```

This identifies whether the failure belongs to the test, UI, API contract,
business logic or persistence layer.

## 11. Execution evidence

The framework was type-checked and executed against the complete Docker
application on 19 August 2026. All nine automated scenarios and all 38 steps
passed in 34 seconds, including live UI, API and MySQL assertions plus
transactional cleanup across matches, standings, contestants and tournaments.

The supplied API image is ARM64 while the assessment machine is Intel AMD64;
Docker Desktop emitted a platform warning and ran it through emulation. The
machine also had an unrelated MySQL server on host port 3306, so the assessment
database was exposed locally on port 3307 through an uncommitted Compose
override. Neither condition required a product-code change.

## 12. Priority improvements delivered and remaining

The requested review priorities were applied as follows. Each item distinguishes
completed evidence from intentionally remaining scope.

### 1. Table scoring and standings — completed

The scoring scenario submits a valid Tennis result and verifies:

- The raw score and outcome stored in `matches`.
- Played, won and lost counts.
- Configured win/loss points rather than hard-coded `3/0` values.
- Agreement between UI standings and MySQL standings.

This covers the main table-format business outcome.

### 2. Duplicate score protection — completed

The duplicate scenario submits a result twice and proves:

- The first result succeeds.
- The second submission is rejected as a conflict.
- The original score remains unchanged.
- Standings, ratings or knockout progression update only once.

This directly covers repeated actions, retries and data integrity.

### 3. Knockout progression — completed for four contestants

A four-contestant knockout scenario verifies that both first-round winners are
the two contestants in the generated final. Non-power-of-two counts and
automatic byes remain planned because the UI and OpenAPI disagree on support.

### 4. Score-schema boundaries — partially completed

The test proves the generated Tennis input exposes schema bounds `0..7`, rejects
`-1`, and leaves the match pending without a stored score. Above-maximum and
incomplete multi-set payloads remain focused next cases.

### 5. API contract tests — completed for selected `404` and `409` paths

The suite checks unknown tournament and match IDs (`404`) and duplicate scoring
(`409`) while `/health` remains the readiness gate. Remaining contract cases are:

- Rejected score payloads (`422`).
- Rating-match creation, which is used by the UI but absent from OpenAPI.

API checks should complement the end-user journeys rather than replace them.

### 6. CI integration — completed

The GitHub Actions workflow installs dependencies and Chromium, enables ARM
emulation, starts the Docker application, waits for health, runs verification,
uploads reports, and always stops the environment.

### 7. Cleanup across related tables — completed

Transactional teardown deletes matches, standings, contestants and then the
tournament in foreign-key-safe order. It is restricted to scenario-owned
`SDET-` records and runs after success or failure.

### 8. Better failure diagnostics — completed

Failed scenarios attach a full-page screenshot and retain a Playwright trace.
Business assertions include relevant IDs and observed values, and Cucumber
returns a non-zero exit code on failure.

### 9. Findings versus confirmed defects — completed

A separate `FINDINGS.md` table records:

- UI knockout-size guidance versus OpenAPI bye support.
- The rating-match endpoint missing from OpenAPI.
- The supplied ARM64 API image running on an Intel host through emulation.

Each entry distinguishes observed evidence, impact and classification. The
knockout ambiguity is not labelled a product defect without clarification.

### 10. Concise reviewer summary — completed

The summary near the top states:

- What is automated.
- Why those scenarios were selected.
- What passed.
- Important findings.
- What would be implemented next.

This lets a busy reviewer understand the value of the submission quickly.

## 13. Definition of done

A scenario is considered complete only when:

- Its business risk and expected result are understood.
- It can run independently with unique test data.
- It uses user-observable synchronization rather than fixed delays.
- The important persistent outcome is verified in MySQL.
- Invalid operations prove that no unintended write occurred.
- Cleanup runs after success or failure.
- Failure evidence is available in the report.
- The test passes from a clean application state.

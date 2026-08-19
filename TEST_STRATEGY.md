# Test Strategy

## Objective

Prove high-value tournament configuration behaviour from the user's point of
view and confirm that the visible result agrees with MySQL. The suite is kept
small intentionally: each scenario covers a distinct risk and owns its data.

## Scope and priorities

| Priority | Risk | Automated evidence |
|---|---|---|
| P0 | UI success without correct persistence | Table tournament, points, contestants and generated matches are checked in MySQL |
| P0 | Invalid input creates partial data | Missing name is blocked and MySQL remains unchanged |
| P1 | Invalid rating match damages integrity | Same-player match is disabled and no match row is added |

Score calculation and knockout progression are the next priorities after the
running environment has been explored. Their expected results depend on the
seeded sports, scorer functions and database schema, which should be observed
before encoding assumptions.

## Framework design

- **Tests:** Gherkin expresses business intent without selectors or SQL.
- **Fixtures:** Cucumber World and hooks create an isolated browser and database
  connection for each scenario.
- **Workflow:** coordinates complete user journeys.
- **Page objects:** contain UI interactions and semantic assertions only.
- **Verification:** compares visible behaviour with business records.
- **Data/services:** creates unique records and provides parameterised SQL.
- **Application:** checks that the API and both UIs are ready before browser work.
- **Reports:** HTML, JSON and JUnit output; failed scenarios include screenshots.

Tests use a unique `SDET-` prefix and never depend on execution order or seed
record names. Cleanup is restricted to the exact generated tournament and is
performed inside a transaction. The prefix guard prevents accidental deletion
of supplied or user-created tournaments.

## Environment and secrets

Configuration is read from `.env`. `.env` and generated reports are ignored by
Git; `.env.example` contains only the local credentials supplied with the
exercise. No tokens or credentials are embedded in test code.

## Known execution limitation

The framework was type-checked and all three Gherkin scenarios were dry-run
successfully in the assessment workspace. The supplied Docker application
could not be executed here because the host has no Docker CLI. Run the documented
Docker commands locally, inspect the actual MySQL schema, and execute `npm test`
before submission. Any schema difference discovered at that point should be
handled in the database service rather than leaking SQL into steps or tests.

## Next tests

1. Submit a valid table score and verify score JSON plus standings.
2. Reject a second result and prove standings are updated only once.
3. Verify knockout winner progression and non-power-of-two byes.
4. Cover minimum, maximum and incomplete schema-driven score values.
5. Create and score a valid rating match and verify rating changes.

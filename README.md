# Tourney System — QA Exercise

A tournament management system: sports, tournaments (knockout / table /
rating formats), contestants, and match scoring.

## Automated acceptance tests

The added suite uses TypeScript, Playwright, Cucumber and MySQL. It follows a
deliberate dependency direction:

```text
Test -> Fixtures -> Workflow -> Page Objects -> Verification
                         \-> Data / Services -> Application -> Report
```

The compact suite covers:

- table tournament creation with UI and database verification;
- required-name validation with a database no-write assertion;
- prevention of self-matches in rating tournaments.

### Install and run

After starting the application with the Docker commands below:

```bash
cp .env.example .env
npm install
npx playwright install chromium
npm run typecheck
npm test
```

Run only the fast end-to-end smoke scenario with `npm run test:smoke`. Set
`HEADLESS=false` in `.env` or use `npm run test:headed` when debugging.

Reports are generated under `reports/` in HTML, JSON and JUnit formats. A
full-page screenshot is embedded in the Cucumber report when a scenario fails.
Local credentials belong in `.env`; only the safe template is committed.

See [TEST_STRATEGY.md](TEST_STRATEGY.md) for scope, design decisions and known
limitations.

## Prerequisites

- Docker + Docker Compose v2 (`docker compose`, not the old standalone
  `docker-compose`). That's it — no Rust or Node needed locally.

## The exercise

Generate an automated test suite for this system from the end user's point
of view: drive the UI and validate outcomes against the database, not just
what's on screen. You have the UI source (`ui-config/` and `ui-user/`) and
read/write access to the database — use both. Follow your own standard
practices for how you structure and write the suite.

Use git to track your changes. Once you've unpacked this package:

```
git init && git add . && git commit -m "baseline"
```

## Running it

```
docker load < tourney-api-image.tar
docker compose up --build
```

The first command loads the pre-built API image (you don't have its
source — see "What's not provided" below). The second builds the two UIs
from the source included here and starts everything.

| Service     | URL                     | Notes                                             |
|-------------|-------------------------|---------------------------------------------------|
| `mysql`     | `localhost:3306`        | user `tourney`, password `tourney`, db `tourney`. |
| `api`       | `http://localhost:8080` | Black box — no source provided.                   |
| `ui-config` | `http://localhost:3001` | Create sports/tournaments/contestants.            |
| `ui-user`   | `http://localhost:3002` | Enter match scores.                               |

To reset to a clean state: `docker compose down -v` then `up --build` again.
Schema and seed data are applied automatically by
the API itself on startup against an empty database — there's no separate
migration step for you to run.

## What's provided

- `spec/openapi.yaml` — documents the API contract.
- `docs/score-entry-schema.md` — explains the schema each sport uses to
  drive the score-entry form in the user UI.
- `ui-config/` and `ui-user/` — full React source for both UIs, with their
  own `Dockerfile`/`package.json`. If you need to alter this source for
  testing, rebuild with `npm run build`, or just re-run
  `docker compose up --build`.
- Direct read/write access to the MySQL database (`localhost:3306`, creds
  above). Use it to verify state after UI actions, seed data for test setup,
  or probe how the system behaves when data is changed directly rather than
  through the UI.
- Both UIs default to **French**. A language switcher is present in each.

## What's not provided

- Source for the `api` service. It's a pre-built, compiled binary. Treat it
  as a black box: understand its behaviour through the UI, its HTTP
  responses, and the database — not by reading its code.

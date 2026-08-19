# Score Entry Schema

Each sport has two independent artifacts stored in `sports`:

- `score_entry_schema` (JSON) — tells the User UI what inputs to render and how
  to validate them client-side.
- `js_scorer` (TEXT, JavaScript) — takes the resulting score blob and returns
  the winner. Never sees the schema; only sees the data it produces.

These are independent artifacts. The schema does not generate the scorer,
and the scorer does not generate the schema.

## Shape

```jsonc
{
  "entry_type": "repeating_group" | "fixed_rows",
  "result_key": "sets",               // JSON property the submitted blob is nested under
  "participants": ["A", "B"],       // labels only; real contestant ids are bound at match time
  "fields": [
    { "key": "...", "label": "...", "input": "integer", "min": 0, "max": 7 }
  ],

  // repeating_group only:
  "unit_label": "Set",
  "min_units": 2,
  "max_units": 5,

  // fixed_rows only:
  "row_count": 18,
  "row_label": "Hole"
}
```

### `repeating_group`
Renders an "add unit" control (e.g. "Add Set") up to `max_units`, each unit
containing one instance of `fields` per participant. Submission produces:

```json
{ "sets": [ { "A": 6, "B": 4 }, { "A": 3, "B": 6 }, { "A": 7, "B": 6 } ] }
```

### `fixed_rows`
Renders exactly `row_count` rows, each with one instance of `fields` per
participant. Submission produces:

```json
{ "holes": [ { "A": 4, "B": 5 }, { "A": 3, "B": 3 }, ... ] }
```

## Contract with the JS scorer

The scorer receives exactly the submitted blob (`{"sets": [...]}` or
`{"holes": [...]}`) and must return:

```json
{ "outcome": "A" | "B" | "draw", "detail": { } }
```

`detail` is opaque to Rust — passed straight into `matches.score_json`
alongside the raw input for later inspection.

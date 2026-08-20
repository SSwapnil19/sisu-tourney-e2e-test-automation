# Assessment Findings

| ID | Observation | Evidence | Impact | Classification |
|---|---|---|---|---|
| FIND-01 | Knockout contestant guidance differs between UI and API contract | UI says exactly 4, 8 or 16; OpenAPI says other counts receive byes | Users and testers cannot determine the intended valid range | Requirement ambiguity |
| FIND-02 | Rating match creation is missing from OpenAPI | Match Entry calls `POST /tournaments/{id}/matches`, but the path is absent from `spec/openapi.yaml` | API consumers cannot discover or validate the operation from the contract | Documentation defect |
| FIND-03 | Supplied API image architecture is ARM64 | Docker reports `linux/arm64`; assessment host is Intel AMD64 | Requires emulation and increases startup/test duration | Environment compatibility risk |
| FIND-04 | Compose declares an obsolete version field | Docker Compose v2 emits a warning for `version: 3.9` | No functional failure, but creates avoidable setup noise | Maintenance observation |
| FIND-05 | Match outcome values differ from OpenAPI | OpenAPI documents `win/loss/tie`; the deployed API and UI use `A/B/draw` (and `Pending` before scoring) | Generated clients or contract assertions based on the specification will reject valid responses | Documentation defect |

These findings record observed evidence. FIND-01 is not treated as a confirmed
product defect until the intended knockout rule is clarified.

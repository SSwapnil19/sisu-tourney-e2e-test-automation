import { useState } from "react";
import { useI18n } from "./i18n";

function emptyUnit(fields) {
  const unit = {};
  for (const f of fields) unit[f.key] = "";
  return unit;
}

export function SchemaScoreForm({ schema, participantNames = {}, onSubmit, submitting }) {
  const { t } = useI18n();
  const isRepeating = schema.entry_type === "repeating_group";
  const isFixed = schema.entry_type === "fixed_rows";

  const initialRows = isFixed
    ? Array.from({ length: schema.row_count }, () => emptyUnit(schema.fields))
    : Array.from({ length: schema.min_units || 1 }, () => emptyUnit(schema.fields));

  const [rows, setRows] = useState(initialRows);

  const updateCell = (rowIdx, fieldKey, participant, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [`${fieldKey}__${participant}`]: value };
      return next;
    });
  };

  const addUnit = () => {
    if (schema.max_units && rows.length >= schema.max_units) return;
    setRows((prev) => [...prev, emptyUnit(schema.fields)]);
  };

  const buildResult = () => {
    const items = rows.map((row) => {
      const item = {};
      for (const participant of schema.participants) {
        const field = schema.fields[0]; // current schemas use a single field per row
        const raw = row[`${field.key}__${participant}`];
        item[participant] = raw === "" ? undefined : Number(raw);
      }
      return item;
    });
    return { [schema.result_key]: items };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(buildResult());
  };

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <table className="scoreboard">
        <thead>
          <tr>
            <th>{isFixed ? t("hole") : t("set")}</th>
            {schema.participants.map((p) => (
              <th key={p}>{participantNames[p] || p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              {schema.participants.map((participant) => (
                <td key={participant}>
                  <input
                    type="number"
                    value={row[`${schema.fields[0].key}__${participant}`] ?? ""}
                    min={schema.fields[0].min}
                    max={schema.fields[0].max}
                    onChange={(e) =>
                      updateCell(idx, schema.fields[0].key, participant, e.target.value)
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="score-form-actions">
        {isRepeating && (!schema.max_units || rows.length < schema.max_units) && (
          <button type="button" className="btn-secondary" onClick={addUnit}>
            {t("addSet")}
          </button>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t("submitting") : t("submitScore")}
        </button>
      </div>
    </form>
  );
}

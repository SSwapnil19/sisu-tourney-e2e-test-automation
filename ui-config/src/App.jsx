import { useEffect, useState } from "react";
import { useI18n } from "./i18n";
import { api } from "./api";

function LanguageSwitcher() {
  const { locale, setLocale, available, t } = useI18n();
  return (
    <div className="lang-switcher">
      <label>
        {t("language")}:{" "}
        <select value={locale} onChange={(e) => setLocale(e.target.value)}>
          {available.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const FORMAT_BADGE_CLASS = {
  knockout: "badge-knockout",
  table: "badge-table",
  rating: "badge-rating",
};

const KNOCKOUT_SIZES = [4, 8, 16];

export default function App() {
  const { t } = useI18n();
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [format, setFormat] = useState("knockout");
  const [contestants, setContestants] = useState(["", "", "", ""]);
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const refreshTournaments = () =>
    api.listTournaments().then(setTournaments).catch((e) => setError(e.message));

  useEffect(() => {
    api.listSports().then((s) => {
      setSports(s);
      if (s.length && !sportId) setSportId(s[0].id);
    }).catch((e) => setError(e.message));
    refreshTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateContestant = (idx, value) => {
    setContestants((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const addContestant = () => setContestants((prev) => [...prev, ""]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createTournament({
        sport_id: sportId,
        name,
        format,
        contestant_names: contestants.map((c) => c.trim()).filter(Boolean),
        points_win: Number(pointsWin),
        points_draw: Number(pointsDraw),
        points_loss: Number(pointsLoss),
      });
      setName("");
      setContestants(["", "", "", ""]);
      await refreshTournaments();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const contestantCount = contestants.filter((c) => c.trim()).length;
  const knockoutCountValid = KNOCKOUT_SIZES.includes(contestantCount);

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t("appTitle")}</h1>
        <LanguageSwitcher />
      </header>

      <form className="panel" onSubmit={handleSubmit}>
        <div className="field">
          <label>{t("tournamentName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field-row">
          <div className="field">
            <label>{t("sport")}</label>
            <select value={sportId} onChange={(e) => setSportId(e.target.value)}>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>{t("format")}</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="knockout">{t("formatKnockout")}</option>
              <option value="table">{t("formatTable")}</option>
              <option value="rating">{t("formatRating")}</option>
            </select>
          </div>
        </div>

        {format === "knockout" && <p className="hint">{t("knockoutSizeHint")}</p>}

        {format === "table" && (
          <fieldset>
            <legend>{t("format")}: {t("formatTable")}</legend>
            <div className="field-row">
              <div className="field">
                <label>{t("pointsWin")}</label>
                <input type="number" value={pointsWin} onChange={(e) => setPointsWin(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("pointsDraw")}</label>
                <input type="number" value={pointsDraw} onChange={(e) => setPointsDraw(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("pointsLoss")}</label>
                <input type="number" value={pointsLoss} onChange={(e) => setPointsLoss(e.target.value)} />
              </div>
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>{t("contestants")}</legend>
          <div className="contestants-grid">
            {contestants.map((c, idx) => (
              <input
                key={idx}
                value={c}
                placeholder={t("contestantNamePlaceholder")}
                onChange={(e) => updateContestant(idx, e.target.value)}
              />
            ))}
          </div>
          <button type="button" className="btn-secondary" onClick={addContestant}>
            {t("addContestant")}
          </button>
          {format === "knockout" && (
            <p className="hint">
              <span className={`count-badge${knockoutCountValid ? " valid" : ""}`}>
                {contestantCount} / {KNOCKOUT_SIZES.join("·")}
              </span>
            </p>
          )}
        </fieldset>

        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? t("creating") : t("create")}
        </button>
      </form>

      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}

      <section>
        <h2>{t("existingTournaments")}</h2>
        <ul className="tournament-list">
          {tournaments.map((tour) => (
            <li key={tour.id} className="tournament-row">
              <span className="name">{tour.name}</span>
              <span className={`badge ${FORMAT_BADGE_CLASS[tour.format.toLowerCase()] || ""}`}>{tour.format}</span>
              <span className="count">{tour.contestant_count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

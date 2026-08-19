import { useEffect, useState } from "react";
import { useI18n } from "./i18n";
import { api } from "./api";
import { SchemaScoreForm } from "./SchemaScoreForm";

function Standings({ tournamentDetail, t }) {
  const format = tournamentDetail.tournament.format.toLowerCase();

  if (format === "table") {
    const rows = tournamentDetail.standings;
    if (!rows.length) return null;
    return (
      <div className="panel">
        <h2>{t("standings")}</h2>
        <table className="scoreboard standings">
          <thead>
            <tr>
              <th>{t("rank")}</th>
              <th />
              <th>{t("played")}</th>
              <th>{t("won")}</th>
              <th>{t("drawn")}</th>
              <th>{t("lost")}</th>
              <th>{t("points")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.contestant_id}>
                <td>{idx + 1}</td>
                <td className="name-cell">{row.name}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td className="points-cell">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (format === "rating") {
    const ranked = [...tournamentDetail.contestants].sort((a, b) => b.rating - a.rating);
    return (
      <div className="panel">
        <h2>{t("standings")}</h2>
        <table className="scoreboard standings">
          <thead>
            <tr>
              <th>{t("rank")}</th>
              <th />
              <th>{t("rating")}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((c, idx) => (
              <tr key={c.id}>
                <td>{idx + 1}</td>
                <td className="name-cell">{c.name}</td>
                <td className="points-cell">{Math.round(c.rating)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

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

export default function App() {
  const { t } = useI18n();
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [tournamentId, setTournamentId] = useState("");
  const [tournamentDetail, setTournamentDetail] = useState(null);
  const [matchId, setMatchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [contestantAId, setContestantAId] = useState("");
  const [contestantBId, setContestantBId] = useState("");
  const [creatingMatch, setCreatingMatch] = useState(false);

  useEffect(() => {
    api.listTournaments().then(setTournaments).catch((e) => setError(e.message));
    api.listSports().then(setSports).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!tournamentId) {
      setTournamentDetail(null);
      return;
    }
    api.getTournament(tournamentId).then(setTournamentDetail).catch((e) => setError(e.message));
  }, [tournamentId]);

  const selectedMatch = tournamentDetail?.matches.find((m) => m.id === matchId);
  const sport = tournamentDetail
    ? sports.find((s) => s.id === tournamentDetail.tournament.sport_id)
    : null;
  const schema = sport ? sport.score_entry_schema : null;

  const contestantName = (id) =>
    tournamentDetail?.contestants.find((c) => c.id === id)?.name || id;

  const matchOutcomeLabel = (m) => {
    if (m.outcome === "Draw") return t("draw");
    return contestantName(m.outcome === "A" ? m.contestant_a_id : m.contestant_b_id);
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setError(null);
    setCreatingMatch(true);
    try {
      const { id } = await api.createMatch(tournamentId, contestantAId, contestantBId);
      const refreshed = await api.getTournament(tournamentId);
      setTournamentDetail(refreshed);
      setMatchId(id);
      setResult(null);
      setContestantAId("");
      setContestantBId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleSubmit = async (scoreBlob) => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.submitScore(matchId, scoreBlob);
      setResult(res);
      const refreshed = await api.getTournament(tournamentId);
      setTournamentDetail(refreshed);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t("appTitle")}</h1>
        <LanguageSwitcher />
      </header>

      <div className="panel">
        <div className="field">
          <label>{t("selectTournament")}</label>
          <select value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setMatchId(""); }}>
            <option value="" />
            {tournaments.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.name}
              </option>
            ))}
          </select>
        </div>

        {tournamentDetail && (
          <div className="field" style={{ marginTop: 18 }}>
            <label>{t("selectMatch")}</label>
            <select value={matchId} onChange={(e) => { setMatchId(e.target.value); setResult(null); }}>
              <option value="" />
              {tournamentDetail.matches.map((m) => (
                <option key={m.id} value={m.id} disabled={m.outcome !== "Pending"}>
                  {contestantName(m.contestant_a_id)} vs {contestantName(m.contestant_b_id)}
                  {m.outcome !== "Pending" ? ` (${matchOutcomeLabel(m)})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tournamentDetail && <Standings tournamentDetail={tournamentDetail} t={t} />}

      {tournamentDetail && tournamentDetail.tournament.format.toLowerCase() === "rating" && (
        <form className="panel" onSubmit={handleCreateMatch}>
          <h2>{t("newMatch")}</h2>
          <div className="field-row">
            <div className="field">
              <label>{t("playerA")}</label>
              <select value={contestantAId} onChange={(e) => setContestantAId(e.target.value)} required>
                <option value="" />
                {tournamentDetail.contestants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("playerB")}</label>
              <select value={contestantBId} onChange={(e) => setContestantBId(e.target.value)} required>
                <option value="" />
                {tournamentDetail.contestants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {contestantAId && contestantBId && contestantAId === contestantBId && (
            <p className="hint">{t("samePlayerError")}</p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={creatingMatch || !contestantAId || !contestantBId || contestantAId === contestantBId}
          >
            {creatingMatch ? t("creatingMatch") : t("createMatch")}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}

      {!selectedMatch && tournamentDetail && (
        <p className="state-card">{t("noMatchSelected")}</p>
      )}

      {selectedMatch && selectedMatch.outcome !== "Pending" && (
        <p className="state-card">{t("matchAlreadyDecided")}</p>
      )}

      {selectedMatch && selectedMatch.outcome === "Pending" && schema && (
        <SchemaScoreForm
          schema={schema}
          participantNames={{
            A: contestantName(selectedMatch.contestant_a_id),
            B: contestantName(selectedMatch.contestant_b_id),
          }}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {result && (
        <p className={`result-banner ${result.outcome === "draw" ? "draw" : "win"}`}>
          {result.outcome === "draw"
            ? t("outcomeDraw")
            : t("outcomeWin", {
                name:
                  result.outcome === "A"
                    ? contestantName(selectedMatch.contestant_a_id)
                    : contestantName(selectedMatch.contestant_b_id),
              })}
        </p>
      )}
    </div>
  );
}

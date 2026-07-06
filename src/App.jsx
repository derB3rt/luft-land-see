import { useEffect, useRef, useState } from "react";
import { db } from "./data.js";

const CARDS = [
  ["A1", "Luft", 1, "Unterstützung"], ["A2", "Luft", 2, "Luftlandung"], ["A3", "Luft", 3, "Manöver"], ["A4", "Luft", 4, "Flugfeld"], ["A5", "Luft", 5, "Eindämmung"], ["A6", "Luft", 6, "Schwere Bomber"],
  ["L1", "Land", 1, "Verstärkung"], ["L2", "Land", 2, "Hinterhalt"], ["L3", "Land", 3, "Manöver"], ["L4", "Land", 4, "Deckungsfeuer"], ["L5", "Land", 5, "Störmanöver"], ["L6", "Land", 6, "Schwere Panzer"],
  ["S1", "See", 1, "Transport"], ["S2", "See", 2, "Eskalation"], ["S3", "See", 3, "Manöver"], ["S4", "See", 4, "Umgruppierung"], ["S5", "See", 5, "Blockade"], ["S6", "See", 6, "Schlachtschiff"]
];
const card = id => CARDS.find(c => c[0] === id);
const theaters = ["Luft", "Land", "See"];
const colors = { Luft: "#4a7fa5", Land: "#5f7040", See: "#2e6f74" };

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
function code() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function newRound(g) {
  const deck = shuffle(CARDS.map(c => c[0]));
  g.round = { hands: [deck.slice(0, 6), deck.slice(6, 12)], deck: deck.slice(12), stacks: theaters.map(() => [[], []]), turn: g.first };
  g.status = "playing";
}
function scoreStack(stack) {
  return stack.reduce((sum, e) => sum + (e.down ? 2 : card(e.id)[2]), 0);
}
function finishRound(g) {
  const wins = [0, 0];
  const details = theaters.map((t, i) => {
    const a = scoreStack(g.round.stacks[i][0]);
    const b = scoreStack(g.round.stacks[i][1]);
    const w = a === b ? g.first : a > b ? 0 : 1;
    wins[w]++;
    return `${t}: ${a}:${b}`;
  });
  const winner = wins[0] >= 2 ? 0 : 1;
  g.players[winner].vp += 6;
  g.last = `${g.players[winner].name} gewinnt die Schlacht. ${details.join(" · ")}`;
  g.first = 1 - g.first;
  g.status = g.players[winner].vp >= 12 ? "finished" : "between";
  g.winner = g.status === "finished" ? winner : null;
}
async function readGame(gameCode) {
  if (!db) return null;
  const { data, error } = await db.from("games").select("state, version").eq("code", gameCode).maybeSingle();
  if (error || !data) return null;
  return { ...data.state, version: data.version };
}
async function saveGame(g) {
  if (!db) throw new Error("Supabase ist noch nicht konfiguriert.");
  const version = (g.version || 0) + 1;
  const state = { ...g, version };
  const { data, error } = await db.from("games").upsert({ code: g.code, state, version, updated_at: new Date().toISOString() }, { onConflict: "code" }).select("state, version").single();
  if (error) throw error;
  return { ...data.state, version: data.version };
}

export default function App() {
  const [name, setName] = useState("");
  const [join, setJoin] = useState("");
  const [game, setGame] = useState(null);
  const [me, setMe] = useState(null);
  const [selected, setSelected] = useState(null);
  const [down, setDown] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(game);
  ref.current = game;

  useEffect(() => {
    if (!game?.code || !db) return;
    const t = setInterval(async () => {
      const fresh = await readGame(game.code);
      if (fresh && fresh.version > (ref.current?.version || 0)) setGame(fresh);
    }, 2000);
    return () => clearInterval(t);
  }, [game?.code]);

  async function create() {
    if (!name.trim()) return setError("Bitte Namen eintragen.");
    const g = { code: code(), status: "waiting", players: [{ name: name.trim(), vp: 0 }, null], first: 0, round: null, last: "", winner: null, version: 0 };
    const saved = await saveGame(g);
    setGame(saved); setMe(0); setError("");
  }
  async function joinGame() {
    if (!name.trim()) return setError("Bitte Namen eintragen.");
    const g = await readGame(join.trim().toUpperCase());
    if (!g) return setError("Spiel nicht gefunden.");
    const existing = g.players.findIndex(p => p?.name?.toLowerCase() === name.trim().toLowerCase());
    if (existing >= 0) { setGame(g); setMe(existing); return; }
    if (g.players[1]) return setError("Spiel ist schon voll.");
    g.players[1] = { name: name.trim(), vp: 0 };
    g.first = Math.floor(Math.random() * 2);
    newRound(g);
    const saved = await saveGame(g);
    setGame(saved); setMe(1); setError("");
  }
  async function mutate(fn) {
    const latest = await readGame(game.code) || game;
    const g = structuredClone(latest);
    fn(g);
    const saved = await saveGame(g);
    setGame(saved); setSelected(null); setDown(false);
  }
  function play(ti) {
    if (!selected || game.round.turn !== me || game.status !== "playing") return;
    const c = card(selected);
    if (!down && c[1] !== theaters[ti]) return setError(`Diese Karte gehört nach ${c[1]}. Verdeckt geht überall.`);
    mutate(g => {
      const h = g.round.hands[me];
      h.splice(h.indexOf(selected), 1);
      g.round.stacks[ti][me].push({ id: selected, down });
      if (g.round.hands[0].length === 0 && g.round.hands[1].length === 0) finishRound(g);
      else g.round.turn = 1 - me;
    });
  }
  function next() { mutate(g => newRound(g)); }
  function reset() { mutate(g => { g.players.forEach(p => p.vp = 0); g.first = 1 - g.first; g.winner = null; newRound(g); }); }

  if (!db) return <Shell><h1>Luft, Land und See</h1><p>Die App ist hochgeladen, aber Supabase-Umgebungsvariablen fehlen noch im GitHub-Deployment.</p></Shell>;
  if (!game) return <Shell><h1>Luft, Land und See</h1><input placeholder="Dein Name" value={name} onChange={e => setName(e.target.value)} /><button onClick={create}>Neues Spiel</button><div className="row"><input placeholder="CODE" value={join} maxLength={4} onChange={e => setJoin(e.target.value.toUpperCase())} /><button onClick={joinGame}>Beitreten</button></div>{error && <b>{error}</b>}</Shell>;
  if (game.status === "waiting") return <Shell><h1>Code: {game.code}</h1><p>Gib diesen Code deinem Mitspieler. Die Seite aktualisiert sich automatisch.</p></Shell>;

  const opp = 1 - me;
  return <Shell>
    <header><b>{game.players[me].name}: {game.players[me].vp}</b><span>{game.code}</span><b>{game.players[opp]?.name}: {game.players[opp]?.vp}</b></header>
    {game.last && <p className="notice">{game.last}</p>}
    {game.status === "finished" ? <div className="notice"><h2>{game.players[game.winner].name} gewinnt den Krieg</h2><button onClick={reset}>Neuer Krieg</button></div> : game.status === "between" ? <button onClick={next}>Nächste Schlacht</button> : <p>{game.round.turn === me ? "Du bist dran." : `${game.players[game.round.turn].name} ist dran.`}</p>}
    <main>{theaters.map((t, ti) => <section key={t} onClick={() => play(ti)} style={{ borderColor: colors[t] }}><h2 style={{ color: colors[t] }}>{t}</h2><Side title={game.players[opp]?.name} stack={game.round.stacks[ti][opp]} /><Side title="Du" stack={game.round.stacks[ti][me]} /></section>)}</main>
    {game.status === "playing" && <><h3>Deine Hand</h3><div className="hand">{game.round.hands[me].map(id => { const c = card(id); return <button key={id} className={selected === id ? "sel" : ""} onClick={() => { setSelected(id); setDown(false); }}><b>{c[2]} {c[3]}</b><small>{c[1]}</small></button>; })}</div>{selected && <label><input type="checkbox" checked={down} onChange={e => setDown(e.target.checked)} /> verdeckt spielen</label>}</>}
  </Shell>;
}
function Side({ title, stack }) { return <div><small>{title} · {scoreStack(stack)}</small>{stack.map((e, i) => { const c = card(e.id); return <div className="card" key={i}>{e.down ? "? verdeckt" : `${c[2]} ${c[3]}`}</div>; })}</div>; }
function Shell({ children }) { return <div className="app">{children}</div>; }

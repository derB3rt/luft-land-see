import { useEffect, useRef, useState } from "react";
import { db } from "./data.js";

const SAVE_KEY = "als-state";
const LANG_KEY = "als-lang";
function getSaved() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function remember(game, me, name) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ game, me, name }));
}
function getLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "de" || saved === "en") return saved;
  return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

const UI = {
  de: { title: "Luft, Land und See", name: "Dein Name", newGame: "Neues Spiel", join: "Beitreten", needName: "Bitte Namen eintragen.", notFound: "Spiel nicht gefunden.", full: "Spiel ist schon voll.", waiting: "Gib diesen Code deinem Mitspieler. Die Seite aktualisiert sich automatisch.", yourTurn: "Du bist dran.", isTurn: "ist dran.", hand: "Deine Hand", you: "Du", down: "verdeckt spielen", downCard: "? verdeckt", next: "Nächste Schlacht", newWar: "Neuer Krieg", winsWar: "gewinnt den Krieg", winsBattle: "gewinnt die Schlacht.", wrong: "Diese Karte gehört nach", anywhere: "Verdeckt geht überall.", logout: "Abmelden", notConfigured: "Die App ist hochgeladen, aber Supabase ist noch nicht konfiguriert." },
  en: { title: "Air, Land & Sea", name: "Your name", newGame: "New Game", join: "Join", needName: "Please enter a name.", notFound: "Game not found.", full: "This game is already full.", waiting: "Share this code with your opponent. The page refreshes automatically.", yourTurn: "Your turn.", isTurn: "is up.", hand: "Your hand", you: "You", down: "play face down", downCard: "? face down", next: "Next battle", newWar: "New war", winsWar: "wins the war", winsBattle: "wins the battle.", wrong: "This card belongs to", anywhere: "Face down works anywhere.", logout: "Logout", notConfigured: "The app is uploaded, but Supabase is not configured yet." }
};
function theaterName(value, lang) {
  if (lang !== "en") return value;
  return value === "Luft" ? "Air" : value === "See" ? "Sea" : value;
}

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
function finishRound(g, lang) {
  const wins = [0, 0];
  const detail = theaters.map((theater, i) => {
    const a = scoreStack(g.round.stacks[i][0]);
    const b = scoreStack(g.round.stacks[i][1]);
    const w = a === b ? g.first : a > b ? 0 : 1;
    wins[w]++;
    return `${theaterName(theater, lang)}: ${a}:${b}`;
  });
  const winner = wins[0] >= 2 ? 0 : 1;
  g.players[winner].vp += 6;
  g.last = `${g.players[winner].name} ${UI[lang].winsBattle} ${detail.join(" · ")}`;
  g.first = 1 - g.first;
  g.status = g.players[winner].vp >= 12 ? "finished" : "between";
  g.winner = g.status === "finished" ? winner : null;
}
async function readGame(gameCode) {
  if (!db) return null;
  const key = "als:" + gameCode;
  const { data, error } = await db.from("kv").select("value").eq("key", key).maybeSingle();
  if (error || !data?.value) return null;
  try { return JSON.parse(data.value); } catch { return null; }
}
async function saveGame(g) {
  if (!db) throw new Error("Supabase ist noch nicht konfiguriert.");
  const state = { ...g, version: (g.version || 0) + 1 };
  const { data, error } = await db.from("kv").upsert({ key: "als:" + state.code, value: JSON.stringify(state), updated_at: new Date().toISOString() }, { onConflict: "key" }).select("value").single();
  if (error) throw error;
  return JSON.parse(data.value);
}

export default function App() {
  const [lang, setLangState] = useState(getLang);
  const t = UI[lang];
  const [saved] = useState(getSaved);
  const [name, setName] = useState(saved.name || "");
  const [join, setJoin] = useState("");
  const [game, setGame] = useState(saved.game || null);
  const [me, setMe] = useState(saved.me ?? null);
  const [selected, setSelected] = useState(null);
  const [down, setDown] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(game);
  ref.current = game;

  function setLang(next) { localStorage.setItem(LANG_KEY, next); setLangState(next); }

  useEffect(() => {
    if (!game?.code || !db) return;
    const timer = setInterval(async () => {
      const fresh = await readGame(game.code);
      if (fresh && fresh.version > (ref.current?.version || 0)) { setGame(fresh); remember(fresh, me, name); }
    }, 2000);
    return () => clearInterval(timer);
  }, [game?.code, me, name]);

  function logout() { localStorage.removeItem(SAVE_KEY); setGame(null); setMe(null); setSelected(null); setDown(false); setJoin(""); setError(""); }
  async function create() {
    if (!name.trim()) return setError(t.needName);
    const g = { code: code(), status: "waiting", players: [{ name: name.trim(), vp: 0 }, null], first: 0, round: null, last: "", winner: null, version: 0 };
    const savedGame = await saveGame(g);
    remember(savedGame, 0, name.trim());
    setGame(savedGame); setMe(0); setError("");
  }
  async function joinGame() {
    if (!name.trim()) return setError(t.needName);
    const g = await readGame(join.trim().toUpperCase());
    if (!g) return setError(t.notFound);
    const existing = g.players.findIndex(p => p?.name?.toLowerCase() === name.trim().toLowerCase());
    if (existing >= 0) { remember(g, existing, name.trim()); setGame(g); setMe(existing); return; }
    if (g.players[1]) return setError(t.full);
    g.players[1] = { name: name.trim(), vp: 0 };
    g.first = Math.floor(Math.random() * 2);
    newRound(g);
    const savedGame = await saveGame(g);
    remember(savedGame, 1, name.trim());
    setGame(savedGame); setMe(1); setError("");
  }
  async function mutate(fn) {
    const latest = await readGame(game.code) || game;
    const g = structuredClone(latest);
    fn(g);
    const savedGame = await saveGame(g);
    remember(savedGame, me, name);
    setGame(savedGame); setSelected(null); setDown(false);
  }
  function play(ti) {
    if (!selected || game.round.turn !== me || game.status !== "playing") return;
    const c = card(selected);
    if (!down && c[1] !== theaters[ti]) return setError(`${t.wrong} ${theaterName(c[1], lang)}. ${t.anywhere}`);
    mutate(g => {
      const h = g.round.hands[me];
      h.splice(h.indexOf(selected), 1);
      g.round.stacks[ti][me].push({ id: selected, down });
      if (g.round.hands[0].length === 0 && g.round.hands[1].length === 0) finishRound(g, lang);
      else g.round.turn = 1 - me;
    });
  }
  function next() { mutate(g => newRound(g)); }
  function reset() { mutate(g => { g.players.forEach(p => p.vp = 0); g.first = 1 - g.first; g.winner = null; newRound(g); }); }

  if (!db) return <Shell><Topbar lang={lang} setLang={setLang} /><h1>{t.title}</h1><p>{t.notConfigured}</p></Shell>;
  if (!game) return <Shell><Topbar lang={lang} setLang={setLang} /><h1>{t.title}</h1><input placeholder={t.name} value={name} onChange={e => setName(e.target.value)} /><button onClick={create}>{t.newGame}</button><div className="row"><input placeholder="CODE" value={join} maxLength={4} onChange={e => setJoin(e.target.value.toUpperCase())} /><button onClick={joinGame}>{t.join}</button></div>{error && <b>{error}</b>}</Shell>;
  if (game.status === "waiting") return <Shell><Topbar lang={lang} setLang={setLang} onLogout={logout} t={t} /><h1>Code: {game.code}</h1><p>{t.waiting}</p></Shell>;

  const opp = 1 - me;
  return <Shell>
    <Topbar lang={lang} setLang={setLang} onLogout={logout} t={t} />
    <header><b>{game.players[me].name}: {game.players[me].vp}</b><span>{game.code}</span><b>{game.players[opp]?.name}: {game.players[opp]?.vp}</b></header>
    {game.last && <p className="notice">{game.last}</p>}
    {game.status === "finished" ? <div className="notice"><h2>{game.players[game.winner].name} {t.winsWar}</h2><button onClick={reset}>{t.newWar}</button></div> : game.status === "between" ? <button onClick={next}>{t.next}</button> : <p className="turnline">{game.round.turn === me ? t.yourTurn : `${game.players[game.round.turn].name} ${t.isTurn}`}</p>}
    <main>{theaters.map((theater, ti) => <section key={theater} onClick={() => play(ti)} style={{ borderColor: colors[theater] }}><h2 style={{ color: colors[theater] }}>{theaterName(theater, lang)}</h2><Side title={game.players[opp]?.name} stack={game.round.stacks[ti][opp]} lang={lang} /><Side title={t.you} stack={game.round.stacks[ti][me]} lang={lang} /></section>)}</main>
    {game.status === "playing" && <><h3>{t.hand}</h3><div className="hand">{game.round.hands[me].map(id => { const c = card(id); return <button key={id} className={selected === id ? "sel" : ""} onClick={() => { setSelected(id); setDown(false); }}><b>{c[2]} {c[3]}</b><small>{theaterName(c[1], lang)}</small></button>; })}</div>{selected && <label><input type="checkbox" checked={down} onChange={e => setDown(e.target.checked)} /> {t.down}</label>}</>}
  </Shell>;
}
function Topbar({ lang, setLang, onLogout, t }) { return <div className="topbar"><div className="langswitch"><button className={lang === "de" ? "active" : ""} onClick={() => setLang("de")}>DE</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div>{onLogout && <button className="logout" onClick={onLogout}>{t.logout}</button>}</div>; }
function Side({ title, stack, lang }) { return <div><small>{title} · {scoreStack(stack)}</small>{stack.map((e, i) => { const c = card(e.id); return <div className="card" key={i}>{e.down ? UI[lang].downCard : `${c[2]} ${c[3]}`}</div>; })}</div>; }
function Shell({ children }) { return <div className="app">{children}</div>; }

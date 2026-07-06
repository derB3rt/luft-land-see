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
  de: {
    title: "Luft, Land und See", name: "Dein Name", newGame: "Neues Spiel", join: "Beitreten",
    needName: "Bitte Namen eintragen.", notFound: "Spiel nicht gefunden.", full: "Spiel ist schon voll.",
    waiting: "Gib diesen Code deinem Mitspieler. Die Seite aktualisiert sich automatisch.",
    yourTurn: "Du bist dran.", isTurn: "ist dran.", hand: "Deine Hand", you: "Du",
    down: "verdeckt spielen", downCard: "? verdeckt", next: "Nächste Schlacht", newWar: "Neuer Krieg",
    winsWar: "gewinnt den Krieg", winsBattle: "gewinnt die Schlacht.", wrong: "Diese Karte gehört nach",
    anywhere: "Verdeckt geht überall.", logout: "Abmelden", skip: "Effekt überspringen",
    chooseAdjacent: "Wähle einen benachbarten Schauplatz.",
    chooseFlip: "Wähle eine unbedeckte Karte zum Drehen.",
    chooseOwnFlip: "Wähle eine eigene unbedeckte Karte zum Drehen.",
    chooseMove: "Wähle eine eigene unbedeckte Karte zum Verschieben.",
    chooseMoveTarget: "Wähle den Ziel-Schauplatz.",
    chooseRedeploy: "Wähle eine eigene verdeckte Karte für Umgruppierung.",
    waitingEffect: "Warte auf die Effektwahl deines Mitspielers.",
    destroyed: "wurde zerstört.",
    notConfigured: "Die App ist hochgeladen, aber Supabase ist noch nicht konfiguriert."
  },
  en: {
    title: "Air, Land & Sea", name: "Your name", newGame: "New Game", join: "Join",
    needName: "Please enter a name.", notFound: "Game not found.", full: "This game is already full.",
    waiting: "Share this code with your opponent. The page refreshes automatically.",
    yourTurn: "Your turn.", isTurn: "is up.", hand: "Your hand", you: "You",
    down: "play face down", downCard: "? face down", next: "Next battle", newWar: "New war",
    winsWar: "wins the war", winsBattle: "wins the battle.", wrong: "This card belongs to",
    anywhere: "Face down works anywhere.", logout: "Logout", skip: "Skip effect",
    chooseAdjacent: "Choose an adjacent theater.",
    chooseFlip: "Choose an uncovered card to flip.",
    chooseOwnFlip: "Choose one of your uncovered cards to flip.",
    chooseMove: "Choose one of your uncovered cards to move.",
    chooseMoveTarget: "Choose the target theater.",
    chooseRedeploy: "Choose one of your face-down cards to redeploy.",
    waitingEffect: "Waiting for your opponent to resolve an effect.",
    destroyed: "was destroyed.",
    notConfigured: "The app is uploaded, but Supabase is not configured yet."
  }
};

function theaterName(value, lang) {
  if (lang !== "en") return value;
  return value === "Luft" ? "Air" : value === "See" ? "Sea" : value;
}

const CARD_NAMES = {
  A1: "Support", A2: "Air Drop", A3: "Maneuver", A4: "Aerodrome", A5: "Containment", A6: "Heavy Bombers",
  L1: "Reinforce", L2: "Ambush", L3: "Maneuver", L4: "Cover Fire", L5: "Disrupt", L6: "Heavy Tanks",
  S1: "Transport", S2: "Escalation", S3: "Maneuver", S4: "Redeploy", S5: "Blockade", S6: "Battleship"
};
function cardName(c, lang) { return lang === "en" ? (CARD_NAMES[c[0]] || c[3]) : c[3]; }

const DESC = {
  A1: { de: "+3 Stärke in benachbarten Schauplätzen.", en: "+3 strength in adjacent theaters." },
  A2: { de: "Nächste Karte darf in beliebigen Schauplatz.", en: "Next card may go to any theater." },
  A3: { de: "Drehe eine unbedeckte Karte nebenan um.", en: "Flip an uncovered card next door." },
  A4: { de: "Karten bis Stärke 3 dürfen überall hin.", en: "Cards up to strength 3 may go anywhere." },
  A5: { de: "Verdeckte Karten werden sofort abgeworfen.", en: "Face-down cards are discarded." },
  A6: { de: "Keine Fähigkeit. Pure Stärke.", en: "No ability. Pure strength." },
  L1: { de: "Deckkarte verdeckt nebenan spielen.", en: "Play top deck card face down next door." },
  L2: { de: "Drehe eine unbedeckte Karte irgendwo um.", en: "Flip any uncovered card." },
  L3: { de: "Drehe eine unbedeckte Karte nebenan um.", en: "Flip an uncovered card next door." },
  L4: { de: "Eigene Karten darunter zählen Stärke 4.", en: "Your cards below count as strength 4." },
  L5: { de: "Beide drehen eigene Karte um. Gegner zuerst.", en: "Both flip own card. Opponent first." },
  L6: { de: "Keine Fähigkeit. Pure Stärke.", en: "No ability. Pure strength." },
  S1: { de: "Verschiebe eine eigene unbedeckte Karte.", en: "Move one of your uncovered cards." },
  S2: { de: "Deine verdeckten Karten zählen Stärke 4.", en: "Your face-down cards count as strength 4." },
  S3: { de: "Drehe eine unbedeckte Karte nebenan um.", en: "Flip an uncovered card next door." },
  S4: { de: "Nimm eigene verdeckte Karte zurück und spiele erneut.", en: "Return own face-down card, then play again." },
  S5: { de: "Blockiert volle benachbarte Schauplätze.", en: "Blocks crowded adjacent theaters." },
  S6: { de: "Keine Fähigkeit. Pure Stärke.", en: "No ability. Pure strength." }
};
function desc(id, lang) { return DESC[id]?.[lang] || ""; }

const CARDS = [
  ["A1", "Luft", 1, "Unterstützung"], ["A2", "Luft", 2, "Luftlandung"], ["A3", "Luft", 3, "Manöver"], ["A4", "Luft", 4, "Flugfeld"], ["A5", "Luft", 5, "Eindämmung"], ["A6", "Luft", 6, "Schwere Bomber"],
  ["L1", "Land", 1, "Verstärkung"], ["L2", "Land", 2, "Hinterhalt"], ["L3", "Land", 3, "Manöver"], ["L4", "Land", 4, "Deckungsfeuer"], ["L5", "Land", 5, "Störmanöver"], ["L6", "Land", 6, "Schwere Panzer"],
  ["S1", "See", 1, "Transport"], ["S2", "See", 2, "Eskalation"], ["S3", "See", 3, "Manöver"], ["S4", "See", 4, "Umgruppierung"], ["S5", "See", 5, "Blockade"], ["S6", "See", 6, "Schlachtschiff"]
];
const card = id => CARDS.find(c => c[0] === id);
const theaters = ["Luft", "Land", "See"];
const colors = { Luft: "#4a7fa5", Land: "#5f7040", See: "#2e6f74" };

function adjacent(ti) { return [ti - 1, ti + 1].filter(i => i >= 0 && i < theaters.length); }
function getStack(g, ti, player) { return g?.round?.stacks?.[ti]?.[player] || []; }
function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
function code() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function newRound(g) {
  const deck = shuffle(CARDS.map(c => c[0]));
  g.round = { hands: [deck.slice(0, 6), deck.slice(6, 12)], deck: deck.slice(12), stacks: theaters.map(() => [[], []]), turn: g.first, freeNext: [false, false], extraPlay: null, pending: null };
  g.status = "playing";
}

function faceUpIn(g, player, id) { return g.round?.stacks?.some(theater => theater[player].some(e => e.id === id && !e.down)); }
function hasCoverAbove(stack, idx) { return stack.slice(idx + 1).some(e => e.id === "L4" && !e.down); }
function cardStrength(g, ti, player, idx) {
  const stack = getStack(g, ti, player);
  const entry = stack[idx];
  const c = entry ? card(entry.id) : null;
  if (!entry || !c) return 0;
  if (hasCoverAbove(stack, idx)) return 4;
  if (entry.down) return faceUpIn(g, player, "S2") ? 4 : 2;
  return c[2];
}
function scoreTheater(g, ti, player) {
  const stack = getStack(g, ti, player);
  let total = stack.reduce((sum, _e, idx) => sum + cardStrength(g, ti, player, idx), 0);
  for (const ai of adjacent(ti)) if (getStack(g, ai, player).some(e => e.id === "A1" && !e.down)) total += 3;
  return total;
}
function totalCardsInTheater(g, ti) { return getStack(g, ti, 0).length + getStack(g, ti, 1).length; }
function isTop(g, ti, player, idx) { return idx === getStack(g, ti, player).length - 1; }
function topTargets(g, player, where = "any", origin = null) {
  const allowed = where === "adjacent" ? adjacent(origin) : [0, 1, 2];
  const out = [];
  for (const ti of allowed) for (const pi of [0, 1]) { const stack = getStack(g, ti, pi); if (stack.length) out.push({ ti, pi, idx: stack.length - 1 }); }
  return out;
}
function ownTopTargets(g, player, onlyFaceUp = false) {
  const out = [];
  for (let ti = 0; ti < 3; ti++) { const stack = getStack(g, ti, player); if (!stack.length) continue; const idx = stack.length - 1; if (!onlyFaceUp || !stack[idx].down) out.push({ ti, pi: player, idx }); }
  return out;
}
function ownDownTargets(g, player) {
  const out = [];
  for (let ti = 0; ti < 3; ti++) getStack(g, ti, player).forEach((e, idx) => { if (e.down) out.push({ ti, pi: player, idx }); });
  return out;
}
function canPlace(g, player, c, ti, down) {
  if (down) return true;
  if (c[1] === theaters[ti]) return true;
  if (g.round.freeNext?.[player]) return true;
  return c[2] <= 3 && faceUpIn(g, player, "A4");
}
function destroyedByOngoing(g, ti, down) {
  for (const ai of adjacent(ti)) {
    const cards = [...getStack(g, ai, 0), ...getStack(g, ai, 1)];
    if (down && cards.some(e => e.id === "A5" && !e.down)) return true;
    if (totalCardsInTheater(g, ti) >= 3 && cards.some(e => e.id === "S5" && !e.down)) return true;
  }
  return false;
}
function nextTurnOrFinish(g, player, lang = "de") {
  g.round.pending = null;
  if (g.round.hands[0].length === 0 && g.round.hands[1].length === 0) { finishRound(g, lang); return; }
  if (g.round.extraPlay === player) g.round.extraPlay = null;
  g.round.turn = 1 - player;
}
function finishRound(g, lang = "de") {
  const wins = [0, 0];
  const detail = theaters.map((theater, i) => {
    const a = scoreTheater(g, i, 0);
    const b = scoreTheater(g, i, 1);
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
function applyEffect(g, player, id, ti, lang = "de") {
  if (id === "A2") g.round.freeNext[player] = true;
  if (id === "L1" && g.round.deck.length && adjacent(ti).length) { g.round.pending = { type: "reinforce", player, origin: ti }; return; }
  if ((id === "A3" || id === "L3" || id === "S3") && topTargets(g, player, "adjacent", ti).length) { g.round.pending = { type: "flipAdjacent", player, origin: ti }; return; }
  if (id === "L2" && topTargets(g, player).length) { g.round.pending = { type: "flipAny", player }; return; }
  if (id === "L5") {
    const opp = 1 - player;
    if (ownTopTargets(g, opp).length) g.round.pending = { type: "disrupt", player: opp, origin: player };
    else if (ownTopTargets(g, player).length) g.round.pending = { type: "disrupt", player, origin: player, last: true };
    else nextTurnOrFinish(g, player, lang);
    return;
  }
  if (id === "S1" && ownTopTargets(g, player, true).length) { g.round.pending = { type: "moveSource", player }; return; }
  if (id === "S4" && ownDownTargets(g, player).length) { g.round.pending = { type: "redeploy", player }; return; }
  nextTurnOrFinish(g, player, lang);
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

  function pendingText(p) {
    if (!p) return "";
    if (p.player !== me) return t.waitingEffect;
    if (p.type === "reinforce") return t.chooseAdjacent;
    if (p.type === "flipAny" || p.type === "flipAdjacent") return t.chooseFlip;
    if (p.type === "disrupt") return t.chooseOwnFlip;
    if (p.type === "moveSource") return t.chooseMove;
    if (p.type === "moveDest") return t.chooseMoveTarget;
    if (p.type === "redeploy") return t.chooseRedeploy;
    return "";
  }

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
    if (!g.round.freeNext) g.round.freeNext = [false, false];
    fn(g);
    const savedGame = await saveGame(g);
    remember(savedGame, me, name);
    setGame(savedGame); setSelected(null); setDown(false);
  }

  function play(ti) {
    if (!selected || game.round.pending || game.round.turn !== me || game.status !== "playing") return;
    const c = card(selected);
    if (!canPlace(game, me, c, ti, down)) return setError(`${t.wrong} ${theaterName(c[1], lang)}. ${t.anywhere}`);
    mutate(g => {
      const h = g.round.hands[me];
      h.splice(h.indexOf(selected), 1);
      if (g.round.freeNext) g.round.freeNext[me] = false;
      if (destroyedByOngoing(g, ti, down)) { g.last = `${cardName(c, lang)} ${t.destroyed}`; nextTurnOrFinish(g, me, lang); return; }
      g.round.stacks[ti][me].push({ id: selected, down });
      if (down) nextTurnOrFinish(g, me, lang);
      else applyEffect(g, me, selected, ti, lang);
    });
  }

  function onTheater(ti) {
    const p = game.round.pending;
    if (!p || p.player !== me) return play(ti);
    mutate(g => {
      const q = g.round.pending;
      if (!q || q.player !== me) return;
      if (q.type === "reinforce" && adjacent(q.origin).includes(ti) && g.round.deck.length) {
        const id = g.round.deck.shift();
        if (destroyedByOngoing(g, ti, true)) g.last = `${UI[lang].downCard} ${t.destroyed}`;
        else g.round.stacks[ti][me].push({ id, down: true });
        nextTurnOrFinish(g, me, lang);
      }
      if (q.type === "moveDest" && ti !== q.source.ti) {
        const entry = g.round.stacks[q.source.ti][me].splice(q.source.idx, 1)[0];
        g.round.stacks[ti][me].push(entry);
        nextTurnOrFinish(g, me, lang);
      }
    });
  }

  function onStackCard(e, ti, pi, idx) {
    e.stopPropagation();
    const p = game.round.pending;
    if (!p || p.player !== me) return;
    mutate(g => {
      const q = g.round.pending;
      const stack = getStack(g, ti, pi);
      if (!q || q.player !== me || !stack[idx]) return;
      if ((q.type === "flipAny" || q.type === "flipAdjacent") && isTop(g, ti, pi, idx) && (q.type === "flipAny" || adjacent(q.origin).includes(ti))) {
        stack[idx].down = !stack[idx].down;
        nextTurnOrFinish(g, me, lang);
      } else if (q.type === "disrupt" && pi === me && isTop(g, ti, pi, idx)) {
        stack[idx].down = !stack[idx].down;
        const origin = q.origin;
        if (me !== origin && ownTopTargets(g, origin).length) g.round.pending = { type: "disrupt", player: origin, origin, last: true };
        else nextTurnOrFinish(g, origin, lang);
      } else if (q.type === "moveSource" && pi === me && isTop(g, ti, pi, idx) && !stack[idx].down) {
        g.round.pending = { type: "moveDest", player: me, source: { ti, idx } };
      } else if (q.type === "redeploy" && pi === me && stack[idx].down) {
        const entry = stack.splice(idx, 1)[0];
        g.round.hands[me].push(entry.id);
        g.round.pending = null;
        g.round.extraPlay = me;
        g.round.turn = me;
      }
    });
  }

  function skipEffect() {
    const p = game.round.pending;
    if (!p || p.player !== me) return;
    const donePlayer = p.type === "disrupt" ? p.origin : me;
    mutate(g => nextTurnOrFinish(g, donePlayer, lang));
  }

  function next() { mutate(g => newRound(g)); }
  function reset() { mutate(g => { g.players.forEach(p => p.vp = 0); g.first = 1 - g.first; g.winner = null; newRound(g); }); }

  if (!db) return <Shell><Topbar lang={lang} setLang={setLang} /><h1>{t.title}</h1><p>{t.notConfigured}</p></Shell>;
  if (!game) return <Shell><Topbar lang={lang} setLang={setLang} /><h1>{t.title}</h1><input placeholder={t.name} value={name} onChange={e => setName(e.target.value)} /><button onClick={create}>{t.newGame}</button><div className="row"><input placeholder="CODE" value={join} maxLength={4} onChange={e => setJoin(e.target.value.toUpperCase())} /><button onClick={joinGame}>{t.join}</button></div>{error && <b>{error}</b>}</Shell>;
  if (game.status === "waiting") return <Shell><Topbar lang={lang} setLang={setLang} onLogout={logout} t={t} /><h1>Code: {game.code}</h1><p>{t.waiting}</p></Shell>;

  const opp = 1 - me;
  const pending = game.round?.pending;

  return <Shell>
    <Topbar lang={lang} setLang={setLang} onLogout={logout} t={t} />
    <header><b>{game.players[me].name}: {game.players[me].vp}</b><span>{game.code}</span><b>{game.players[opp]?.name}: {game.players[opp]?.vp}</b></header>
    {game.last && <p className="notice">{game.last}</p>}
    {pending && <div className="notice effect"><b>{pendingText(pending)}</b>{pending.player === me && <button onClick={skipEffect}>{t.skip}</button>}</div>}
    {game.status === "finished" ? <div className="notice"><h2>{game.players[game.winner].name} {t.winsWar}</h2><button onClick={reset}>{t.newWar}</button></div> : game.status === "between" ? <button onClick={next}>{t.next}</button> : !pending && <p className="turnline">{game.round.turn === me ? t.yourTurn : `${game.players[game.round.turn].name} ${t.isTurn}`}</p>}
    <main>{theaters.map((theater, ti) => <section key={theater} onClick={() => onTheater(ti)} style={{ borderColor: colors[theater] }}><h2 style={{ color: colors[theater] }}>{theaterName(theater, lang)}</h2><Side title={game.players[opp]?.name} stack={game.round.stacks[ti][opp]} ti={ti} pi={opp} onCard={onStackCard} lang={lang} g={game} /><Side title={t.you} stack={game.round.stacks[ti][me]} ti={ti} pi={me} onCard={onStackCard} lang={lang} g={game} /></section>)}</main>
    {game.status === "playing" && <><h3>{t.hand}</h3><div className="hand">{game.round.hands[me].map(id => { const c = card(id); return <button key={id} className={selected === id ? "sel" : ""} onClick={() => { setSelected(id); setDown(false); }}><b>{c[2]} {cardName(c, lang)}</b><small>{theaterName(c[1], lang)}</small><em>{desc(id, lang)}</em></button>; })}</div>{selected && <label><input type="checkbox" checked={down} onChange={e => setDown(e.target.checked)} /> {t.down}</label>}</>}
    {error && <b>{error}</b>}
  </Shell>;
}

function Topbar({ lang, setLang, onLogout, t }) {
  return <div className="topbar"><div className="langswitch"><button className={lang === "de" ? "active" : ""} onClick={() => setLang("de")}>DE</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div>{onLogout && <button className="logout" onClick={onLogout}>{t.logout}</button>}</div>;
}
function Side({ title, stack, ti, pi, onCard, lang, g }) {
  return <div><small>{title} · {scoreTheater(g, ti, pi)}</small>{stack.map((e, i) => { const c = card(e.id); return <div className="card" onClick={ev => onCard(ev, ti, pi, i)} key={i}>{e.down ? UI[lang].downCard : `${c[2]} ${cardName(c, lang)}`}</div>; })}</div>;
}
function Shell({ children }) { return <div className="app">{children}</div>; }

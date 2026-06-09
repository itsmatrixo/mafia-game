import { supabase } from "@/integrations/supabase/client";
import type { GameState, NightActionKey, Player } from "./types";
import {
  aliveOf,
  buildRoleDeck,
  checkWinner,
  resolveNight,
  shuffle,
} from "./game";
import type { OptionalRoles } from "./game";

export const CLIENT_KEY = "blood-moon-client-id";
export const LAST_ROOM_KEY = "blood-moon-last-room";

export function getClientId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  for (let i = 0; i < 6; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createRoom(
  names: string[],
  optional: OptionalRoles,
): Promise<{ code: string; state: GameState }> {
  const hostId = getClientId();
  const players: Player[] = names.map((name, i) => ({
    id: crypto.randomUUID(),
    name: name.trim(),
    role: "villager",
    alive: true,
    revealed: false,
    order: i,
  }));

  // try up to 5 codes
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const state: GameState = {
      phase: "lobby",
      players,
      dayNumber: 1,
      night: {},
      lastDeaths: [],
      optional,
      hostId,
      votes: {},
      started: false,
    };
    const { error } = await supabase.from("rooms").insert({
      code,
      phase: "lobby",
      state: JSON.parse(JSON.stringify(state)),
    });
    if (!error) {
      localStorage.setItem(LAST_ROOM_KEY, code);
      return { code, state };
    }
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  }
  throw new Error("Could not allocate a unique room code");
}

export async function fetchRoom(
  code: string,
): Promise<{ id: string; state: GameState } | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id,state")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, state: data.state as unknown as GameState };
}

export async function saveState(
  code: string,
  state: GameState,
  expectPhase?: string,
): Promise<boolean> {
  let q = supabase
    .from("rooms")
    .update({
      phase: state.phase,
      state: JSON.parse(JSON.stringify(state)),
      updated_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    })
    .eq("code", code.toUpperCase());
  if (expectPhase) q = q.eq("phase", expectPhase);
  const { error } = await q;
  if (error) {
    console.error("saveState error", error);
    return false;
  }
  return true;
}

// === Online engine helpers (pure) ===

export function claimSlot(
  state: GameState,
  playerId: string,
  clientId: string,
): GameState {
  const players = state.players.map((p) => {
    if (p.id === playerId) return { ...p, claimedBy: clientId };
    // release any previously held slot by same client
    if (p.claimedBy === clientId) return { ...p, claimedBy: undefined };
    return p;
  });
  return { ...state, players };
}

export function releaseSlot(state: GameState, clientId: string): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.claimedBy === clientId ? { ...p, claimedBy: undefined } : p,
    ),
  };
}

export function startGame(state: GameState): GameState {
  const deck = buildRoleDeck(state.players.length, state.optional);
  const shuffled = shuffle(deck);
  return {
    ...state,
    players: state.players.map((p, i) => ({
      ...p,
      role: shuffled[i],
      revealed: false,
    })),
    phase: "reveal",
    started: true,
    night: {},
    votes: {},
    lastDeaths: [],
    lastEliminated: null,
    detectiveResult: undefined,
    winner: undefined,
    dayNumber: 1,
  };
}

export function markRevealed(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, revealed: true } : p,
    ),
  };
}

export function allRevealed(state: GameState): boolean {
  return state.players.every((p) => p.revealed);
}

export function requiredNightActions(state: GameState): NightActionKey[] {
  const req: NightActionKey[] = [];
  const aliveRoles = new Set(aliveOf(state).map((p) => p.role));
  if (aliveRoles.has("mafia") || aliveRoles.has("barman")) req.push("mafiaKill");
  if (state.optional.barman && aliveRoles.has("barman")) req.push("barmanBlock");
  if (aliveRoles.has("detective")) req.push("detectiveCheck");
  if (aliveRoles.has("doctor")) req.push("doctorSave");
  if (state.optional.guard && aliveRoles.has("guard")) req.push("guardProtect");
  if (state.optional.vigilante && aliveRoles.has("vigilante"))
    req.push("vigilanteKill");
  return req;
}

export function submitNightAction(
  state: GameState,
  key: NightActionKey,
  targetId: string | undefined,
): GameState {
  const submitted = new Set(state.night.submitted ?? []);
  submitted.add(key);
  return {
    ...state,
    night: {
      ...state.night,
      [key]: targetId,
      submitted: [...submitted],
    },
  };
}

export function allNightSubmitted(state: GameState): boolean {
  const req = requiredNightActions(state);
  const submitted = new Set(state.night.submitted ?? []);
  return req.every((k) => submitted.has(k));
}

export function resolveAndAdvance(state: GameState): GameState {
  const { deaths, detectiveResult, players } = resolveNight(state);
  const detective = state.players.find((p) => p.role === "detective" && p.alive);
  const result = detectiveResult
    ? { ...detectiveResult, forPlayerId: detective?.id }
    : undefined;
  const next: GameState = {
    ...state,
    players,
    lastDeaths: deaths,
    detectiveResult: result,
    phase: "day-reveal",
  };
  const winner = checkWinner(next);
  if (winner) return { ...next, winner, phase: "gameover" };
  return next;
}

export function castVote(
  state: GameState,
  voterId: string,
  targetId: string,
): GameState {
  return {
    ...state,
    votes: { ...(state.votes ?? {}), [voterId]: targetId },
  };
}

export function allVoted(state: GameState): boolean {
  const aliveCount = aliveOf(state).length;
  const voted = Object.keys(state.votes ?? {}).length;
  return voted >= aliveCount;
}

export function tallyVotes(state: GameState): GameState {
  const tally = new Map<string, number>();
  for (const [, target] of Object.entries(state.votes ?? {})) {
    if (target === "abstain") continue;
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  let topId: string | undefined;
  let topCount = 0;
  let tied = false;
  for (const [id, c] of tally) {
    if (c > topCount) {
      topCount = c;
      topId = id;
      tied = false;
    } else if (c === topCount) {
      tied = true;
    }
  }
  let players = state.players;
  let lastEliminated: GameState["lastEliminated"] = null;
  if (topId && !tied) {
    const p = state.players.find((x) => x.id === topId);
    if (p) {
      players = state.players.map((x) =>
        x.id === topId ? { ...x, alive: false } : x,
      );
      lastEliminated = { id: p.id, role: p.role };
    }
  }
  const next: GameState = {
    ...state,
    players,
    lastEliminated,
    phase: "day-result",
  };
  const winner = checkWinner(next);
  if (winner) return { ...next, winner, phase: "gameover" };
  return next;
}

export function toNextNight(state: GameState): GameState {
  return {
    ...state,
    dayNumber: state.dayNumber + 1,
    phase: "night",
    night: {},
    votes: {},
    lastDeaths: [],
    lastEliminated: null,
    detectiveResult: undefined,
  };
}

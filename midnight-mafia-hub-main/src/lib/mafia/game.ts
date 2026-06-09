import type { GameState, Player, RoleId } from "./types";

export function mafiaCountFor(n: number): number {
  if (n <= 7) return 2;
  if (n <= 10) return 3;
  if (n <= 13) return 4;
  if (n <= 16) return 5;
  if (n <= 20) return 6;
  if (n <= 25) return 7;
  return 8;
}

export interface OptionalRoles {
  barman: boolean;
  vigilante: boolean;
  guard: boolean;
}

export function buildRoleDeck(
  playerCount: number,
  optional: OptionalRoles,
): RoleId[] {
  const totalMafia = mafiaCountFor(playerCount);
  const deck: RoleId[] = [];

  // Mafia faction: 1 barman counts as a mafia member when enabled and we have 20+ players
  const useBarman = optional.barman && playerCount >= 14 && totalMafia >= 3;
  const regularMafia = useBarman ? totalMafia - 1 : totalMafia;
  for (let i = 0; i < regularMafia; i++) deck.push("mafia");
  if (useBarman) deck.push("barman");

  // Town specials
  deck.push("detective");
  deck.push("doctor");
  if (optional.guard && playerCount >= 14) deck.push("guard");
  if (optional.vigilante && playerCount >= 14) deck.push("vigilante");

  // Rest are villagers
  while (deck.length < playerCount) deck.push("villager");

  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createPlayers(names: string[], deck: RoleId[]): Player[] {
  return names.map((name, i) => ({
    id: crypto.randomUUID(),
    name: name.trim(),
    role: deck[i],
    alive: true,
    revealed: false,
    order: i,
  }));
}

export function aliveOf(state: GameState) {
  return state.players.filter((p) => p.alive);
}
export function aliveMafia(state: GameState) {
  return aliveOf(state).filter(
    (p) => p.role === "mafia" || p.role === "barman",
  );
}
export function aliveTown(state: GameState) {
  return aliveOf(state).filter(
    (p) => p.role !== "mafia" && p.role !== "barman",
  );
}

export function checkWinner(state: GameState): GameState["winner"] {
  const mafia = aliveMafia(state).length;
  const town = aliveTown(state).length;
  if (mafia === 0) return "town";
  if (mafia >= town) return "mafia";
  return undefined;
}

// Resolve night actions, returning deaths + detective result.
export function resolveNight(state: GameState): {
  deaths: { id: string; role: RoleId }[];
  detectiveResult?: GameState["detectiveResult"];
  players: Player[];
} {
  const {
    mafiaKill,
    barmanBlock,
    detectiveCheck,
    doctorSave,
    guardProtect,
    vigilanteKill,
  } = state.night;

  // Barman blocks one player's ability for the night.
  const blocked = (targetId?: string) =>
    barmanBlock !== undefined && barmanBlock === targetId;

  // Find role-holders
  const find = (role: RoleId) =>
    state.players.find((p) => p.role === role && p.alive);
  const doctor = find("doctor");
  const detective = find("detective");
  const guard = find("guard");
  const vigilante = find("vigilante");

  const effectiveDoctorSave = blocked(doctor?.id) ? undefined : doctorSave;
  const effectiveGuardProtect = blocked(guard?.id) ? undefined : guardProtect;
  const effectiveVigilanteKill = blocked(vigilante?.id)
    ? undefined
    : vigilanteKill;
  const detectiveBlocked = blocked(detective?.id);

  const deathsSet = new Set<string>();
  const considerKill = (targetId?: string) => {
    if (!targetId) return;
    if (targetId === effectiveDoctorSave) return;
    if (targetId === effectiveGuardProtect) return;
    deathsSet.add(targetId);
  };
  considerKill(mafiaKill);
  considerKill(effectiveVigilanteKill);

  const deaths = [...deathsSet]
    .map((id) => {
      const p = state.players.find((x) => x.id === id);
      return p ? { id: p.id, role: p.role } : null;
    })
    .filter((x): x is { id: string; role: RoleId } => !!x);

  const players = state.players.map((p) =>
    deathsSet.has(p.id) ? { ...p, alive: false } : p,
  );

  let detectiveResult: GameState["detectiveResult"];
  if (detectiveCheck) {
    if (detectiveBlocked) {
      detectiveResult = {
        targetId: detectiveCheck,
        isMafia: false,
        blocked: true,
      };
    } else {
      const target = state.players.find((p) => p.id === detectiveCheck);
      detectiveResult = {
        targetId: detectiveCheck,
        isMafia: target?.role === "mafia" || target?.role === "barman",
      };
    }
  }

  return { deaths, detectiveResult, players };
}

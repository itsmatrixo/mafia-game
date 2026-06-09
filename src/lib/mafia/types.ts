export type RoleId =
  | "mafia"
  | "barman"
  | "detective"
  | "doctor"
  | "guard"
  | "vigilante"
  | "villager";

export type Faction = "mafia" | "town";

export interface RoleDef {
  id: RoleId;
  name: string;
  faction: Faction;
  tagline: string;
  description: string;
  ability: string;
  emoji: string;
}

export interface Player {
  id: string;
  name: string;
  role: RoleId;
  alive: boolean;
  revealed: boolean;
  // Online additions:
  claimedBy?: string; // clientId of the device that claimed this slot
  order: number;
}

export type Phase =
  | "lobby"
  | "reveal"
  | "night"
  | "day-reveal"
  | "day-vote"
  | "day-result"
  | "gameover"
  // Offline-only legacy phases (kept so old offline state still loads):
  | "setup"
  | "night-intro"
  | "night-mafia"
  | "night-barman"
  | "night-detective"
  | "night-doctor"
  | "night-guard"
  | "night-vigilante"
  | "night-resolve";

export type NightActionKey =
  | "mafiaKill"
  | "barmanBlock"
  | "detectiveCheck"
  | "doctorSave"
  | "guardProtect"
  | "vigilanteKill";

export interface NightActions {
  mafiaKill?: string;
  barmanBlock?: string;
  detectiveCheck?: string;
  doctorSave?: string;
  guardProtect?: string;
  vigilanteKill?: string;
  // Keys that have been locked-in by their owner (or skipped):
  submitted?: NightActionKey[];
}

export interface DetectiveResult {
  targetId: string;
  isMafia: boolean;
  blocked?: boolean;
  forPlayerId?: string; // detective's player id
}

export interface GameState {
  phase: Phase;
  players: Player[];
  dayNumber: number;
  night: NightActions;
  lastDeaths: { id: string; role: RoleId }[];
  lastEliminated?: { id: string; role: RoleId } | null;
  detectiveResult?: DetectiveResult;
  optional: { barman: boolean; vigilante: boolean; guard: boolean };
  winner?: Faction;
  // Online additions:
  hostId?: string; // clientId of host
  votes?: Record<string, string>; // voterPlayerId -> targetPlayerId | "abstain"
  started?: boolean;
}

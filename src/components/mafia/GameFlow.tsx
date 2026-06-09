import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Skull as SkullIcon,
  Search,
  HeartPulse,
  Shield,
  Crosshair,
  GlassWater,
  Vote,
  Trophy,
} from "lucide-react";
import type { GameState, Phase, Player, RoleId } from "@/lib/mafia/types";
import {
  PhaseBanner,
  PlayerPickGrid,
  DeathList,
  StatusBar,
} from "./Shared";
import { ROLES } from "@/lib/mafia/roles";
import { checkWinner, resolveNight } from "@/lib/mafia/game";

interface Props {
  state: GameState;
  setState: (s: GameState) => void;
  onRestart: () => void;
}

const NIGHT_ORDER: Phase[] = [
  "night-mafia",
  "night-barman",
  "night-detective",
  "night-doctor",
  "night-guard",
  "night-vigilante",
];

function roleAlive(state: GameState, role: RoleId) {
  return state.players.some((p) => p.alive && p.role === role);
}

function phaseAllowed(state: GameState, ph: Phase): boolean {
  switch (ph) {
    case "night-mafia":
      return state.players.some(
        (p) => p.alive && (p.role === "mafia" || p.role === "barman"),
      );
    case "night-barman":
      return state.optional.barman && roleAlive(state, "barman");
    case "night-detective":
      return roleAlive(state, "detective");
    case "night-doctor":
      return roleAlive(state, "doctor");
    case "night-guard":
      return state.optional.guard && roleAlive(state, "guard");
    case "night-vigilante":
      return state.optional.vigilante && roleAlive(state, "vigilante");
    default:
      return true;
  }
}

function nextNightPhase(state: GameState, current: Phase | null): Phase | null {
  const startIdx = current ? NIGHT_ORDER.indexOf(current) : -1;
  for (let i = startIdx + 1; i < NIGHT_ORDER.length; i++) {
    if (phaseAllowed(state, NIGHT_ORDER[i])) return NIGHT_ORDER[i];
  }
  return null;
}

export function GameFlow({ state, setState, onRestart }: Props) {
  const update = (patch: Partial<GameState>) =>
    setState({ ...state, ...patch });

  const advanceFromNight = (current: Phase, patch: Partial<GameState> = {}) => {
    const updated: GameState = { ...state, ...patch };
    const next = nextNightPhase(updated, current);
    if (next) {
      setState({ ...updated, phase: next });
    } else {
      // Resolve night
      const { deaths, detectiveResult, players } = resolveNight(updated);
      setState({
        ...updated,
        players,
        lastDeaths: deaths,
        detectiveResult,
        phase: "day-reveal",
      });
    }
  };

  // ------------- NIGHT INTRO -------------
  if (state.phase === "night-intro") {
    return (
      <Scene state={state}>
        <PhaseBanner
          icon="🌑"
          title={`Night ${state.dayNumber}`}
          subtitle="Everyone close your eyes. The town sleeps. The moderator will guide each role in turn."
        />
        <button
          onClick={() => {
            const first = nextNightPhase(state, null);
            if (first) setState({ ...state, phase: first });
            else {
              const { deaths, detectiveResult, players } = resolveNight(state);
              setState({
                ...state,
                players,
                lastDeaths: deaths,
                detectiveResult,
                phase: "day-reveal",
              });
            }
          }}
          className="btn-blood w-full rounded-xl py-4 font-display tracking-wider"
        >
          Begin Night Actions
        </button>
      </Scene>
    );
  }

  if (state.phase === "night-mafia") {
    return (
      <Scene state={state}>
        <PhaseBanner
          icon={<SkullIcon className="size-10 inline" />}
          title="Mafia, open your eyes"
          subtitle="Mafia: silently agree on a target. Moderator: tap who they kill."
        />
        <PlayerPickGrid
          players={state.players}
          selectedId={state.night.mafiaKill}
          onSelect={(id) =>
            update({ night: { ...state.night, mafiaKill: id } })
          }
          filter={(p) => p.role !== "mafia" && p.role !== "barman"}
          allowSkip
          onSkip={() =>
            advanceFromNight("night-mafia", {
              night: { ...state.night, mafiaKill: undefined },
            })
          }
        />
        <NightNext
          disabled={!state.night.mafiaKill}
          onNext={() => advanceFromNight("night-mafia")}
        />
      </Scene>
    );
  }

  if (state.phase === "night-barman") {
    return (
      <Scene state={state}>
        <PhaseBanner
          icon={<GlassWater className="size-10 inline" />}
          title="Barman, choose your mark"
          subtitle="Pick a player whose ability is blocked tonight."
        />
        <PlayerPickGrid
          players={state.players}
          selectedId={state.night.barmanBlock}
          onSelect={(id) =>
            update({ night: { ...state.night, barmanBlock: id } })
          }
          allowSkip
          onSkip={() =>
            advanceFromNight("night-barman", {
              night: { ...state.night, barmanBlock: undefined },
            })
          }
        />
        <NightNext
          disabled={!state.night.barmanBlock}
          onNext={() => advanceFromNight("night-barman")}
        />
      </Scene>
    );
  }

  if (state.phase === "night-detective") {
    const target = state.players.find(
      (p) => p.id === state.night.detectiveCheck,
    );
    const showResult = !!state.night.detectiveCheck;
    const detective = state.players.find(
      (p) => p.alive && p.role === "detective",
    );
    const blocked =
      state.night.barmanBlock !== undefined &&
      state.night.barmanBlock === detective?.id;
    return (
      <Scene state={state}>
        <PhaseBanner
          icon={<Search className="size-10 inline" />}
          title="Detective, investigate"
          subtitle="The detective points to one player. Show them the result silently."
        />
        {!showResult ? (
          <PlayerPickGrid
            players={state.players}
            onSelect={(id) =>
              update({ night: { ...state.night, detectiveCheck: id } })
            }
            filter={(p) => p.role !== "detective"}
            allowSkip
            onSkip={() => advanceFromNight("night-detective")}
          />
        ) : (
          <div className="card-occult rounded-2xl p-8 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Investigation of
            </div>
            <div className="font-display text-2xl text-foreground mt-1">
              {target?.name}
            </div>
            {blocked ? (
              <>
                <div className="text-5xl my-4">🥃</div>
                <div className="font-display text-xl text-accent">
                  Blocked by the Barman
                </div>
                <p className="text-muted-foreground text-sm mt-2">
                  Show the detective only this screen.
                </p>
              </>
            ) : target?.role === "mafia" || target?.role === "barman" ? (
              <>
                <div className="text-6xl my-4">🩸</div>
                <div className="font-display text-2xl text-primary">MAFIA</div>
              </>
            ) : (
              <>
                <div className="text-6xl my-4">🕯️</div>
                <div className="font-display text-2xl text-accent">
                  Not Mafia
                </div>
              </>
            )}
            <button
              onClick={() => advanceFromNight("night-detective")}
              className="btn-blood w-full mt-6 rounded-xl py-3 font-display tracking-wider"
            >
              Continue
            </button>
          </div>
        )}
      </Scene>
    );
  }

  if (state.phase === "night-doctor") {
    return (
      <Scene state={state}>
        <PhaseBanner
          icon={<HeartPulse className="size-10 inline" />}
          title="Doctor, save a life"
          subtitle="Choose one player to protect from death tonight."
        />
        <PlayerPickGrid
          players={state.players}
          selectedId={state.night.doctorSave}
          onSelect={(id) =>
            update({ night: { ...state.night, doctorSave: id } })
          }
          allowSkip
          onSkip={() =>
            advanceFromNight("night-doctor", {
              night: { ...state.night, doctorSave: undefined },
            })
          }
        />
        <NightNext
          disabled={!state.night.doctorSave}
          onNext={() => advanceFromNight("night-doctor")}
        />
      </Scene>
    );
  }

  if (state.phase === "night-guard") {
    return (
      <Scene state={state}>
        <PhaseBanner
          icon={<Shield className="size-10 inline" />}
          title="Guard, take your post"
          subtitle="Protect one player from harm tonight."
        />
        <PlayerPickGrid
          players={state.players}
          selectedId={state.night.guardProtect}
          onSelect={(id) =>
            update({ night: { ...state.night, guardProtect: id } })
          }
          allowSkip
          onSkip={() =>
            advanceFromNight("night-guard", {
              night: { ...state.night, guardProtect: undefined },
            })
          }
        />
        <NightNext
          disabled={!state.night.guardProtect}
          onNext={() => advanceFromNight("night-guard")}
        />
      </Scene>
    );
  }

  if (state.phase === "night-vigilante") {
    return (
      <Scene state={state}>
        <PhaseBanner
          icon={<Crosshair className="size-10 inline" />}
          title="Vigilante, take aim"
          subtitle="Choose to fire — or hold."
        />
        <PlayerPickGrid
          players={state.players}
          selectedId={state.night.vigilanteKill}
          onSelect={(id) =>
            update({ night: { ...state.night, vigilanteKill: id } })
          }
          filter={(p) => p.role !== "vigilante"}
          allowSkip
          onSkip={() =>
            advanceFromNight("night-vigilante", {
              night: { ...state.night, vigilanteKill: undefined },
            })
          }
        />
        <NightNext
          disabled={!state.night.vigilanteKill}
          onNext={() => advanceFromNight("night-vigilante")}
        />
      </Scene>
    );
  }

  if (state.phase === "day-reveal") {
    return (
      <Scene state={state}>
        <PhaseBanner
          icon="☀️"
          title={`Day ${state.dayNumber}`}
          subtitle="Dawn breaks. Everyone open your eyes."
        />
        <DeathList deaths={state.lastDeaths} players={state.players} />
        <div className="mt-6">
          <button
            onClick={() => {
              const winner = checkWinner(state);
              if (winner) setState({ ...state, winner, phase: "gameover" });
              else setState({ ...state, phase: "day-vote" });
            }}
            className="btn-blood w-full rounded-xl py-4 font-display tracking-wider"
          >
            Begin Discussion & Vote
          </button>
        </div>
      </Scene>
    );
  }

  if (state.phase === "day-vote") {
    return <DayVote state={state} setState={setState} />;
  }

  if (state.phase === "day-result") {
    const e = state.lastEliminated;
    const def = e ? ROLES[e.role] : null;
    const elim = e ? state.players.find((p) => p.id === e.id) : null;
    return (
      <Scene state={state}>
        <PhaseBanner
          icon={<Vote className="size-10 inline" />}
          title="The Verdict"
        />
        {e && def && elim ? (
          <div className="card-occult rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">{def.emoji}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Eliminated
            </div>
            <div className="font-display text-2xl text-foreground mt-1">
              {elim.name}
            </div>
            <div
              className={`mt-2 text-sm ${
                def.faction === "mafia" ? "text-primary" : "text-accent"
              }`}
            >
              They were the {def.name}
            </div>
          </div>
        ) : (
          <div className="card-occult rounded-2xl p-6 text-center text-muted-foreground">
            No one was eliminated.
          </div>
        )}
        <button
          onClick={() => {
            const winner = checkWinner(state);
            if (winner) setState({ ...state, winner, phase: "gameover" });
            else
              setState({
                ...state,
                dayNumber: state.dayNumber + 1,
                phase: "night-intro",
                night: {},
                lastDeaths: [],
                lastEliminated: undefined,
                detectiveResult: undefined,
              });
          }}
          className="btn-blood w-full mt-6 rounded-xl py-4 font-display tracking-wider"
        >
          To the Next Night
        </button>
      </Scene>
    );
  }

  if (state.phase === "gameover") {
    const townWin = state.winner === "town";
    return (
      <Scene state={state}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card-occult rounded-2xl p-8 text-center"
        >
          <Trophy
            className={`size-12 mx-auto mb-3 ${
              townWin ? "text-accent" : "text-primary"
            }`}
          />
          <div className="uppercase tracking-[0.3em] text-xs text-muted-foreground">
            Victory
          </div>
          <h2
            className={`font-display text-4xl mt-2 ${
              townWin ? "text-accent" : "text-blood-glow"
            }`}
          >
            {townWin ? "The Town Survives" : "The Mafia Wins"}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">
            {townWin
              ? "Every Mafia has been hunted out."
              : "The Mafia outnumber the innocent."}
          </p>

          <div className="mt-6 text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              All Roles
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto">
              {state.players.map((p) => {
                const r = ROLES[p.role];
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40"
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <div className="flex-1">
                      <div
                        className={`text-foreground ${
                          !p.alive ? "line-through opacity-60" : ""
                        }`}
                      >
                        {p.name}
                      </div>
                      <div
                        className={`text-xs ${
                          r.faction === "mafia"
                            ? "text-primary"
                            : "text-accent"
                        }`}
                      >
                        {r.name}
                      </div>
                    </div>
                    {!p.alive && (
                      <SkullIcon className="size-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={onRestart}
            className="btn-blood w-full mt-6 rounded-xl py-3 font-display tracking-wider"
          >
            New Game
          </button>
        </motion.div>
      </Scene>
    );
  }

  return null;
}

function Scene({
  state,
  children,
}: {
  state: GameState;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-blood-scene px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <StatusBar state={state} />
        {children}
      </div>
    </div>
  );
}

function NightNext({
  disabled,
  onNext,
}: {
  disabled: boolean;
  onNext: () => void;
}) {
  return (
    <button
      onClick={onNext}
      disabled={disabled}
      className="btn-blood w-full mt-4 rounded-xl py-3 font-display tracking-wider"
    >
      Confirm & Continue
    </button>
  );
}

function DayVote({
  state,
  setState,
}: {
  state: GameState;
  setState: (s: GameState) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const alive = useMemo(
    () => state.players.filter((p) => p.alive),
    [state.players],
  );
  return (
    <Scene state={state}>
      <PhaseBanner
        icon={<Vote className="size-10 inline" />}
        title="The Town Decides"
        subtitle="Discuss, accuse, and vote. The moderator confirms who is eliminated — or chooses to skip."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1">
        {alive.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`rounded-xl px-3 py-3 border text-left transition ${
              selected === p.id
                ? "border-primary bg-primary/15 animate-pulse-glow"
                : "border-border bg-card hover:bg-primary/10 hover:border-primary/60"
            }`}
          >
            <div className="text-foreground truncate">{p.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {selected === p.id ? "Marked" : "Tap to mark"}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() =>
            setState({
              ...state,
              phase: "day-result",
              lastEliminated: undefined,
            })
          }
          className="btn-ghost-blood rounded-xl py-3 px-4 flex-1"
        >
          Skip Vote
        </button>
        <button
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            const target = state.players.find((p) => p.id === selected);
            if (!target) return;
            const players = state.players.map((p) =>
              p.id === selected ? { ...p, alive: false } : p,
            );
            setState({
              ...state,
              players,
              phase: "day-result",
              lastEliminated: { id: target.id, role: target.role },
            });
          }}
          className="btn-blood rounded-xl py-3 px-4 flex-[2] font-display tracking-wider"
        >
          Eliminate
        </button>
      </div>
    </Scene>
  );
}

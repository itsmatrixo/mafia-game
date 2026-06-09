import { motion } from "framer-motion";
import { Moon, Sun, Skull, X } from "lucide-react";
import type { GameState, Player, RoleId } from "@/lib/mafia/types";
import { ROLES } from "@/lib/mafia/roles";

export function PhaseBanner({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-6"
    >
      <div className="text-4xl mb-2 animate-flicker">{icon}</div>
      <h2 className="font-display text-3xl text-blood-glow">{title}</h2>
      {subtitle && (
        <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

export function PlayerPickGrid({
  players,
  selectedId,
  onSelect,
  filter,
  allowSkip,
  onSkip,
}: {
  players: Player[];
  selectedId?: string;
  onSelect: (id: string) => void;
  filter?: (p: Player) => boolean;
  allowSkip?: boolean;
  onSkip?: () => void;
}) {
  const list = players.filter((p) => p.alive && (!filter || filter(p)));
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1">
        {list.map((p) => {
          const isSel = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`rounded-xl px-3 py-3 border text-left transition ${
                isSel
                  ? "border-primary bg-primary/15 animate-pulse-glow"
                  : "border-border bg-card hover:bg-primary/10 hover:border-primary/60"
              }`}
            >
              <div className="text-foreground truncate">{p.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                {isSel ? "Selected" : "Tap to choose"}
              </div>
            </button>
          );
        })}
      </div>
      {allowSkip && (
        <button
          onClick={onSkip}
          className="mt-3 w-full btn-ghost-blood rounded-xl py-2 text-sm"
        >
          Skip (no action)
        </button>
      )}
    </>
  );
}

export function DeathList({
  deaths,
  players,
}: {
  deaths: { id: string; role: RoleId }[];
  players: Player[];
}) {
  if (deaths.length === 0) {
    return (
      <div className="card-occult rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">🌅</div>
        <div className="font-display text-xl text-foreground">
          A peaceful night.
        </div>
        <div className="text-muted-foreground text-sm mt-1">
          No one was killed.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {deaths.map((d) => {
        const p = players.find((x) => x.id === d.id);
        const def = ROLES[d.role];
        return (
          <div
            key={d.id}
            className="card-occult rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="text-4xl">{def.emoji}</div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-primary flex items-center gap-1">
                <Skull className="size-3" /> Killed
              </div>
              <div className="font-display text-xl text-foreground">
                {p?.name}
              </div>
              <div className="text-sm text-muted-foreground">
                was the {def.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatusBar({ state }: { state: GameState }) {
  const alive = state.players.filter((p) => p.alive).length;
  const mafia = state.players.filter(
    (p) => p.alive && (p.role === "mafia" || p.role === "barman"),
  ).length;
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 px-1">
      <div className="flex items-center gap-1">
        {state.phase.startsWith("night") || state.phase === "night-resolve" ? (
          <Moon className="size-3 text-accent" />
        ) : (
          <Sun className="size-3 text-accent" />
        )}
        <span className="uppercase tracking-widest">
          {state.phase.startsWith("night") ? "Night" : "Day"} {state.dayNumber}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>{alive} alive</span>
        <span className="text-primary/80">· {mafia} mafia left</span>
      </div>
    </div>
  );
}

export { X };

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Users, Skull, Shield, Crosshair, GlassWater } from "lucide-react";
import { mafiaCountFor } from "@/lib/mafia/game";
import type { OptionalRoles } from "@/lib/mafia/game";

interface Props {
  onStart: (names: string[], optional: OptionalRoles) => void;
}

export function Setup({ onStart }: Props) {
  const [names, setNames] = useState<string[]>(["", "", "", "", "", ""]);
  const [optional, setOptional] = useState<OptionalRoles>({
    barman: false,
    vigilante: false,
    guard: false,
  });
  const [currentName, setCurrentName] = useState("");

  const filled = names.map((n) => n.trim()).filter(Boolean);
  const valid = filled.length >= 6 && filled.length <= 30;

  const updateName = (i: number, v: string) => {
    const next = [...names];
    next[i] = v;
    setNames(next);
  };
  const removeAt = (i: number) => {
    if (names.length <= 6) {
      updateName(i, "");
      return;
    }
    setNames(names.filter((_, j) => j !== i));
  };
  const addOne = () => {
    if (names.length >= 30) return;
    const trimmed = currentName.trim();
    if (trimmed) {
      setNames([...names, trimmed]);
      setCurrentName("");
    } else {
      setNames([...names, ""]);
    }
  };

  return (
    <div className="min-h-screen bg-blood-scene px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="text-4xl mb-3 animate-flicker">🌙</div>
          <h1 className="font-display text-5xl sm:text-6xl text-blood-glow">
            Blood Moon
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.4em] text-accent">
            A Game of Mafia
          </p>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            Gather the village. Whisper the names of those who will play. The
            moon will assign their fate.
          </p>
        </motion.div>

        <div className="card-occult rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-foreground">
              <Users className="size-5 text-accent" />
              <span className="font-display text-xl">Players</span>
              <span className="text-muted-foreground text-sm">
                ({filled.length})
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {filled.length >= 6
                ? `${mafiaCountFor(filled.length)} Mafia`
                : "Min 6"}
            </div>
          </div>

          <div className="grid gap-2 max-h-[42vh] overflow-y-auto pr-1">
            {names.map((n, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs text-muted-foreground font-mono">
                  {i + 1}
                </div>
                <input
                  value={n}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => removeAt(i)}
                  className="size-9 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary transition"
                  aria-label="Remove"
                >
                  <X className="size-4 mx-auto" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOne();
                }
              }}
              placeholder="Add another nickname…"
              className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
            />
            <button
              onClick={addOne}
              disabled={names.length >= 30}
              className="btn-ghost-blood rounded-lg px-4 py-2 flex items-center gap-1"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
        </div>

        <div className="card-occult rounded-2xl p-6 sm:p-8 mt-6">
          <h2 className="font-display text-xl mb-1">Optional Roles</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Recommended for 14+ players. Add depth and chaos.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <RoleToggle
              icon={<GlassWater className="size-5" />}
              label="Barman"
              sub="Mafia · blocks abilities"
              active={optional.barman}
              onClick={() =>
                setOptional({ ...optional, barman: !optional.barman })
              }
            />
            <RoleToggle
              icon={<Crosshair className="size-5" />}
              label="Vigilante"
              sub="Town · kills at night"
              active={optional.vigilante}
              onClick={() =>
                setOptional({ ...optional, vigilante: !optional.vigilante })
              }
            />
            <RoleToggle
              icon={<Shield className="size-5" />}
              label="Guard"
              sub="Town · protects a target"
              active={optional.guard}
              onClick={() =>
                setOptional({ ...optional, guard: !optional.guard })
              }
            />
          </div>
        </div>

        <button
          onClick={() => valid && onStart(filled, optional)}
          disabled={!valid}
          className="btn-blood w-full mt-8 rounded-xl py-4 font-display text-lg tracking-wider flex items-center justify-center gap-2"
        >
          <Skull className="size-5" /> Begin the Night
        </button>
        {!valid && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Need 6 to 30 players to begin.
          </p>
        )}
      </div>
    </div>
  );
}

function RoleToggle({
  icon,
  label,
  sub,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl p-4 border transition ${
        active
          ? "border-primary bg-primary/10 animate-pulse-glow"
          : "border-border bg-background/40 hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-2 text-foreground">
        <span className={active ? "text-primary" : "text-muted-foreground"}>
          {icon}
        </span>
        <span className="font-display">{label}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </button>
  );
}

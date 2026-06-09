import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import type { Player } from "@/lib/mafia/types";
import { RoleCard } from "./RoleCard";

interface Props {
  players: Player[];
  onAllRevealed: (players: Player[]) => void;
}

export function RoleReveal({ players, onAllRevealed }: Props) {
  const [list, setList] = useState(players);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);

  const active = list.find((p) => p.id === activeId);
  const allDone = list.every((p) => p.revealed);

  const start = (id: string) => {
    setActiveId(id);
    setShowing(false);
  };
  const reveal = () => setShowing(true);
  const done = () => {
    setList((prev) =>
      prev.map((p) => (p.id === activeId ? { ...p, revealed: true } : p)),
    );
    setActiveId(null);
    setShowing(false);
  };

  return (
    <div className="min-h-screen bg-blood-scene px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-blood-glow">
            Receive Your Role
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Pass the device around. Each player views their card alone.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => !p.revealed && start(p.id)}
              disabled={p.revealed}
              className={`rounded-xl px-3 py-3 border text-left transition ${
                p.revealed
                  ? "border-border bg-secondary/40 opacity-60"
                  : "border-primary/40 bg-card hover:bg-primary/10 hover:border-primary"
              }`}
            >
              <div className="flex items-center gap-2">
                {p.revealed ? (
                  <EyeOff className="size-4 text-muted-foreground" />
                ) : (
                  <Eye className="size-4 text-primary" />
                )}
                <span className="truncate text-foreground">{p.name}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                {p.revealed ? "Seen" : "Tap to view"}
              </div>
            </button>
          ))}
        </div>

        <button
          disabled={!allDone}
          onClick={() => onAllRevealed(list)}
          className="btn-blood w-full rounded-xl py-4 font-display text-lg tracking-wider"
        >
          Everyone Has Seen — Begin Night 1
        </button>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm">
              {!showing ? (
                <div className="card-occult rounded-2xl p-8 text-center">
                  <div className="text-5xl mb-4">🤫</div>
                  <h3 className="font-display text-2xl text-blood-glow mb-2">
                    {active.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Make sure no one else is looking.
                  </p>
                  <button
                    onClick={reveal}
                    className="btn-blood w-full rounded-xl py-3 font-display tracking-wider"
                  >
                    Reveal My Role
                  </button>
                  <button
                    onClick={() => setActiveId(null)}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <RoleCard role={active.role} playerName={active.name} size="lg" />
                  <button
                    onClick={done}
                    className="btn-blood w-full mt-4 rounded-xl py-3 font-display tracking-wider"
                  >
                    I've Memorized It — Hide
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

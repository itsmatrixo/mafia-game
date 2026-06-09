import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, X, Users, Skull, Shield, Crosshair, GlassWater, Loader2 } from "lucide-react";
import { mafiaCountFor } from "@/lib/mafia/game";
import type { OptionalRoles } from "@/lib/mafia/game";
import { createRoom } from "@/lib/mafia/online";

export function HostSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [names, setNames] = useState<string[]>(["", "", "", "", "", ""]);
  const [optional, setOptional] = useState<OptionalRoles>({
    barman: false,
    vigilante: false,
    guard: false,
  });
  const [currentName, setCurrentName] = useState("");
  const [creating, setCreating] = useState(false);

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

  const onCreate = async () => {
    if (!valid) return;
    setCreating(true);
    try {
      const { code } = await createRoom(filled, optional);
      navigate({ to: "/room/$code", params: { code } });
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-blood-scene px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          ← {t("common.back")}
        </button>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-4xl text-blood-glow">
            {t("host.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("host.addNames")}
          </p>
        </motion.div>

        <div className="card-occult rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-foreground">
              <Users className="size-5 text-accent" />
              <span className="font-display text-xl">{t("setup.players")}</span>
              <span className="text-muted-foreground text-sm">
                ({filled.length})
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {filled.length >= 6
                ? t("setup.mafiaCount", { count: mafiaCountFor(filled.length) })
                : t("setup.minPlayers")}
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
                  placeholder={`#${i + 1}`}
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
              placeholder={t("setup.addPlayer")}
              className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
            />
            <button
              onClick={addOne}
              disabled={names.length >= 30}
              className="btn-ghost-blood rounded-lg px-4 py-2 flex items-center gap-1"
            >
              <Plus className="size-4" /> {t("setup.add")}
            </button>
          </div>
        </div>

        <div className="card-occult rounded-2xl p-6 sm:p-8 mt-6">
          <h2 className="font-display text-xl mb-1">
            {t("host.optionalRoles")}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t("host.optionalHint")}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <RoleToggle
              icon={<GlassWater className="size-5" />}
              label={t("setup.barman")}
              sub={t("setup.barmanSub")}
              active={optional.barman}
              onClick={() =>
                setOptional({ ...optional, barman: !optional.barman })
              }
            />
            <RoleToggle
              icon={<Crosshair className="size-5" />}
              label={t("setup.vigilante")}
              sub={t("setup.vigilanteSub")}
              active={optional.vigilante}
              onClick={() =>
                setOptional({ ...optional, vigilante: !optional.vigilante })
              }
            />
            <RoleToggle
              icon={<Shield className="size-5" />}
              label={t("setup.guard")}
              sub={t("setup.guardSub")}
              active={optional.guard}
              onClick={() =>
                setOptional({ ...optional, guard: !optional.guard })
              }
            />
          </div>
        </div>

        <button
          onClick={onCreate}
          disabled={!valid || creating}
          className="btn-blood w-full mt-8 rounded-xl py-4 font-display text-lg tracking-wider flex items-center justify-center gap-2"
        >
          {creating ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Skull className="size-5" />
          )}
          {t("host.begin")}
        </button>
        {!valid && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {t("host.needPlayers")}
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

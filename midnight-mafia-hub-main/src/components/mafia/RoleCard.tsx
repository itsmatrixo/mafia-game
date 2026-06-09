import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { RoleId } from "@/lib/mafia/types";
import { ROLES } from "@/lib/mafia/roles";

interface Props {
  role: RoleId;
  playerName?: string;
  size?: "sm" | "md" | "lg";
}

export function RoleCard({ role, playerName, size = "md" }: Props) {
  const { t } = useTranslation();
  const def = ROLES[role];
  const isMafia = def.faction === "mafia";

  const padding = size === "lg" ? "p-8" : size === "md" ? "p-6" : "p-4";
  const emojiSize =
    size === "lg" ? "text-7xl" : size === "md" ? "text-5xl" : "text-3xl";

  return (
    <motion.div
      initial={{ rotateY: -90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={`card-occult rounded-2xl ${padding} relative overflow-hidden`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: isMafia
            ? "linear-gradient(90deg, transparent, var(--color-blood), transparent)"
            : "linear-gradient(90deg, transparent, var(--color-ember), transparent)",
        }}
      />
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`${emojiSize} animate-flicker`}>{def.emoji}</div>
        <div className="uppercase tracking-[0.3em] text-xs text-muted-foreground">
          {isMafia ? t("role.faction_mafia") : t("role.faction_town")}
        </div>
        <h2 className="font-display text-3xl text-blood-glow">
          {t(`roles.${role}.name`)}
        </h2>
        <p className="italic text-sm text-accent">
          {t(`roles.${role}.tagline`)}
        </p>
        {playerName && (
          <div className="mt-2 text-foreground/80 text-sm">
            <span className="text-muted-foreground">{t("role.you_are")}:</span>{" "}
            <span className="font-semibold">{playerName}</span>
          </div>
        )}
        <div className="mt-3 text-sm text-foreground/85 max-w-xs">
          {t(`roles.${role}.description`)}
        </div>
        <div className="mt-3 px-3 py-2 rounded-lg border border-border bg-background/40 text-xs text-foreground/90 max-w-xs">
          <span className="text-accent uppercase tracking-wider text-[10px]">
            {t("role.ability")}
          </span>
          <div className="mt-1">{t(`roles.${role}.ability`)}</div>
        </div>
      </div>
    </motion.div>
  );
}

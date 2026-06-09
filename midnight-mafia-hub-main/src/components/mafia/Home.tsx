import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Skull, Users, Plus, LogIn, Loader2 } from "lucide-react";
import { LangSwitcher } from "./LangSwitcher";
import { fetchRoom, LAST_ROOM_KEY } from "@/lib/mafia/online";

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choice" | "join">("choice");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const last =
    typeof window !== "undefined"
      ? localStorage.getItem(LAST_ROOM_KEY)
      : null;

  const onJoin = async () => {
    setErr(null);
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setJoining(true);
    const room = await fetchRoom(c);
    setJoining(false);
    if (!room) {
      setErr(t("join.notFound"));
      return;
    }
    navigate({ to: "/room/$code", params: { code: c } });
  };

  return (
    <div className="min-h-screen bg-blood-scene px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-4xl mb-3 animate-flicker">🌙</div>
          <h1 className="font-display text-5xl sm:text-6xl text-blood-glow">
            {t("app.title")}
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.4em] text-accent">
            {t("app.subtitle")}
          </p>
          <p className="mt-4 text-muted-foreground max-w-sm mx-auto">
            {t("app.tagline")}
          </p>
        </motion.div>

        {mode === "choice" ? (
          <div className="space-y-3">
            <button
              onClick={() => navigate({ to: "/host" })}
              className="card-occult w-full rounded-2xl p-5 text-left hover:border-primary transition group"
            >
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center">
                  <Plus className="size-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-xl text-foreground">
                    {t("home.create")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("home.createDesc")}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              className="card-occult w-full rounded-2xl p-5 text-left hover:border-accent transition"
            >
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center">
                  <LogIn className="size-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-xl text-foreground">
                    {t("home.join")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("home.joinDesc")}
                  </div>
                </div>
              </div>
            </button>

            {last && (
              <button
                onClick={() =>
                  navigate({ to: "/room/$code", params: { code: last } })
                }
                className="w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/60 transition"
              >
                <Users className="size-4 inline mr-2" />
                {t("join.rejoin")}:{" "}
                <span className="font-mono text-foreground">{last}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="card-occult rounded-2xl p-6">
            <button
              onClick={() => {
                setMode("choice");
                setErr(null);
              }}
              className="text-xs text-muted-foreground mb-3 hover:text-foreground"
            >
              ← {t("common.back")}
            </button>
            <div className="font-display text-2xl mb-1">{t("join.title")}</div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {t("join.codeLabel")}
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") onJoin();
              }}
              placeholder={t("join.codePlaceholder")}
              maxLength={6}
              className="w-full bg-background/60 border border-border rounded-lg px-4 py-4 text-2xl font-mono tracking-[0.5em] text-center text-foreground focus:outline-none focus:border-primary"
            />
            {err && (
              <p className="mt-2 text-sm text-primary text-center">{err}</p>
            )}
            <button
              onClick={onJoin}
              disabled={code.length < 4 || joining}
              className="btn-blood w-full mt-4 rounded-xl py-3 font-display tracking-wider flex items-center justify-center gap-2"
            >
              {joining ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Skull className="size-4" />
              )}
              {t("join.enter")}
            </button>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-border">
          <div className="text-xs text-center text-muted-foreground mb-3 uppercase tracking-widest">
            {t("home.language")}
          </div>
          <LangSwitcher />
        </div>
      </div>
    </div>
  );
}

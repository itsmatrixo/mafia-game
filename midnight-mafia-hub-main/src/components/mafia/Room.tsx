import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  LogOut,
  Loader2,
  Skull,
  Vote,
  Trophy,
  Moon,
  Sun,
  Eye,
  EyeOff,
  GlassWater,
  Search,
  HeartPulse,
  Shield,
  Crosshair,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { GameState, NightActionKey, Player, RoleId } from "@/lib/mafia/types";
import {
  allNightSubmitted,
  allRevealed,
  allVoted,
  castVote,
  claimSlot,
  fetchRoom,
  getClientId,
  LAST_ROOM_KEY,
  markRevealed,
  releaseSlot,
  requiredNightActions,
  resolveAndAdvance,
  saveState,
  startGame,
  submitNightAction,
  tallyVotes,
  toNextNight,
} from "@/lib/mafia/online";
import { aliveOf, checkWinner, mafiaCountFor } from "@/lib/mafia/game";
import { ROLES } from "@/lib/mafia/roles";
import { RoleCard } from "./RoleCard";

interface Props {
  code: string;
}

export function Room({ code }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const clientId = getClientId();
  const [state, setStateRaw] = useState<GameState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showRevealOverlay, setShowRevealOverlay] = useState(false);

  // initial fetch + realtime subscription
  useEffect(() => {
    let mounted = true;
    (async () => {
      const room = await fetchRoom(code);
      if (!mounted) return;
      if (!room) {
        setNotFound(true);
        return;
      }
      setStateRaw(room.state);
      localStorage.setItem(LAST_ROOM_KEY, code.toUpperCase());
    })();

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code.toUpperCase()}`,
        },
        (payload) => {
          const next = (payload.new as { state: GameState }).state;
          setStateRaw(next);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [code]);

  const save = async (next: GameState, expectPhase?: string) => {
    setStateRaw(next);
    await saveState(code, next, expectPhase);
  };

  const me = useMemo(
    () => state?.players.find((p) => p.claimedBy === clientId) ?? null,
    [state, clientId],
  );
  const isHost = state?.hostId === clientId;

  // Auto-advancements (any client; idempotent + phase-gated)
  useEffect(() => {
    if (!state) return;
    // reveal -> night when all revealed
    if (state.phase === "reveal" && allRevealed(state)) {
      void saveState(
        code,
        { ...state, phase: "night", night: {} },
        "reveal",
      );
    }
    // night -> day-reveal when all required submitted
    if (state.phase === "night" && allNightSubmitted(state)) {
      void saveState(code, resolveAndAdvance(state), "night");
    }
    // day-vote -> day-result when all alive voted
    if (state.phase === "day-vote" && allVoted(state)) {
      void saveState(code, tallyVotes(state), "day-vote");
    }
  }, [state, code]);

  if (notFound) {
    return (
      <CenteredCard>
        <div className="font-display text-2xl text-blood-glow mb-2">
          {t("join.notFound")}
        </div>
        <button
          onClick={() => navigate({ to: "/" })}
          className="btn-blood rounded-xl px-4 py-2 mt-2"
        >
          {t("common.back")}
        </button>
      </CenteredCard>
    );
  }
  if (!state) {
    return (
      <CenteredCard>
        <Loader2 className="size-6 animate-spin text-accent mx-auto" />
        <div className="text-muted-foreground text-sm mt-2">
          {t("common.loading")}
        </div>
      </CenteredCard>
    );
  }

  // ===== LOBBY =====
  if (state.phase === "lobby") {
    return (
      <Lobby
        state={state}
        code={code}
        isHost={isHost}
        clientId={clientId}
        me={me}
        onClaim={(pid) => save(claimSlot(state, pid, clientId), "lobby")}
        onRelease={() => save(releaseSlot(state, clientId), "lobby")}
        onStart={() => save(startGame(state), "lobby")}
        onLeave={() => navigate({ to: "/" })}
      />
    );
  }

  // ===== REVEAL =====
  if (state.phase === "reveal") {
    return (
      <RevealView
        state={state}
        me={me}
        show={showRevealOverlay}
        onShow={() => setShowRevealOverlay(true)}
        onHide={() => {
          setShowRevealOverlay(false);
          if (me && !me.revealed)
            void save(markRevealed(state, me.id), "reveal");
        }}
        onLeave={() => navigate({ to: "/" })}
      />
    );
  }

  // ===== NIGHT =====
  if (state.phase === "night") {
    return (
      <NightView
        state={state}
        me={me}
        code={code}
        onSubmit={(key, target) =>
          save(submitNightAction(state, key, target), "night")
        }
        onLeave={() => navigate({ to: "/" })}
      />
    );
  }

  // ===== DAY REVEAL =====
  if (state.phase === "day-reveal") {
    return (
      <DayRevealView
        state={state}
        me={me}
        clientId={clientId}
        onContinue={() =>
          save({ ...state, phase: "day-vote", votes: {} }, "day-reveal")
        }
        onLeave={() => navigate({ to: "/" })}
      />
    );
  }

  // ===== DAY VOTE =====
  if (state.phase === "day-vote") {
    return (
      <DayVoteView
        state={state}
        me={me}
        onVote={(targetId) =>
          me && save(castVote(state, me.id, targetId), "day-vote")
        }
        onLeave={() => navigate({ to: "/" })}
      />
    );
  }

  // ===== DAY RESULT =====
  if (state.phase === "day-result") {
    return (
      <DayResultView
        state={state}
        onContinue={() => {
          const winner = checkWinner(state);
          if (winner)
            save({ ...state, winner, phase: "gameover" }, "day-result");
          else save(toNextNight(state), "day-result");
        }}
        onLeave={() => navigate({ to: "/" })}
      />
    );
  }

  // ===== GAME OVER =====
  if (state.phase === "gameover") {
    return (
      <GameOverView
        state={state}
        onPlayAgain={async () => {
          // delete cached then go home; host can spin up a new room
          localStorage.removeItem(LAST_ROOM_KEY);
          navigate({ to: "/" });
        }}
      />
    );
  }

  return null;
}

// ===================================================================
// LOBBY
// ===================================================================
function Lobby({
  state,
  code,
  isHost,
  clientId,
  me,
  onClaim,
  onRelease,
  onStart,
  onLeave,
}: {
  state: GameState;
  code: string;
  isHost: boolean;
  clientId: string;
  me: Player | null;
  onClaim: (id: string) => void;
  onRelease: () => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const claimedCount = state.players.filter((p) => !!p.claimedBy).length;
  const allClaimed = claimedCount === state.players.length;

  const copy = async () => {
    await navigator.clipboard.writeText(code.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Scene>
      <TopBar code={code} state={state} onLeave={onLeave} />
      <div className="text-center mb-6">
        <h1 className="font-display text-4xl text-blood-glow">
          {t("host.lobbyTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("host.shareCode")}
        </p>
      </div>

      <div className="card-occult rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("common.code")}
          </div>
          <div className="font-display text-4xl tracking-[0.4em] text-blood-glow font-mono">
            {code.toUpperCase()}
          </div>
        </div>
        <button
          onClick={copy}
          className="btn-ghost-blood rounded-xl px-4 py-3 flex items-center gap-2"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("host.copied") : t("host.copyCode")}
        </button>
      </div>

      <div className="card-occult rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-accent" />
            <span className="text-sm">
              {t("host.playersIn", { count: claimedCount })}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("setup.mafiaCount", { count: mafiaCountFor(state.players.length) })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t("join.pickName")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {state.players.map((p) => {
            const taken = !!p.claimedBy;
            const mine = p.claimedBy === clientId;
            return (
              <button
                key={p.id}
                disabled={taken && !mine}
                onClick={() => (mine ? onRelease() : onClaim(p.id))}
                className={`rounded-xl px-3 py-3 border text-left transition ${
                  mine
                    ? "border-primary bg-primary/15 animate-pulse-glow"
                    : taken
                      ? "border-border bg-secondary/40 opacity-60"
                      : "border-border bg-card hover:bg-primary/10 hover:border-primary/60"
                }`}
              >
                <div className="truncate text-foreground">{p.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  {mine ? t("join.youAre") : taken ? "✓" : t("join.pickName")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isHost ? (
        <>
          <button
            onClick={onStart}
            disabled={!allClaimed}
            className="btn-blood w-full mt-6 rounded-xl py-4 font-display text-lg tracking-wider"
          >
            {t("host.startGame")}
          </button>
          {!allClaimed && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              {t("host.notAllClaimed")}
            </p>
          )}
        </>
      ) : (
        <div className="text-center text-sm text-muted-foreground mt-6">
          {me ? t("join.waiting") : t("host.waiting")}
        </div>
      )}
    </Scene>
  );
}

// ===================================================================
// REVEAL (each player sees only their own card)
// ===================================================================
function RevealView({
  state,
  me,
  show,
  onShow,
  onHide,
  onLeave,
}: {
  state: GameState;
  me: Player | null;
  show: boolean;
  onShow: () => void;
  onHide: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Scene>
      <TopBar code="" state={state} onLeave={onLeave} />
      <div className="text-center mb-6">
        <h1 className="font-display text-3xl text-blood-glow">
          {t("reveal.title")}
        </h1>
      </div>

      {!me ? (
        <div className="card-occult rounded-2xl p-6 text-center text-muted-foreground">
          {t("join.waiting")}
        </div>
      ) : me.revealed ? (
        <div className="card-occult rounded-2xl p-8 text-center">
          <EyeOff className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("reveal.revealed")}</p>
        </div>
      ) : !show ? (
        <div className="card-occult rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🤫</div>
          <h3 className="font-display text-2xl text-blood-glow mb-2">
            {me.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {t("reveal.instruction")}
          </p>
          <button
            onClick={onShow}
            className="btn-blood w-full rounded-xl py-3 font-display tracking-wider flex items-center justify-center gap-2"
          >
            <Eye className="size-4" /> {t("reveal.tapToReveal")}
          </button>
        </div>
      ) : (
        <div>
          <RoleCard role={me.role} playerName={me.name} size="lg" />
          <button
            onClick={onHide}
            className="btn-blood w-full mt-4 rounded-xl py-3 font-display tracking-wider"
          >
            {t("reveal.hide")}
          </button>
        </div>
      )}

      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 text-center">
          {state.players.filter((p) => p.revealed).length} /{" "}
          {state.players.length}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
          {state.players.map((p) => (
            <div
              key={p.id}
              className={`text-xs px-2 py-1 rounded border text-center truncate ${
                p.revealed
                  ? "border-border bg-secondary/40 text-muted-foreground"
                  : "border-primary/40 bg-primary/10 text-foreground"
              }`}
            >
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
}

// ===================================================================
// NIGHT
// ===================================================================
function NightView({
  state,
  me,
  onSubmit,
  onLeave,
}: {
  state: GameState;
  me: Player | null;
  code: string;
  onSubmit: (key: NightActionKey, target: string | undefined) => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const submitted = new Set(state.night.submitted ?? []);
  const required = requiredNightActions(state);

  // What role does THIS player need to act as?
  const myKeys = useMemo<NightActionKey[]>(() => {
    if (!me || !me.alive) return [];
    const list: NightActionKey[] = [];
    if (me.role === "mafia" || me.role === "barman") list.push("mafiaKill");
    if (me.role === "barman" && state.optional.barman) list.push("barmanBlock");
    if (me.role === "detective") list.push("detectiveCheck");
    if (me.role === "doctor") list.push("doctorSave");
    if (me.role === "guard" && state.optional.guard) list.push("guardProtect");
    if (me.role === "vigilante" && state.optional.vigilante)
      list.push("vigilanteKill");
    return list.filter((k) => required.includes(k));
  }, [me, state, required]);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeKey = myKeys[activeIdx];

  // detective sees result after submission
  const showDetectiveResult =
    me?.role === "detective" &&
    !!state.detectiveResult &&
    state.detectiveResult.forPlayerId === me.id;

  return (
    <Scene>
      <TopBar code="" state={state} onLeave={onLeave} />
      <div className="text-center mb-6">
        <div className="text-3xl mb-2">🌑</div>
        <h2 className="font-display text-3xl text-blood-glow">
          {t("night.nightN", { n: state.dayNumber })}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("night.sleeping")}
        </p>
      </div>

      {!me ? (
        <Hint text={t("join.waiting")} />
      ) : !me.alive ? (
        <Hint text={t("night.dead")} />
      ) : myKeys.length === 0 ? (
        <Hint text={t("night.notYourTurn")} />
      ) : activeKey && !submitted.has(activeKey) ? (
        <NightPicker
          state={state}
          actionKey={activeKey}
          me={me}
          onChoose={(targetId) => {
            onSubmit(activeKey, targetId);
            if (activeIdx + 1 < myKeys.length) setActiveIdx(activeIdx + 1);
          }}
          onSkip={() => {
            onSubmit(activeKey, undefined);
            if (activeIdx + 1 < myKeys.length) setActiveIdx(activeIdx + 1);
          }}
        />
      ) : showDetectiveResult ? (
        <DetectiveResultCard state={state} />
      ) : (
        <Hint text={t("night.submitted")} />
      )}

      <NightProgress state={state} required={required} submitted={submitted} />
    </Scene>
  );
}

function NightPicker({
  state,
  actionKey,
  me,
  onChoose,
  onSkip,
}: {
  state: GameState;
  actionKey: NightActionKey;
  me: Player;
  onChoose: (targetId: string) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const meta = useMemo(() => {
    switch (actionKey) {
      case "mafiaKill":
        return {
          icon: <Skull className="size-8 inline" />,
          title: t("night.mafiaTurn"),
          sub: t("night.mafiaPick"),
          filter: (p: Player) => p.role !== "mafia" && p.role !== "barman",
          allowSkip: false,
        };
      case "barmanBlock":
        return {
          icon: <GlassWater className="size-8 inline" />,
          title: t("night.barmanTurn"),
          sub: t("night.barmanPick"),
          filter: (p: Player) => p.id !== me.id,
          allowSkip: true,
        };
      case "detectiveCheck":
        return {
          icon: <Search className="size-8 inline" />,
          title: t("night.detectiveTurn"),
          sub: t("night.detectivePick"),
          filter: (p: Player) => p.id !== me.id,
          allowSkip: true,
        };
      case "doctorSave":
        return {
          icon: <HeartPulse className="size-8 inline" />,
          title: t("night.doctorTurn"),
          sub: t("night.doctorPick"),
          filter: () => true,
          allowSkip: true,
        };
      case "guardProtect":
        return {
          icon: <Shield className="size-8 inline" />,
          title: t("night.guardTurn"),
          sub: t("night.guardPick"),
          filter: () => true,
          allowSkip: true,
        };
      case "vigilanteKill":
        return {
          icon: <Crosshair className="size-8 inline" />,
          title: t("night.vigilanteTurn"),
          sub: t("night.vigilantePick"),
          filter: (p: Player) => p.id !== me.id,
          allowSkip: true,
        };
    }
  }, [actionKey, t, me.id]);

  const list = state.players.filter((p) => p.alive && meta.filter(p));
  const current = state.night[actionKey] as string | undefined;

  return (
    <div>
      <div className="text-center mb-4">
        <div className="text-3xl mb-2 animate-flicker">{meta.icon}</div>
        <h3 className="font-display text-2xl text-blood-glow">{meta.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{meta.sub}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1">
        {list.map((p) => {
          const isSel = p.id === current;
          return (
            <button
              key={p.id}
              onClick={() => onChoose(p.id)}
              className={`rounded-xl px-3 py-3 border text-left transition ${
                isSel
                  ? "border-primary bg-primary/15 animate-pulse-glow"
                  : "border-border bg-card hover:bg-primary/10 hover:border-primary/60"
              }`}
            >
              <div className="text-foreground truncate">{p.name}</div>
            </button>
          );
        })}
      </div>
      {meta.allowSkip && (
        <button
          onClick={onSkip}
          className="mt-3 w-full btn-ghost-blood rounded-xl py-2 text-sm"
        >
          {t("night.skip")}
        </button>
      )}
    </div>
  );
}

function DetectiveResultCard({ state }: { state: GameState }) {
  const { t } = useTranslation();
  const r = state.detectiveResult!;
  const target = state.players.find((p) => p.id === r.targetId);
  return (
    <div className="card-occult rounded-2xl p-6 text-center">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {t("night.result")}
      </div>
      <div className="font-display text-2xl text-foreground mt-1">
        {target?.name}
      </div>
      {r.blocked ? (
        <>
          <div className="text-5xl my-4">🥃</div>
          <div className="font-display text-xl text-accent">
            {t("night.blocked")}
          </div>
        </>
      ) : r.isMafia ? (
        <>
          <div className="text-6xl my-4">🩸</div>
          <div className="font-display text-2xl text-primary">
            {t("night.isMafia")}
          </div>
        </>
      ) : (
        <>
          <div className="text-6xl my-4">🕯️</div>
          <div className="font-display text-2xl text-accent">
            {t("night.notMafia")}
          </div>
        </>
      )}
    </div>
  );
}

function NightProgress({
  state,
  required,
  submitted,
}: {
  state: GameState;
  required: NightActionKey[];
  submitted: Set<NightActionKey>;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-1">
      {required.map((k) => (
        <span
          key={k}
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
            submitted.has(k)
              ? "border-accent/60 bg-accent/15 text-accent"
              : "border-border bg-background/40 text-muted-foreground"
          }`}
        >
          {keyLabel(k)} {submitted.has(k) ? "✓" : "…"}
        </span>
      ))}
    </div>
  );
}
function keyLabel(k: NightActionKey) {
  return (
    {
      mafiaKill: "Mafia",
      barmanBlock: "Barman",
      detectiveCheck: "Detective",
      doctorSave: "Doctor",
      guardProtect: "Guard",
      vigilanteKill: "Vigilante",
    } as Record<NightActionKey, string>
  )[k];
}

// ===================================================================
// DAY REVEAL
// ===================================================================
function DayRevealView({
  state,
  me,
  onContinue,
  onLeave,
}: {
  state: GameState;
  me: Player | null;
  clientId: string;
  onContinue: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Scene>
      <TopBar code="" state={state} onLeave={onLeave} />
      <div className="text-center mb-6">
        <div className="text-3xl mb-2">☀️</div>
        <h2 className="font-display text-3xl text-blood-glow">
          {t("day.title", { n: state.dayNumber })}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">{t("day.dawn")}</p>
      </div>

      {state.lastDeaths.length === 0 ? (
        <div className="card-occult rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">🌅</div>
          <div className="font-display text-xl text-foreground">
            {t("day.peaceful")}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {state.lastDeaths.map((d) => {
            const p = state.players.find((x) => x.id === d.id);
            const def = ROLES[d.role];
            return (
              <div
                key={d.id}
                className="card-occult rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="text-4xl">{def.emoji}</div>
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-primary flex items-center gap-1">
                    <Skull className="size-3" /> {t("day.killed")}
                  </div>
                  <div className="font-display text-xl text-foreground">
                    {p?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("day.wasRole", { role: t(`roles.${d.role}.name`) })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!me || !me.alive}
        className="btn-blood w-full mt-6 rounded-xl py-4 font-display tracking-wider"
      >
        {t("day.discuss")}
      </button>
    </Scene>
  );
}

// ===================================================================
// DAY VOTE
// ===================================================================
function DayVoteView({
  state,
  me,
  onVote,
  onLeave,
}: {
  state: GameState;
  me: Player | null;
  onVote: (id: string) => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const alive = aliveOf(state);
  const myVote = me ? state.votes?.[me.id] : undefined;
  const votedCount = Object.keys(state.votes ?? {}).length;
  return (
    <Scene>
      <TopBar code="" state={state} onLeave={onLeave} />
      <div className="text-center mb-4">
        <Vote className="size-8 inline text-accent" />
        <h2 className="font-display text-2xl text-blood-glow mt-2">
          {t("day.voteTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t("day.voteHint")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("day.waitVotes", { done: votedCount, total: alive.length })}
        </p>
      </div>

      {!me || !me.alive ? (
        <Hint text={t("night.dead")} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto p-1">
            {alive
              .filter((p) => p.id !== me.id)
              .map((p) => {
                const isSel = myVote === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onVote(p.id)}
                    className={`rounded-xl px-3 py-3 border text-left transition ${
                      isSel
                        ? "border-primary bg-primary/15 animate-pulse-glow"
                        : "border-border bg-card hover:bg-primary/10 hover:border-primary/60"
                    }`}
                  >
                    <div className="text-foreground truncate">{p.name}</div>
                  </button>
                );
              })}
          </div>
          <button
            onClick={() => onVote("abstain")}
            className={`mt-3 w-full btn-ghost-blood rounded-xl py-2 text-sm ${
              myVote === "abstain" ? "bg-primary/10 border-primary" : ""
            }`}
          >
            {t("day.abstain")}
          </button>
        </>
      )}
    </Scene>
  );
}

// ===================================================================
// DAY RESULT
// ===================================================================
function DayResultView({
  state,
  onContinue,
  onLeave,
}: {
  state: GameState;
  onContinue: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const e = state.lastEliminated;
  const def = e ? ROLES[e.role] : null;
  const elim = e ? state.players.find((p) => p.id === e.id) : null;
  return (
    <Scene>
      <TopBar code="" state={state} onLeave={onLeave} />
      <div className="text-center mb-4">
        <Vote className="size-8 inline text-accent" />
        <h2 className="font-display text-2xl text-blood-glow mt-2">
          {t("day.eliminated")}
        </h2>
      </div>
      {e && def && elim ? (
        <div className="card-occult rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">{def.emoji}</div>
          <div className="font-display text-2xl text-foreground mt-1">
            {elim.name}
          </div>
          <div
            className={`mt-2 text-sm ${
              def.faction === "mafia" ? "text-primary" : "text-accent"
            }`}
          >
            {t("day.wasRole", { role: t(`roles.${e.role}.name`) })}
          </div>
        </div>
      ) : (
        <div className="card-occult rounded-2xl p-6 text-center text-muted-foreground">
          {t("day.noElim")}
        </div>
      )}
      <button
        onClick={onContinue}
        className="btn-blood w-full mt-6 rounded-xl py-4 font-display tracking-wider"
      >
        {t("day.nextNight")}
      </button>
    </Scene>
  );
}

// ===================================================================
// GAME OVER
// ===================================================================
function GameOverView({
  state,
  onPlayAgain,
}: {
  state: GameState;
  onPlayAgain: () => void;
}) {
  const { t } = useTranslation();
  const townWin = state.winner === "town";
  return (
    <Scene>
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
          {t("end.victory")}
        </div>
        <h2
          className={`font-display text-4xl mt-2 ${
            townWin ? "text-accent" : "text-blood-glow"
          }`}
        >
          {townWin ? t("end.townWin") : t("end.mafiaWin")}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">
          {townWin ? t("end.townDesc") : t("end.mafiaDesc")}
        </p>

        <div className="mt-6 text-left">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {t("end.allRoles")}
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
                        r.faction === "mafia" ? "text-primary" : "text-accent"
                      }`}
                    >
                      {t(`roles.${p.role}.name`)}
                    </div>
                  </div>
                  {!p.alive && (
                    <Skull className="size-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="btn-blood w-full mt-6 rounded-xl py-3 font-display tracking-wider"
        >
          {t("end.playAgain")}
        </button>
      </motion.div>
    </Scene>
  );
}

// ===================================================================
// Shared chrome
// ===================================================================
function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-blood-scene flex items-center justify-center p-4">
      <div className="card-occult rounded-2xl p-8 text-center max-w-sm w-full">
        {children}
      </div>
    </div>
  );
}

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-blood-scene px-4 py-8">
      <div className="mx-auto max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TopBar({
  code,
  state,
  onLeave,
}: {
  code: string;
  state: GameState;
  onLeave: () => void;
}) {
  const alive = state.players.filter((p) => p.alive).length;
  const mafia = state.players.filter(
    (p) => p.alive && (p.role === "mafia" || p.role === "barman"),
  ).length;
  const isNight = state.phase === "night" || state.phase === "reveal";
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 px-1">
      <div className="flex items-center gap-2">
        {isNight ? (
          <Moon className="size-3 text-accent" />
        ) : (
          <Sun className="size-3 text-accent" />
        )}
        {code && (
          <span className="font-mono tracking-widest text-foreground">
            {code.toUpperCase()}
          </span>
        )}
        {state.phase !== "lobby" && state.phase !== "reveal" && (
          <span className="uppercase tracking-widest">· {state.dayNumber}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {state.phase !== "lobby" && state.phase !== "reveal" && (
          <>
            <span>{alive}</span>
            <span className="text-primary/80">· {mafia}</span>
          </>
        )}
        <button
          onClick={onLeave}
          className="ml-2 size-7 rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary transition flex items-center justify-center"
          aria-label="leave"
        >
          <LogOut className="size-3" />
        </button>
      </div>
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <div className="card-occult rounded-2xl p-6 text-center">
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

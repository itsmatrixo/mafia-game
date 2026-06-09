import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home } from "@/components/mafia/Home";
import "@/lib/i18n";
import { applyDirFromCurrent } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blood Moon — Mafia / Werewolf Online Party Game" },
      {
        name: "description",
        content:
          "Online Mafia/Werewolf party game with room codes for 6–30 players. Auto-moderator, beautiful card UI, 5 languages including Moroccan Darija.",
      },
      { property: "og:title", content: "Blood Moon — Mafia Party Game" },
      {
        property: "og:description",
        content:
          "Create a room, share the code, play from any phone. Auto-moderator runs the night.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  useEffect(() => {
    applyDirFromCurrent();
  }, []);
  return <Home />;
}

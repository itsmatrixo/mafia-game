import { createFileRoute } from "@tanstack/react-router";
import { Room } from "@/components/mafia/Room";
import "@/lib/i18n";

export const Route = createFileRoute("/room/$code")({
  head: () => ({
    meta: [{ title: "Room — Blood Moon" }],
  }),
  component: RoomPage,
  ssr: false,
});

function RoomPage() {
  const { code } = Route.useParams();
  return <Room code={code} />;
}

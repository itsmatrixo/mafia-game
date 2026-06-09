import { createFileRoute } from "@tanstack/react-router";
import { HostSetup } from "@/components/mafia/HostSetup";
import "@/lib/i18n";

export const Route = createFileRoute("/host")({
  head: () => ({
    meta: [{ title: "Host a Room — Blood Moon" }],
  }),
  component: HostPage,
  ssr: false,
});

function HostPage() {
  return <HostSetup />;
}

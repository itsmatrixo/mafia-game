import { useTranslation } from "react-i18next";
import { LANGS, setLanguage, type LangCode } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as LangCode;
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "justify-center"}`}>
      <Globe className="size-4 text-muted-foreground" />
      <div className="flex gap-1 flex-wrap">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={`px-2 py-1 rounded-md text-xs border transition ${
              current === l.code
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
            }`}
            aria-label={l.label}
          >
            <span className="mr-1">{l.flag}</span>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

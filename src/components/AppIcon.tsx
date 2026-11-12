import type { App } from "../../shared/apps";
import { APP_ICONS } from "../icons";

export function AppIcon({ app, size = "md", down = false }: { app: App; size?: "sm" | "md"; down?: boolean }) {
  const Icon = APP_ICONS[app.icon];
  return (
    <span class="shortcut-wrap">
      <span class={`app-icon${size === "sm" ? " sm" : ""}${app.hue === 0 ? " mono" : ""}`} style={{ "--h": app.hue }}>
        {Icon ? <Icon size={size === "sm" ? 18 : 24} strokeWidth={1.75} /> : app.name[0]}
      </span>
      {down && <span class="down-dot" title="Injoignable" />}
    </span>
  );
}

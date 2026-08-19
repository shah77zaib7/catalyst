import {
  Bell,
  Bitcoin,
  Calendar,
  Coins,
  LayoutDashboard,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type AppPath =
  | "/dashboard"
  | "/catalysts"
  | "/events"
  | "/gold"
  | "/crypto"
  | "/alerts"
  | "/settings";

export type NavItem = {
  to: AppPath;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/catalysts", label: "Catalysts", icon: Zap },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/gold", label: "Gold", icon: Coins },
  { to: "/crypto", label: "Crypto", icon: Bitcoin },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

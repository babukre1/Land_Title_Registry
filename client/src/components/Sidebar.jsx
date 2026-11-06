import { BarChart3, Building2, FileBadge, FileText, Gauge, LandPlot, MapPinned, Scale, Settings, Users, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const items = [
  { key: "dashboard", to: "/dashboard", icon: Gauge, roles: ["OWNER", "CLERK", "SURVEYOR", "REGISTRAR", "ADMIN"] },
  { key: "parcels", to: "/parcels", icon: LandPlot, roles: ["OWNER", "CLERK", "REGISTRAR", "ADMIN"] },
  { key: "registerParcel", to: "/parcels/new", icon: MapPinned, roles: ["CLERK"] },
  { key: "owners", to: "/owners", icon: Users, roles: ["CLERK", "REGISTRAR", "ADMIN"] },
  { key: "surveys", to: "/surveys", icon: FileText, roles: ["SURVEYOR", "CLERK", "REGISTRAR"] },
  { key: "pendingApprovals", to: "/registrations/pending", icon: FileBadge, roles: ["REGISTRAR"] },
  { key: "disputes", to: "/disputes", icon: Scale, roles: ["CLERK", "REGISTRAR"] },
  { key: "transfers", to: "#", icon: Building2, roles: ["OWNER", "CLERK", "REGISTRAR"], soon: true },
  { key: "certificates", to: "#", icon: FileBadge, roles: ["OWNER", "REGISTRAR"], soon: true },
  { key: "reports", to: "#", icon: BarChart3, roles: ["ADMIN", "REGISTRAR"], soon: true },
  { key: "users", to: "#", icon: Users, roles: ["ADMIN"], soon: true },
  { key: "settings", to: "#", icon: Settings, roles: ["ADMIN"], soon: true },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth(); const { t } = useLanguage();
  return <><div className={`fixed inset-0 z-40 bg-slate-950/50 lg:hidden ${open ? "block" : "hidden"}`} onClick={onClose} /><aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-blue-950 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-20 items-center justify-between border-b border-white/10 px-5"><div><p className="font-black">{t("appName")}</p><p className="text-xs text-blue-200">{t("appSubtitle")}</p></div><button className="lg:hidden" onClick={onClose}><X /></button></div><nav className="space-y-1 p-4">{items.filter((item) => item.roles.includes(user.role)).map(({ key, to, icon: Icon, soon }) => soon ? <div key={key} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-blue-300"><Icon size={19} /><span>{t(key)}</span><span className="ml-auto text-[10px] uppercase">{t("comingSoon")}</span></div> : <NavLink key={key} to={to} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium ${isActive ? "bg-emerald-600 text-white" : "text-blue-100 hover:bg-white/10"}`}><Icon size={19} />{t(key)}</NavLink>)}</nav></aside></>;
}

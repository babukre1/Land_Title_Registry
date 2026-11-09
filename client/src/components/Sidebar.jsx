import { BarChart3, Building2, FileBadge, FileText, Gauge, LandPlot, Layers3, MapPinned, Scale, Search, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const groups = [
  { label: "Main", items: [
    { key: "dashboard", to: "/dashboard", icon: Gauge, roles: ["OWNER", "CLERK", "SURVEYOR", "REGISTRAR", "ADMIN"] },
    { key: "parcels", to: "/parcels", icon: LandPlot, roles: ["OWNER", "CLERK", "REGISTRAR", "ADMIN"] },
    { key: "myParcels", to: "/my-parcels", icon: LandPlot, roles: ["OWNER"] },
    { key: "owners", to: "/owners", icon: Users, roles: ["CLERK", "REGISTRAR", "ADMIN"] },
    { key: "certificates", to: "/certificates", icon: FileBadge, roles: ["OWNER", "CLERK", "REGISTRAR", "ADMIN"] },
  ] },
  { label: "Operations", items: [
    { key: "registerParcel", to: "/parcels/new", icon: MapPinned, roles: ["CLERK"] },
    { key: "surveys", to: "/surveys", icon: FileText, roles: ["SURVEYOR", "CLERK", "REGISTRAR"] },
    { key: "pendingApprovals", to: "/registrations/pending", icon: FileBadge, roles: ["REGISTRAR"] },
    { key: "disputes", to: "/disputes", icon: Scale, roles: ["CLERK", "REGISTRAR"] },
    { key: "myTransfers", to: "/my-transfers", icon: Building2, roles: ["OWNER"] },
    { key: "transfers", to: "/transfers", icon: Building2, roles: ["CLERK", "REGISTRAR", "ADMIN"] },
  ] },
  { label: "Insights", items: [{ key: "reports", to: "#", icon: BarChart3, roles: ["ADMIN", "REGISTRAR"], soon: true }] },
  { label: "System", items: [
    { key: "users", to: "/admin", icon: Users, roles: ["ADMIN"] },
    { key: "settings", to: "/admin", icon: Settings, roles: ["ADMIN"] },
  ] },
];

/** Role-aware navigation with mobile dismissal and a compact local filter. */
export default function Sidebar({ open, onClose }) {
  const { user } = useAuth(); const { t } = useLanguage(); const [query, setQuery] = useState("");
  const initials = user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <><button aria-label="Close navigation" className={`fixed inset-0 z-40 bg-slate-950/40 lg:hidden ${open ? "block" : "hidden"}`} onClick={onClose} /><aside className={`fixed inset-y-0 left-0 z-50 flex w-[246px] flex-col border-r border-[#e5e7ed] bg-[#fafafb] text-[#11172d] transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
    <div className="flex h-[70px] items-center gap-3 border-b border-[#e5e7ed] px-5"><Layers3 size={27} strokeWidth={1.8} /><div className="min-w-0"><p className="truncate text-sm font-extrabold">{t("appName")}</p><p className="truncate text-[11px] text-[#647084]">{t("appSubtitle")}</p></div><button aria-label="Close navigation" className="ml-auto rounded-md p-1.5 hover:bg-[#eeebff] lg:hidden" onClick={onClose}><X size={19} /></button></div>
    <div className="p-4 pb-2"><label className="relative block"><Search className="absolute left-3 top-2.5 text-[#8d98aa]" size={15} /><span className="sr-only">Search navigation</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="ui-input pl-9 pr-3" placeholder="Search…" /></label></div>
    <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">{groups.map((group) => { const visible = group.items.filter((item) => item.roles.includes(user.role) && t(item.key).toLowerCase().includes(query.toLowerCase())); if (!visible.length) return null; return <section key={group.label} className="mt-4"><p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#8d98aa]">{group.label}</p><div className="space-y-1">{visible.map(({ key, to, icon: Icon, soon }) => soon ? <div key={key} className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] text-[#8d98aa]"><Icon size={17} />{t(key)}<span className="ml-auto text-[9px] uppercase">{t("comingSoon")}</span></div> : <NavLink key={key} to={to} end={to === "/dashboard"} onClick={onClose} className={({ isActive }) => `relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-[#eeebff] font-bold text-[#4935ca] before:absolute before:-left-3 before:h-6 before:w-[3px] before:rounded-r before:bg-[#4935ca]" : "text-[#263249] hover:bg-[#f1f2f6]"}`}><Icon size={17} />{t(key)}</NavLink>)}</div></section>; })}</nav>
    <div className="m-3 flex items-center gap-3 border-t border-[#e5e7ed] px-1 pt-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eeebff] text-[11px] font-bold text-[#4935ca]">{initials}</span><div className="min-w-0"><p className="truncate text-xs font-bold">{user.fullName}</p><p className="text-[11px] capitalize text-[#647084]">{user.role.toLowerCase()}</p></div></div>
  </aside></>;
}

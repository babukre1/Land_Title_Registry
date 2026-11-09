import { Languages, LogOut, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const routeLabels = { dashboard: "Dashboard", parcels: "Parcels", owners: "Owners", certificates: "Certificates", transfers: "Transfers", surveys: "Surveys", disputes: "Disputes", registrations: "Registrations", admin: "Administration", "my-parcels": "My parcels", "my-transfers": "My transfers" };

/** Top utility bar showing the current registry area and supported controls. */
export default function Header({ onMenu }) {
  const { signOut } = useAuth(); const { language, setLanguage, t } = useLanguage(); const location = useLocation();
  const segment = location.pathname.split("/").filter(Boolean)[0] || "dashboard"; const area = routeLabels[segment] || "Registry";
  return <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#e5e7ed] bg-white px-4 sm:px-6 lg:px-[30px]"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="rounded-lg p-2 text-[#647084] hover:bg-[#eeebff] lg:hidden" onClick={onMenu}><Menu size={20} /></button><p className="text-xs text-[#647084]"><span className="hidden sm:inline">Registry&nbsp;&nbsp;›&nbsp;&nbsp;</span><strong className="text-[#263249]">{area}</strong></p></div><div className="flex items-center gap-2"><label className="flex min-h-9 items-center gap-2 rounded-lg border border-[#d8dbe5] bg-white px-2 text-xs text-[#647084]"><Languages size={15} /><span className="sr-only">{t("language")}</span><select className="bg-transparent pr-1 outline-none" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="so">Soomaali</option></select></label><button aria-label={t("logout")} title={t("logout")} onClick={signOut} className="grid size-9 place-items-center rounded-lg border border-[#d8dbe5] text-[#647084] hover:border-[#4935ca] hover:text-[#4935ca]"><LogOut size={17} /></button></div></header>;
}

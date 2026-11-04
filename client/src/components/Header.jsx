import { Languages, LogOut, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Header({ title, onMenu }) {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onMenu}><Menu /></button><h1 className="font-bold text-blue-950">{title}</h1></div><div className="flex items-center gap-2 sm:gap-4"><label className="flex items-center gap-2 text-sm text-slate-600"><Languages size={18} /><span className="sr-only">{t("language")}</span><select className="rounded-lg border border-slate-300 bg-white px-2 py-1.5" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="so">Soomaali</option></select></label><div className="hidden text-right sm:block"><p className="text-sm font-bold text-slate-800">{user.fullName}</p><p className="text-xs text-slate-500">{user.role}</p></div><button aria-label={t("logout")} onClick={signOut} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><LogOut size={20} /></button></div></header>;
}

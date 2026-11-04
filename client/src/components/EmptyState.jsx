import { Inbox } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function EmptyState({ title, description }) {
  const { t } = useLanguage();
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"><Inbox className="mx-auto text-slate-400" /><h3 className="mt-3 font-bold text-slate-800">{title || t("noResults")}</h3>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>;
}

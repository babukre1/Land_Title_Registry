import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ErrorMessage({ message, onRetry }) {
  const { t } = useLanguage();
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"><div className="flex gap-3"><AlertTriangle className="shrink-0" size={20} /><p>{message}</p></div>{onRetry && <button className="mt-3 text-sm font-bold underline" onClick={onRetry}>{t("retry")}</button>}</div>;
}

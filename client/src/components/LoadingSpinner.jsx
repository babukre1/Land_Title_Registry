import { LoaderCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function LoadingSpinner({ label }) {
  const { t } = useLanguage();
  return <div className="flex items-center justify-center gap-3 py-12 text-slate-500"><LoaderCircle className="animate-spin" size={22} /><span>{label || t("loading")}</span></div>;
}

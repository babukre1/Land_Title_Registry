import { Download, FileBadge, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { certificateApi } from "../services/registryService.js";

export default function CertificatesPage() {
  const { language, t } = useLanguage(); const [items, setItems] = useState(null); const [error, setError] = useState(""); const [query, setQuery] = useState("");
  useEffect(() => { certificateApi.list().then(setItems).catch((e) => setError(e.response?.data?.message || t("loadCertificatesError"))); }, [t]);
  const filtered = useMemo(() => items?.filter((item) => `${item.certificateNumber} ${item.parcel.parcelNumber}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  return <><PageHeader title={t("certificates")} description={t("certificateListDescription")} />{error && <ErrorMessage message={error} />}{!items && !error ? <LoadingSpinner /> : items && <><label className="mb-5 flex max-w-xl items-center gap-2 rounded-xl border bg-white px-3"><Search size={18} className="text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchCertificates")} className="w-full py-3 outline-none" /></label>{filtered.length === 0 ? <EmptyState /> : <div className="grid gap-4">{filtered.map((certificate) => <article key={certificate.id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-5"><FileBadge className="text-blue-900" /><div className="min-w-60 flex-1"><Link to={`/certificates/${certificate.id}`} className="font-black text-blue-950">{certificate.certificateNumber}</Link><p className="text-sm text-slate-500">{certificate.parcel.parcelNumber} · {new Date(certificate.issuedAt).toLocaleDateString(language)}</p></div><StatusBadge status={certificate.status} /><button onClick={() => certificateApi.download(certificate.id, language)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"><Download size={17} />{t("download")}</button></article>)}</div>}</>}</>;
}

import { Download, FileBadge, FileText, Layers3, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import FilterBar from "../components/FilterBar.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { certificateApi } from "../services/registryService.js";

/** Current and historical immutable title certificate directory. */
export default function CertificatesPage() {
  const { language, t } = useLanguage(); const [items, setItems] = useState(null); const [error, setError] = useState(""); const [query, setQuery] = useState(""); const [status, setStatus] = useState("");
  useEffect(() => { certificateApi.list().then(setItems).catch((requestError) => setError(requestError.response?.data?.message || t("loadCertificatesError"))); }, [t]);
  const filtered = useMemo(() => items?.filter((item) => (!status || item.status === status) && `${item.certificateNumber} ${item.parcel.parcelNumber}`.toLowerCase().includes(query.toLowerCase())), [items, query, status]);
  return <><PageHeader title={t("certificates")} description="Access current and historical land title certificates." />{items && <><div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={FileBadge} value={items.length} label="Certificates" /><StatCard icon={ShieldCheck} value={items.filter((item) => item.status === "CURRENT").length} label="Current" /><StatCard icon={FileText} value={items.filter((item) => item.status === "SUPERSEDED").length} label="Superseded" /><StatCard icon={Layers3} value={new Set(items.map((item) => item.parcel.parcelNumber)).size} label="Associated parcels" /></div><div className="mb-4 rounded-lg border border-[#dcd6ff] bg-[#f7f5ff] px-4 py-3 text-xs text-[#51458f]">Historical certificates remain available for audit. Only the latest valid certificate is marked Current.</div></>}
    {error && <ErrorMessage message={error} />}{!items && !error ? <LoadingSpinner /> : items && <><FilterBar onSubmit={(event) => event.preventDefault()}><label className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-2.5 text-[#8d98aa]" size={16} /><span className="sr-only">Search certificates</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchCertificates")} className="ui-input pl-9" /></label><select aria-label="Certificate status" value={status} onChange={(event) => setStatus(event.target.value)} className="ui-input w-auto min-w-[160px]"><option value="">All statuses</option><option value="CURRENT">Current</option><option value="SUPERSEDED">Superseded</option></select></FilterBar>{filtered.length === 0 ? <EmptyState /> : <section className="ui-card overflow-hidden"><div className="overflow-x-auto"><table className="ui-table"><thead><tr><th>Certificate number</th><th>Related parcel</th><th>Issue date</th><th>Status</th><th>Document</th></tr></thead><tbody>{filtered.map((certificate) => <tr key={certificate.id}><td><Link to={`/certificates/${certificate.id}`} className="ui-link">{certificate.certificateNumber}</Link></td><td className="font-semibold">{certificate.parcel.parcelNumber}</td><td>{new Date(certificate.issuedAt).toLocaleDateString(language)}</td><td><StatusBadge status={certificate.status} /></td><td><button onClick={() => certificateApi.download(certificate.id, language)} className="ui-link inline-flex items-center gap-2"><Download size={14} />Download PDF</button></td></tr>)}</tbody></table></div><div className="ui-table-footer">Showing {filtered.length} of {items.length} certificates</div></section>}</>}</>;
}

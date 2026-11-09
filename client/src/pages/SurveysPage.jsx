import { Clock3, FileText, Map, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import FilterBar from "../components/FilterBar.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { districtApi, surveyApi } from "../services/registryService.js";

/** Filterable survey-attempt queue preserving repeated parcel reviews. */
export default function SurveysPage() {
  const { t } = useLanguage(); const [result, setResult] = useState(null); const [filters, setFilters] = useState({ status: "", districtId: "", parcelNumber: "" }); const [districts, setDistricts] = useState([]); const [page, setPage] = useState(1); const [error, setError] = useState("");
  async function load(nextPage = page, nextFilters = filters) { setError(""); try { const [records, districtList] = await Promise.all([surveyApi.list({ page: nextPage, limit: 20, ...Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value)) }), districtApi.list()]); setResult(records); setDistricts(districtList); setPage(nextPage); } catch (requestError) { setError(requestError.response?.data?.message || t("loadSurveysError")); } }
  useEffect(() => { load(1); }, []);
  const surveys = result?.data || [];
  return <><PageHeader title={t("surveyQueue")} description={t("surveyQueueDescription")} />{result && <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={FileText} value={result.pagination.total} label="Survey attempts" /><StatCard icon={ShieldCheck} value={surveys.filter((item) => item.status === "VERIFIED").length} label="Verified on this page" /><StatCard icon={Clock3} value={surveys.filter((item) => ["PENDING", "IN_PROGRESS"].includes(item.status)).length} label="Pending on this page" /><StatCard icon={Map} value={new Set(surveys.map((item) => item.parcel.district.id)).size} label="Districts on this page" /></div>}
    <FilterBar onSubmit={(event) => { event.preventDefault(); load(1); }}><label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-2.5 text-[#8d98aa]" size={16} /><span className="sr-only">Parcel number</span><input className="ui-input pl-9" value={filters.parcelNumber} onChange={(event) => setFilters({ ...filters, parcelNumber: event.target.value })} placeholder="Search by parcel number" /></label><select className="ui-input w-auto min-w-[160px]" aria-label="Survey status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">{t("allStatuses")}</option>{["PENDING", "IN_PROGRESS", "VERIFIED", "CANNOT_VERIFY"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><select className="ui-input w-auto min-w-[160px]" aria-label="District" value={filters.districtId} onChange={(event) => setFilters({ ...filters, districtId: event.target.value })}><option value="">All districts</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select><button className="ui-button-primary"><Search size={15} />Search</button></FilterBar>
    {error && <ErrorMessage message={error} onRetry={() => load(page)} />}{!result && !error ? <LoadingSpinner /> : result?.data.length === 0 ? <EmptyState title={t("noSurveys")} /> : result && <section className="ui-card overflow-hidden"><div className="overflow-x-auto"><table className="ui-table"><thead><tr><th>{t("parcelNumber")}</th><th>{t("district")}</th><th>{t("area")}</th><th>{t("created")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{surveys.map((survey) => <tr key={survey.id}><td><Link className="ui-link" to={`/surveys/${survey.id}`}>{survey.parcel.parcelNumber}</Link></td><td>{survey.parcel.district.name}</td><td>{Number(survey.parcel.areaM2).toLocaleString()} m²</td><td>{new Date(survey.createdAt).toLocaleDateString()}</td><td><StatusBadge status={survey.status} /></td><td><Link className="ui-link" to={`/surveys/${survey.id}`}>{t("review")} →</Link></td></tr>)}</tbody></table></div><Pagination pagination={result.pagination} onPage={load} /></section>}
  </>;
}

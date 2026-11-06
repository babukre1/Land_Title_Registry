import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { surveyApi } from "../services/registryService.js";

export default function SurveysPage() {
  const { t } = useLanguage(); const [result, setResult] = useState(null); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  useEffect(() => { setResult(null); surveyApi.list({ status: status || undefined }).then(setResult).catch((e) => setError(e.response?.data?.message || t("loadSurveysError"))); }, [status, t]);
  return <><PageHeader title={t("surveyQueue")} description={t("surveyQueueDescription")} /><select className="mb-5 rounded-xl border border-slate-300 bg-white px-4 py-2" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("allStatuses")}</option>{["PENDING","IN_PROGRESS","VERIFIED","CANNOT_VERIFY"].map((item) => <option key={item}>{item}</option>)}</select>{error && <ErrorMessage message={error} />}{!result ? <LoadingSpinner /> : result.data.length === 0 ? <EmptyState title={t("noSurveys")} /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{[t("parcelNumber"),t("district"),t("area"),t("created"),t("status"),t("actions")].map((x) => <th key={x} className="p-4">{x}</th>)}</tr></thead><tbody>{result.data.map((survey) => <tr key={survey.id} className="border-t"><td className="p-4 font-bold">{survey.parcel.parcelNumber}</td><td className="p-4">{survey.parcel.district.name}</td><td className="p-4">{Number(survey.parcel.areaM2).toLocaleString()} m²</td><td className="p-4">{new Date(survey.createdAt).toLocaleDateString()}</td><td className="p-4"><StatusBadge status={survey.status} /></td><td className="p-4"><Link className="font-bold text-blue-700" to={`/surveys/${survey.id}`}>{t("review")}</Link></td></tr>)}</tbody></table></div>}</>;
}

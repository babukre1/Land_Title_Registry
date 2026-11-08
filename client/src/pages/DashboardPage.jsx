import { AlertTriangle, FileBadge, LandPlot, MapPinned, Scale, Users } from "lucide-react";
import { useEffect, useState } from "react";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { dashboardApi } from "../services/registryService.js";

const icons = { registeredParcels: LandPlot, pendingSurveys: MapPinned, owners: Users, openDisputes: Scale, users: Users, districts: MapPinned, totalParcels: LandPlot, ownedParcels: LandPlot, pendingTransfers: AlertTriangle, currentCertificates: FileBadge, verifiedSurveys: MapPinned, returnedSurveys: AlertTriangle };

export default function DashboardPage() {
  const { user } = useAuth(); const { t } = useLanguage(); const [data, setData] = useState(null); const [error, setError] = useState("");
  async function load() { setError(""); try { setData(await dashboardApi.summary()); } catch (requestError) { setError(requestError.response?.data?.message || requestError.userMessage || "Unable to load dashboard."); } }
  useEffect(() => { load(); }, []);
  const stats = data ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== "analytics")) : {};
  return <><PageHeader title={`${t("welcome")}, ${user.fullName}`} description={`${t("registryOverview")} · ${user.role}`} />{error && <ErrorMessage message={error} onRetry={load} />}{!data && !error ? <LoadingSpinner /> : data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(stats).map(([key, value], index) => <StatCard key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())} value={value} icon={icons[key] || LandPlot} tone={["navy", "emerald", "amber", "red"][index % 4]} />)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><BarChart title="Parcels by status" rows={data.analytics.parcelsByStatus} /><BarChart title="Parcels by district" rows={data.analytics.parcelsByDistrict} /></div></>}</>;
}

function BarChart({ title, rows }) {
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return <section className="rounded-2xl border bg-white p-6"><h2 className="font-black text-blue-950">{title}</h2><div className="mt-5 space-y-3">{rows.length === 0 ? <p className="text-slate-500">No data</p> : rows.map((row) => <div key={row.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-sm"><span className="truncate" title={row.label}>{row.label.replaceAll("_", " ")}</span><div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(row.value / maximum) * 100}%` }} /></div><strong>{row.value}</strong></div>)}</div></section>;
}

import { AlertTriangle, FileBadge, LandPlot, MapPinned, Scale, Users } from "lucide-react";
import { useEffect, useState } from "react";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { dashboardApi } from "../services/registryService.js";

const icons = { registeredParcels: LandPlot, pendingSurveys: MapPinned, owners: Users, openDisputes: Scale, users: Users, roles: Users, districts: MapPinned, feeSettings: AlertTriangle, totalParcels: LandPlot, ownedParcels: LandPlot, ownershipShares: Users, pendingTransfers: AlertTriangle, currentCertificates: FileBadge, inProgressSurveys: MapPinned, verifiedSurveys: MapPinned, returnedSurveys: AlertTriangle, pendingRegistrations: MapPinned, registrationTasks: FileBadge, pendingRegistrationApprovals: FileBadge, pendingTransferApprovals: AlertTriangle, activeEncumbrances: Scale, certificateIssuanceTasks: FileBadge };

export default function DashboardPage() {
  const { user } = useAuth(); const { t } = useLanguage(); const [data, setData] = useState(null); const [error, setError] = useState("");
  async function load() { setError(""); try { setData(await dashboardApi.summary()); } catch (requestError) { setError(requestError.response?.data?.message || requestError.userMessage || "Unable to load dashboard."); } }
  useEffect(() => { load(); }, []);
  const stats = data ? Object.fromEntries(Object.entries(data).filter(([key]) => !["analytics", "recentActivity"].includes(key))) : {};
  return <><PageHeader title={`${t("welcome")}, ${user.fullName}`} description={`${t("registryOverview")} · ${user.role}`} />{error && <ErrorMessage message={error} onRetry={load} />}{!data && !error ? <LoadingSpinner /> : data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(stats).map(([key, value], index) => <StatCard key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())} value={value} icon={icons[key] || LandPlot} tone={["navy", "emerald", "amber", "red"][index % 4]} />)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><BarChart title="Parcels by status" rows={data.analytics.parcelsByStatus} /><BarChart title="Parcels by district" rows={data.analytics.parcelsByDistrict} /></div>{data.recentActivity?.length > 0 && <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="font-black text-blue-950">Recent activity</h2><ol className="mt-4 space-y-3">{data.recentActivity.map((item) => <li key={item.id} className="border-l-2 border-emerald-300 pl-4 text-sm"><strong>{(item.action || item.eventType).replaceAll("_", " ")}</strong><p className="text-slate-500">{item.parcel?.parcelNumber || item.user?.fullName || "System"} · {new Date(item.createdAt || item.effectiveAt).toLocaleString()}</p></li>)}</ol></section>}</>}</>;
}

function BarChart({ title, rows }) {
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return <section className="rounded-2xl border bg-white p-6"><h2 className="font-black text-blue-950">{title}</h2><div className="mt-5 space-y-3">{rows.length === 0 ? <p className="text-slate-500">No data</p> : rows.map((row) => <div key={row.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-sm"><span className="truncate" title={row.label}>{row.label.replaceAll("_", " ")}</span><div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(row.value / maximum) * 100}%` }} /></div><strong>{row.value}</strong></div>)}</div></section>;
}

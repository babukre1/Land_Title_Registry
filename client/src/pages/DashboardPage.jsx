import { AlertTriangle, FileBadge, LandPlot, MapPinned, Scale, Users } from "lucide-react";
import { useEffect, useState } from "react";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SectionCard from "../components/SectionCard.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { dashboardApi } from "../services/registryService.js";

const icons = { registeredParcels: LandPlot, pendingSurveys: MapPinned, owners: Users, openDisputes: Scale, users: Users, roles: Users, districts: MapPinned, feeSettings: AlertTriangle, totalParcels: LandPlot, ownedParcels: LandPlot, ownershipShares: Users, pendingTransfers: AlertTriangle, currentCertificates: FileBadge, inProgressSurveys: MapPinned, verifiedSurveys: MapPinned, returnedSurveys: AlertTriangle, pendingRegistrations: MapPinned, registrationTasks: FileBadge, pendingRegistrationApprovals: FileBadge, pendingTransferApprovals: AlertTriangle, activeEncumbrances: Scale, certificateIssuanceTasks: FileBadge };
const labelFor = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

/** Role-specific real-time registry summary and recent audit activity. */
export default function DashboardPage() {
  const { user } = useAuth(); const { t } = useLanguage(); const [data, setData] = useState(null); const [error, setError] = useState("");
  async function load() { setError(""); try { setData(await dashboardApi.summary()); } catch (requestError) { setError(requestError.response?.data?.message || requestError.userMessage || "Unable to load dashboard."); } }
  useEffect(() => { load(); }, []);
  const stats = data ? Object.fromEntries(Object.entries(data).filter(([key]) => !["analytics", "recentActivity"].includes(key))) : {};
  return <><PageHeader title={`${t("welcome")}, ${user.fullName}`} description={`${t("registryOverview")} · ${user.role.toLowerCase()}`} />{error && <ErrorMessage message={error} onRetry={load} />}{!data && !error ? <LoadingSpinner /> : data && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(stats).map(([key, value]) => <StatCard key={key} label={labelFor(key)} value={value} icon={icons[key] || LandPlot} />)}</div><div className="mt-4 grid gap-4 lg:grid-cols-2"><BarChart title="Parcels by status" rows={data.analytics.parcelsByStatus} /><BarChart title="Parcels by district" rows={data.analytics.parcelsByDistrict} /></div><SectionCard title="Recent activity" className="mt-4">{data.recentActivity?.length ? <ol className="divide-y divide-[#e5e7ed]">{data.recentActivity.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><strong className="text-xs text-[#11172d]">{(item.action || item.eventType).replaceAll("_", " ")}</strong><p className="mt-1 text-xs text-[#647084]">{item.parcel?.parcelNumber || item.user?.fullName || "System"}</p></div><time className="whitespace-nowrap text-[11px] text-[#8d98aa]">{new Date(item.createdAt || item.effectiveAt).toLocaleString()}</time></li>)}</ol> : <p className="text-sm text-[#647084]">No recent activity.</p>}</SectionCard></>}</>;
}

/** Compact proportional bar list without decorative chart dependencies. */
function BarChart({ title, rows }) {
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return <SectionCard title={title}>{rows.length === 0 ? <p className="text-sm text-[#647084]">No data</p> : <div className="space-y-4">{rows.map((row) => <div key={row.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-xs"><span className="truncate" title={row.label}>{row.label.replaceAll("_", " ")}</span><div className="h-2 overflow-hidden rounded-full bg-[#eef0f4]"><div className="h-full rounded-full bg-[#4935ca]" style={{ width: `${(row.value / maximum) * 100}%` }} /></div><strong>{row.value}</strong></div>)}</div>}</SectionCard>;
}

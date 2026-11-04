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
  return <><PageHeader title={`${t("welcome")}, ${user.fullName}`} description={`${t("registryOverview")} · ${user.role}`} />{error && <ErrorMessage message={error} onRetry={load} />}{!data && !error ? <LoadingSpinner /> : data && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(data).map(([key, value], index) => <StatCard key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())} value={value} icon={icons[key] || LandPlot} tone={["navy", "emerald", "amber", "red"][index % 4]} />)}</div>}</>;
}

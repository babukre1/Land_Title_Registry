import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { ownerApi } from "../services/registryService.js";

export default function OwnersPage() {
  const { user } = useAuth(); const { t } = useLanguage(); const [q, setQ] = useState(""); const [result, setResult] = useState(null); const [error, setError] = useState("");
  async function load(search = q) { setError(""); try { setResult(await ownerApi.list({ q: search, limit: 50 })); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load owners."); } }
  useEffect(() => { load(""); }, []);
  return <><PageHeader title={t("owners")} description="People and companies recorded in the land registry." action={user.role === "CLERK" && <Link to="/owners/new" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white"><Plus size={18} />{t("createOwner")}</Link>} /><form className="mb-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); load(); }}><div className="relative max-w-xl flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, identity or registration number" /></div><button className="rounded-xl bg-blue-950 px-5 font-bold text-white">{t("search")}</button></form>{error && <ErrorMessage message={error} onRetry={() => load()} />}{!result && !error ? <LoadingSpinner /> : result?.data.length === 0 ? <EmptyState /> : result && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left text-slate-600"><tr><th className="p-4">Name</th><th className="p-4">Type</th><th className="p-4">Identifier</th><th className="p-4">Contact</th><th className="p-4">{t("actions")}</th></tr></thead><tbody className="divide-y divide-slate-100">{result.data.map((owner) => <tr key={owner.id}><td className="p-4 font-bold text-blue-950">{owner.fullName || owner.companyName}</td><td className="p-4">{owner.ownerType}</td><td className="p-4">{owner.identityNumber || owner.registrationNumber}</td><td className="p-4">{owner.phone || owner.email || "—"}</td><td className="p-4"><Link className="font-bold text-emerald-700" to={`/owners/${owner.id}`}>{t("view")}</Link></td></tr>)}</tbody></table></div>}</>;
}

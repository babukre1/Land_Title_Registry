import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { disputeApi } from "../services/registryService.js";

export default function DisputesPage() {
  const [status, setStatus] = useState(""); const [result, setResult] = useState(null); const [error, setError] = useState("");
  async function load(nextStatus = status) { setError(""); try { setResult(await disputeApi.list(nextStatus ? { status: nextStatus } : {})); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load disputes."); } }
  useEffect(() => { load(""); }, []);
  return <><PageHeader title="Disputes" description="Overlap cases and their preserved proposed-boundary evidence." /><div className="mb-5"><select className="rounded-xl border border-slate-300 bg-white px-4 py-2.5" value={status} onChange={(event) => { setStatus(event.target.value); load(event.target.value); }}><option value="">All statuses</option><option>OPEN</option><option>UNDER_REVIEW</option><option>RESOLVED</option></select></div>{error && <ErrorMessage message={error} onRetry={() => load()} />}{!result && !error ? <LoadingSpinner /> : result?.data.length === 0 ? <EmptyState title="No disputes found" /> : result && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-4">Reference</th><th className="p-4">Status</th><th className="p-4">Conflicting parcels</th><th className="p-4">Opened</th><th className="p-4" /></tr></thead><tbody className="divide-y divide-slate-100">{result.data.map((dispute) => <tr key={dispute.id}><td className="p-4 font-bold text-blue-950">DIS-{String(dispute.id).padStart(5, "0")}</td><td className="p-4"><StatusBadge status={dispute.status} /></td><td className="p-4">{dispute.parcels.map(({ parcel }) => parcel.parcelNumber).join(", ") || "—"}</td><td className="p-4">{new Date(dispute.createdAt).toLocaleDateString()}</td><td className="p-4"><Link className="font-bold text-emerald-700" to={`/disputes/${dispute.id}`}>View</Link></td></tr>)}</tbody></table></div>}</>;
}

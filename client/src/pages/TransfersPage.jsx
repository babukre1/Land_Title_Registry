import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { myApi, transferApi } from "../services/registryService.js";

export default function TransfersPage({ mine = false }) {
  const [result, setResult] = useState(null); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  async function load() { setError(""); try { setResult(await (mine ? myApi.transfers({ page: 1, limit: 50 }) : transferApi.list({ page: 1, limit: 50, ...(status ? { status } : {}) }))); } catch (e) { setError(e.response?.data?.message || "Unable to load transfers."); } }
  useEffect(() => { load(); }, [mine, status]);
  return <><PageHeader title={mine ? "My transfers" : "Transfers"} description={mine ? "Sales where you are a seller, joint owner, or buyer." : "Review transfer progress and legal requirements."} action={mine && <Link to="/transfers/new" className="rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white">New sale</Link>} />{!mine && <select value={status} onChange={(e) => setStatus(e.target.value)} className="mb-4 rounded-xl border border-slate-300 px-3 py-2"><option value="">All statuses</option>{["AWAITING_OWNER_CONSENT","AWAITING_BUYER_ACCEPTANCE","CLERK_REVIEW","AWAITING_PAYMENT","APPROVED","REJECTED","CANCELLED"].map((item) => <option key={item}>{item}</option>)}</select>}{error ? <ErrorMessage message={error} onRetry={load} /> : !result ? <LoadingSpinner /> : result.data.length === 0 ? <EmptyState /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-4">Transfer</th><th className="p-4">Parcel</th><th className="p-4">Buyer</th><th className="p-4">Price</th><th className="p-4">Status</th><th /></tr></thead><tbody className="divide-y">{result.data.map((transfer) => <tr key={transfer.id}><td className="p-4 font-bold">#{transfer.id} · {transfer.transferType}</td><td className="p-4">{transfer.parcel.parcelNumber}</td><td className="p-4">{transfer.buyerOwner.fullName || transfer.buyerOwner.companyName}</td><td className="p-4">${Number(transfer.declaredPrice).toLocaleString()}</td><td className="p-4"><StatusBadge status={transfer.status} /></td><td className="p-4"><Link className="font-bold text-emerald-700" to={`/transfers/${transfer.id}`}>Review</Link></td></tr>)}</tbody></table></div>}</>;
}

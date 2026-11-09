import { Check, Clock3, FileText, Plus, Search, Send } from "lucide-react";
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
import { myApi, transferApi } from "../services/registryService.js";

/** Ownership transfer queue using only backend-supported stages and fields. */
export default function TransfersPage({ mine = false }) {
  const [result, setResult] = useState(null); const [status, setStatus] = useState(""); const [parcelNumber, setParcelNumber] = useState(""); const [page, setPage] = useState(1); const [error, setError] = useState("");
  async function load(nextPage = page) { setError(""); try { const params = { page: nextPage, limit: 20, ...(status ? { status } : {}), ...(parcelNumber ? { parcelNumber } : {}) }; setResult(await (mine ? myApi.transfers(params) : transferApi.list(params))); setPage(nextPage); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load transfers."); } }
  useEffect(() => { load(1); }, [mine, status]);
  const transfers = result?.data || [];
  return <><PageHeader title={mine ? "My transfers" : "Ownership transfers"} description={mine ? "Sales where you are a seller, joint owner, or buyer." : "Track parcel ownership transfer requests and approval progress."} action={mine && <Link to="/transfers/new" className="ui-button-primary"><Plus size={16} />Initiate transfer</Link>} />{result && <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Send} value={result.pagination.total} label="Transfers matching filter" /><StatCard icon={Check} value={transfers.filter((item) => item.status === "APPROVED").length} label="Approved on this page" /><StatCard icon={Clock3} value={transfers.filter((item) => ["CLERK_REVIEW", "REGISTRAR_REVIEW"].includes(item.status)).length} label="In review on this page" /><StatCard icon={FileText} value={transfers.filter((item) => ["AWAITING_OWNER_CONSENT", "AWAITING_BUYER_ACCEPTANCE"].includes(item.status)).length} label="Awaiting parties" /></div>}
    <FilterBar onSubmit={(event) => { event.preventDefault(); load(1); }}><label className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-2.5 text-[#8d98aa]" size={16} /><span className="sr-only">Parcel number</span><input className="ui-input pl-9" value={parcelNumber} onChange={(event) => setParcelNumber(event.target.value)} placeholder="Search by parcel number" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="ui-input w-auto min-w-[190px]" aria-label="Transfer status"><option value="">All statuses</option>{["AWAITING_OWNER_CONSENT", "AWAITING_BUYER_ACCEPTANCE", "CLERK_REVIEW", "AWAITING_PAYMENT", "REGISTRAR_REVIEW", "APPROVED", "REJECTED", "CANCELLED"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><button className="ui-button-primary"><Search size={15} />Search</button></FilterBar>
    {error ? <ErrorMessage message={error} onRetry={() => load(page)} /> : !result ? <LoadingSpinner /> : result.data.length === 0 ? <EmptyState /> : <section className="ui-card overflow-hidden"><div className="overflow-x-auto"><table className="ui-table"><thead><tr><th>Reference</th><th>Parcel</th><th>Current owner</th><th>New owner</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>{transfers.map((transfer) => <tr key={transfer.id}><td><Link className="ui-link" to={`/transfers/${transfer.id}`}>TRF-{String(transfer.id).padStart(5, "0")}</Link></td><td>{transfer.parcel.parcelNumber}</td><td>{transfer.sellerSnapshot?.owners?.map((owner) => owner.name).join(", ") || "—"}</td><td>{transfer.buyerOwner.fullName || transfer.buyerOwner.companyName}</td><td>{new Date(transfer.createdAt).toLocaleDateString()}</td><td><StatusBadge status={transfer.status} /></td><td><Link className="ui-link" to={`/transfers/${transfer.id}`}>View</Link></td></tr>)}</tbody></table></div><Pagination pagination={result.pagination} onPage={load} /></section>}
  </>;
}

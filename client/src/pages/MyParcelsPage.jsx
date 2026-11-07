import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { myApi } from "../services/registryService.js";

export default function MyParcelsPage() {
  const [result, setResult] = useState(null); const [page, setPage] = useState(1); const [error, setError] = useState("");
  useEffect(() => { setError(""); myApi.parcels({ page, limit: 10 }).then(setResult).catch((e) => setError(e.response?.data?.message || "Unable to load your parcels.")); }, [page]);
  return <><PageHeader title="My parcels" description="Your current official land ownership." action={<Link to="/transfers/new" className="rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white">Start sale transfer</Link>} />{error ? <ErrorMessage message={error} /> : !result ? <LoadingSpinner /> : result.data.length === 0 ? <EmptyState /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-4">Parcel</th><th className="p-4">District</th><th className="p-4">Area</th><th className="p-4">My share</th><th className="p-4">Status</th><th /></tr></thead><tbody className="divide-y">{result.data.map((parcel) => <tr key={parcel.id}><td className="p-4 font-bold text-blue-950">{parcel.parcelNumber}</td><td className="p-4">{parcel.district.name}</td><td className="p-4">{Number(parcel.areaM2).toLocaleString()} m²</td><td className="p-4 font-bold">{parcel.ownershipShare}%</td><td className="p-4"><StatusBadge status={parcel.status} /></td><td className="p-4"><Link className="font-bold text-emerald-700" to={`/parcels/${parcel.id}`}>View</Link></td></tr>)}</tbody></table></div>}{result?.pagination?.pages > 1 && <div className="mt-4 flex justify-end gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page === result.pagination.pages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div>}</>;
}

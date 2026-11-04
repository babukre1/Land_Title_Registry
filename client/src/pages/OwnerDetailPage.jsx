import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { ownerApi } from "../services/registryService.js";

export default function OwnerDetailPage() {
  const { id } = useParams(); const [owner, setOwner] = useState(null); const [error, setError] = useState("");
  useEffect(() => { ownerApi.get(id).then(setOwner).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load owner.")); }, [id]);
  if (error) return <ErrorMessage message={error} />; if (!owner) return <LoadingSpinner />;
  return <><PageHeader title={owner.fullName || owner.companyName} description={`${owner.ownerType} · ${owner.identityNumber || owner.registrationNumber}`} /><div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-blue-950">Registry details</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Phone</dt><dd className="font-semibold">{owner.phone || "—"}</dd></div><div><dt className="text-slate-500">Email</dt><dd className="font-semibold">{owner.email || "—"}</dd></div><div className="col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-semibold">{owner.address || "—"}</dd></div></dl></section><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-blue-950">Linked parcels</h2><div className="mt-4 space-y-3">{owner.parcelOwners.length === 0 ? <p className="text-slate-500">No linked parcels.</p> : owner.parcelOwners.map(({ parcel, sharePercent }) => <Link key={parcel.id} to={`/parcels/${parcel.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><span><strong>{parcel.parcelNumber}</strong><small className="ml-2 text-slate-500">{Number(sharePercent)}%</small></span><StatusBadge status={parcel.status} /></Link>)}</div></section></div></>;
}

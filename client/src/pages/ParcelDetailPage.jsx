import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ParcelMap from "../components/maps/ParcelMap.jsx";
import { parcelApi } from "../services/registryService.js";

export default function ParcelDetailPage() {
  const { id } = useParams(); const [parcel, setParcel] = useState(null); const [error, setError] = useState("");
  useEffect(() => { parcelApi.get(id).then(setParcel).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load parcel.")); }, [id]);
  if (error) return <ErrorMessage message={error} />; if (!parcel) return <LoadingSpinner />;
  return <><PageHeader title={parcel.parcelNumber} description={`${parcel.district.name}, ${parcel.district.regionName}`} action={<StatusBadge status={parcel.status} />} />{parcel.status === "PENDING_SURVEY" && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">This parcel is awaiting survey verification. Its ownership is not yet an approved legal history event.</p>}<div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-blue-950">Parcel details</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Area name</dt><dd className="font-semibold">{parcel.areaName}</dd></div><div><dt className="text-slate-500">Land use</dt><dd className="font-semibold">{parcel.landUse}</dd></div><div><dt className="text-slate-500">Calculated area</dt><dd className="font-semibold">{Number(parcel.areaM2).toLocaleString()} m²</dd></div><div><dt className="text-slate-500">Created</dt><dd className="font-semibold">{new Date(parcel.createdAt).toLocaleDateString()}</dd></div></dl><h3 className="mt-6 font-bold text-blue-950">Proposed ownership</h3><div className="mt-3 space-y-2">{parcel.owners.map(({ owner, sharePercent }) => <div key={owner.id} className="flex justify-between rounded-lg bg-slate-50 p-3"><span>{owner.fullName || owner.companyName}</span><strong>{Number(sharePercent)}%</strong></div>)}</div></section><ParcelMap proposedGeometry={parcel.geometry} /></div></>;
}

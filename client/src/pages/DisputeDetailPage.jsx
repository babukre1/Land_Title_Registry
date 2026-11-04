import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ParcelMap from "../components/maps/ParcelMap.jsx";
import { disputeApi } from "../services/registryService.js";

export default function DisputeDetailPage() {
  const { id } = useParams(); const [dispute, setDispute] = useState(null); const [error, setError] = useState("");
  useEffect(() => { disputeApi.get(id).then(setDispute).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load dispute.")); }, [id]);
  if (error) return <ErrorMessage message={error} />; if (!dispute) return <LoadingSpinner />;
  return <><PageHeader title={`Dispute DIS-${String(dispute.id).padStart(5, "0")}`} description={dispute.description} action={<StatusBadge status={dispute.status} />} /><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="font-bold text-blue-950">Case details</h2><p className="mt-2 text-sm text-slate-600">Opened by {dispute.openedBy.fullName} on {new Date(dispute.createdAt).toLocaleString()}</p></div>{dispute.candidate && <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Proposed area</dt><dd className="font-bold">{Number(dispute.candidate.proposedAreaM2).toFixed(2)} m²</dd></div><div><dt className="text-slate-500">Land use</dt><dd className="font-bold">{dispute.candidate.landUse}</dd></div><div className="col-span-2"><dt className="text-slate-500">Area name</dt><dd className="font-bold">{dispute.candidate.areaName}</dd></div></dl>}<div><h3 className="font-bold text-blue-950">Claimants</h3>{dispute.parties.map((party) => <p key={party.id} className="mt-2 rounded-lg bg-slate-50 p-3">{party.displayName} · {party.partyRole}</p>)}</div><div><h3 className="font-bold text-blue-950">Conflicts</h3>{dispute.conflicts.map((conflict) => <p key={conflict.parcelId} className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3"><strong>{conflict.parcelNumber}</strong><br /><span className="text-sm text-red-800">{Number(conflict.overlapAreaM2).toFixed(2)} m² overlap</span></p>)}</div></section><ParcelMap proposedGeometry={dispute.proposedGeometry} conflicts={dispute.conflicts} /></div></>;
}

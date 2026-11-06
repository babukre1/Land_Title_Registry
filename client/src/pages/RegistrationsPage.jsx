import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { registrationApi } from "../services/registryService.js";

export default function RegistrationsPage() { const { t } = useLanguage(); const [result,setResult]=useState(null); const [error,setError]=useState(""); useEffect(()=>{registrationApi.pending().then(setResult).catch(e=>setError(e.response?.data?.message||t("loadApprovalsError")));},[t]); return <><PageHeader title={t("pendingApprovals")} description={t("pendingApprovalsDescription")} />{error&&<ErrorMessage message={error}/>} {!result?<LoadingSpinner/>:result.data.length===0?<EmptyState title={t("noPendingApprovals")}/>:<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{[t("parcelNumber"),t("district"),t("area"),t("owners"),t("surveyor"),t("actions")].map(x=><th key={x} className="p-4">{x}</th>)}</tr></thead><tbody>{result.data.map(p=><tr className="border-t" key={p.id}><td className="p-4 font-bold">{p.parcelNumber}</td><td className="p-4">{p.district.name}</td><td className="p-4">{Number(p.areaM2).toLocaleString()} m²</td><td className="p-4">{p.owners.map(x=>x.owner.fullName||x.owner.companyName).join(", ")}</td><td className="p-4">{p.surveys[0]?.surveyor?.fullName}</td><td className="p-4"><Link className="font-bold text-blue-700" to={`/registrations/${p.id}/review`}>{t("review")}</Link></td></tr>)}</tbody></table></div>}</>; }

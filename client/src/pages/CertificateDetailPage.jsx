import { Download, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { certificateApi } from "../services/registryService.js";

export default function CertificateDetailPage() {
  const { id } = useParams(); const { language, t } = useLanguage(); const [certificate, setCertificate] = useState(null); const [error, setError] = useState("");
  useEffect(() => { certificateApi.get(id).then(setCertificate).catch((e) => setError(e.response?.data?.message || t("loadCertificatesError"))); }, [id, t]);
  if (error) return <ErrorMessage message={error} />; if (!certificate) return <LoadingSpinner />;
  const snapshot = certificate.certificateSnapshot;
  return <><PageHeader title={certificate.certificateNumber} description={snapshot.parcelNumber} action={<StatusBadge status={certificate.status} />} /><div className="grid gap-6 lg:grid-cols-2"><section className="space-y-3 rounded-2xl border bg-white p-6"><h2 className="font-black text-blue-950">{t("parcelDetails")}</h2><p>{snapshot.district}, {snapshot.region}</p><p>{snapshot.areaName} · {Number(snapshot.areaM2).toLocaleString()} m²</p><h3 className="pt-3 font-bold">{t("owners")}</h3>{snapshot.owners.map((owner) => <p key={`${owner.name}-${owner.sharePercent}`} className="flex justify-between"><span>{owner.name}</span><strong>{owner.sharePercent}%</strong></p>)}</section><section className="space-y-4 rounded-2xl border bg-white p-6"><p><strong>{t("issuedBy")}:</strong> {certificate.issuedBy.fullName}</p><p><strong>{t("issuedAt")}:</strong> {new Date(certificate.issuedAt).toLocaleString(language)}</p><div className="flex flex-wrap gap-3"><button onClick={() => certificateApi.download(id, "en")} className="inline-flex items-center gap-2 rounded-xl bg-blue-950 px-4 py-2 font-bold text-white"><Download size={17} />English PDF</button><button onClick={() => certificateApi.download(id, "so")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"><Download size={17} />PDF Soomaali</button><a href={certificate.verificationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold"><ExternalLink size={17} />{t("verifyPublicly")}</a></div></section></div></>;
}

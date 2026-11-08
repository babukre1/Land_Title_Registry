import { Download, FileBadge } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { certificateApi } from "../services/registryService.js";

export default function ParcelCertificatesSection({ parcelId, parcelStatus }) {
  const { user } = useAuth(); const { language, t } = useLanguage(); const [certificates, setCertificates] = useState([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { try { setCertificates(await certificateApi.listForParcel(parcelId)); } catch (e) { setError(e.response?.data?.message || t("loadCertificatesError")); } }
  useEffect(() => { if (parcelStatus === "REGISTERED" && ["OWNER", "CLERK", "REGISTRAR", "ADMIN"].includes(user.role)) load(); }, [parcelId, parcelStatus, user.role]);
  async function issue() { setBusy(true); setError(""); try { await certificateApi.issue(parcelId); await load(); } catch (e) { setError(e.response?.data?.message || "Unable to issue certificate."); } finally { setBusy(false); } }
  if (parcelStatus !== "REGISTERED" || !["OWNER", "CLERK", "REGISTRAR", "ADMIN"].includes(user.role)) return null;
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-blue-950">{t("certificates")}</h2>{user.role === "REGISTRAR" && <button disabled={busy} onClick={issue} className="rounded-xl bg-blue-950 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? t("issuingCertificate") : t("issueCertificate")}</button>}</div>{error && <p className="mt-3 text-red-700">{error}</p>}<div className="mt-4 space-y-3">{certificates.length === 0 ? <p className="text-slate-500">{t("noResults")}</p> : certificates.map((certificate) => <div key={certificate.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3"><FileBadge size={18} /><Link className="flex-1 font-bold text-blue-950" to={`/certificates/${certificate.id}`}>{certificate.certificateNumber}</Link><StatusBadge status={certificate.status} /><button onClick={() => certificateApi.download(certificate.id, language)} aria-label={t("download")}><Download size={18} /></button></div>)}</div></section>;
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ParcelDrawingMap from "../components/maps/ParcelDrawingMap.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { districtApi, ownerApi, parcelApi } from "../services/registryService.js";

export default function ParcelCorrectionPage() {
  const { id } = useParams(); const navigate = useNavigate(); const { t } = useLanguage(); const [parcel, setParcel] = useState(null); const [districts, setDistricts] = useState([]); const [owners, setOwners] = useState([]); const [form, setForm] = useState(null); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([parcelApi.get(id), districtApi.list(), ownerApi.list({ limit: 100 })]).then(([p, d, o]) => { setParcel(p); setDistricts(d); setOwners(o.data); setForm({ districtId: p.district.id, areaName: p.areaName, landUse: p.landUse, geometry: p.geometry, owners: p.owners.map((x) => ({ ownerId: x.owner.id, sharePercent: Number(x.sharePercent) })), confirmUnusualArea: false }); }).catch((e) => setError(e.response?.data?.message || t("loadParcelError"))); }, [id, t]);
  async function submit(event) { event.preventDefault(); setSaving(true); setError(""); try { await parcelApi.correct(id, form); navigate(`/parcels/${id}`); } catch (e) { setError(e.response?.data?.message || t("correctionError")); } finally { setSaving(false); } }
  if (!form) return error ? <ErrorMessage message={error} /> : <LoadingSpinner />;
  return <><PageHeader title={t("correctParcel")} description={parcel.surveys[0]?.cannotVerifyReason || t("correctParcelDescription")} />{error && <ErrorMessage message={error} />}<form onSubmit={submit} className="space-y-5"><div className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><select value={form.districtId} onChange={(e) => setForm({ ...form, districtId: Number(e.target.value) })} className="rounded-xl border p-3">{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><input value={form.areaName} onChange={(e) => setForm({ ...form, areaName: e.target.value })} className="rounded-xl border p-3" /><select value={form.landUse} onChange={(e) => setForm({ ...form, landUse: e.target.value })} className="rounded-xl border p-3"><option>RESIDENTIAL</option><option>COMMERCIAL</option><option>FARM</option></select><select value={form.owners[0]?.ownerId} onChange={(e) => setForm({ ...form, owners: [{ ownerId: Number(e.target.value), sharePercent: 100 }] })} className="rounded-xl border p-3">{owners.map((o) => <option key={o.id} value={o.id}>{o.fullName || o.companyName}</option>)}</select></div><ParcelDrawingMap value={form.geometry} onChange={(geometry) => setForm({ ...form, geometry })} /><button disabled={saving} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white disabled:opacity-50">{saving ? t("saving") : t("resubmitSurvey")}</button></form></>;
}

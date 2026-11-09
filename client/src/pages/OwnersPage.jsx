import { Building2, Plus, Search, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import FilterBar from "../components/FilterBar.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { ownerApi } from "../services/registryService.js";

/** Searchable registry owner directory for people and companies. */
export default function OwnersPage() {
  const { user } = useAuth(); const { t } = useLanguage(); const [q, setQ] = useState(""); const [type, setType] = useState(""); const [page, setPage] = useState(1); const [result, setResult] = useState(null); const [error, setError] = useState("");
  async function load(nextPage = page) { setError(""); try { const response = await ownerApi.list({ q, page: nextPage, limit: 20 }); setResult(response); setPage(nextPage); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load owners."); } }
  useEffect(() => { load(1); }, []);
  const owners = (result?.data || []).filter((owner) => !type || owner.ownerType === type); const people = (result?.data || []).filter((owner) => owner.ownerType === "PERSON").length; const companies = (result?.data || []).filter((owner) => owner.ownerType === "COMPANY").length;
  return <><PageHeader title={t("owners")} description="People and companies recorded in the land registry." action={user.role === "CLERK" && <Link to="/owners/new" className="ui-button-primary"><Plus size={16} />{t("createOwner")}</Link>} />{result && <div className="mb-4 grid gap-3 sm:grid-cols-3"><StatCard icon={Users} value={result.pagination.total} label="Registered owners" /><StatCard icon={UserRound} value={people} label="People on this page" /><StatCard icon={Building2} value={companies} label="Companies on this page" /></div>}
    <FilterBar onSubmit={(event) => { event.preventDefault(); load(1); }}><label className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-2.5 text-[#8d98aa]" size={16} /><span className="sr-only">Search owners</span><input className="ui-input pl-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name or identity number" /></label><select aria-label="Owner type" className="ui-input w-auto min-w-[160px]" value={type} onChange={(event) => setType(event.target.value)}><option value="">All owner types</option><option value="PERSON">Person</option><option value="COMPANY">Company</option></select><button className="ui-button-primary"><Search size={15} />{t("search")}</button></FilterBar>
    {error && <ErrorMessage message={error} onRetry={() => load(page)} />}{!result && !error ? <LoadingSpinner /> : owners.length === 0 ? <EmptyState /> : <section className="ui-card overflow-hidden"><div className="overflow-x-auto"><table className="ui-table"><thead><tr><th>Owner name</th><th>Type</th><th>Identifier</th><th>Contact</th><th>Email</th><th>Action</th></tr></thead><tbody>{owners.map((owner) => <tr key={owner.id}><td><Link className="ui-link" to={`/owners/${owner.id}`}>{owner.fullName || owner.companyName}</Link></td><td className="capitalize">{owner.ownerType.toLowerCase()}</td><td>{owner.identityNumber || owner.registrationNumber}</td><td>{owner.phone || "—"}</td><td>{owner.email || "—"}</td><td><Link className="ui-link" to={`/owners/${owner.id}`}>{t("view")}</Link></td></tr>)}</tbody></table></div><Pagination pagination={result.pagination} onPage={load} /></section>}
  </>;
}

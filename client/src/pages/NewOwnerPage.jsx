import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { ownerApi } from "../services/registryService.js";

const empty = { ownerType: "PERSON", fullName: "", identityNumber: "", companyName: "", registrationNumber: "", phone: "", email: "", address: "", loginPassword: "", confirmPassword: "" };

/** Creates a legal owner identity and its linked OWNER login in one request. */
export default function NewOwnerPage() {
  const [form, setForm] = useState(empty); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [showPassword, setShowPassword] = useState(false); const navigate = useNavigate();
  function update(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setError("");
    if (form.loginPassword !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setSaving(true);
    const common = { phone: form.phone, email: form.email, address: form.address, loginPassword: form.loginPassword };
    const input = form.ownerType === "PERSON" ? { ...common, ownerType: "PERSON", fullName: form.fullName, identityNumber: form.identityNumber } : { ...common, ownerType: "COMPANY", companyName: form.companyName, registrationNumber: form.registrationNumber };
    try { const owner = await ownerApi.create(input); navigate(`/owners/${owner.id}`); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to create owner."); } finally { setSaving(false); }
  }
  return <><PageHeader title="Create owner and login" description="Record the legal owner and create their secure OWNER account in one transaction." />{error && <div className="mb-4"><ErrorMessage message={error} /></div>}<form onSubmit={submit} className="max-w-4xl space-y-4"><SectionCard title="Owner identity"><div className="grid gap-4 sm:grid-cols-2"><Field label="Owner type"><select name="ownerType" value={form.ownerType} onChange={update} className="ui-input"><option value="PERSON">Person</option><option value="COMPANY">Company</option></select></Field>{form.ownerType === "PERSON" ? <><Field label="Full name"><input name="fullName" value={form.fullName} onChange={update} required className="ui-input" /></Field><Field label="Identity number"><input name="identityNumber" value={form.identityNumber} onChange={update} required className="ui-input" /></Field></> : <><Field label="Company name"><input name="companyName" value={form.companyName} onChange={update} required className="ui-input" /></Field><Field label="Registration number"><input name="registrationNumber" value={form.registrationNumber} onChange={update} required className="ui-input" /></Field></>}<Field label="Phone"><input name="phone" value={form.phone} onChange={update} className="ui-input" /></Field><Field label="Address"><input name="address" value={form.address} onChange={update} className="ui-input" /></Field></div></SectionCard><SectionCard title="Owner login"><div className="mb-4 flex gap-3 rounded-lg border border-[#dcd6ff] bg-[#f7f5ff] p-3 text-xs text-[#51458f]"><ShieldCheck className="shrink-0" size={17} /><p>The owner will sign in with this email and password. The password is hashed and is never returned by the API.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Login email"><input name="email" type="email" autoComplete="off" value={form.email} onChange={update} required className="ui-input" /></Field><span className="hidden sm:block" /><Field label="Initial password"><span className="relative block"><input name="loginPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={72} value={form.loginPassword} onChange={update} required className="ui-input pr-10" /><button type="button" aria-label={showPassword ? "Hide passwords" : "Show passwords"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-2.5 text-[#647084]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span><small className="mt-1 block font-normal text-[#647084]">At least 8 characters.</small></Field><Field label="Confirm password"><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={update} required className="ui-input" /></Field></div></SectionCard><div className="flex justify-end"><button disabled={saving} className="ui-button-primary px-6">{saving ? "Creating…" : "Create owner account"}</button></div></form></>;
}

function Field({ label, children }) { return <label className="text-xs font-bold text-[#263249]">{label}<span className="mt-1 block">{children}</span></label>; }

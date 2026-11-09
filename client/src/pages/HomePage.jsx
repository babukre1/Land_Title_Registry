import { useEffect, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "../services/apiClient.js";

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    apiClient.get("/health")
      .then(() => active && setApiStatus("connected"))
      .catch(() => active && setApiStatus("unavailable"));
    return () => { active = false; };
  }, []);

  return (
    <main className="page-background min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3 font-bold text-slate-900">
          <span className="grid size-10 place-items-center rounded-[10px] bg-[#4935ca] text-white"><Building2 size={21} /></span>
          Land Title Registry
        </div>
        <Link to="/login" className="ui-button-primary">Sign in</Link>
      </nav>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pt-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
            <ShieldCheck size={16} /> Trusted property records
          </div>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-[#11172d] sm:text-6xl">Land Title Registry</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-600">Secure Digital Land Registration and Ownership Management</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to="/login" className="ui-button-primary px-6 py-3">Access registry <ArrowRight size={18} /></Link>
            <Link to="/verify" className="ui-button-secondary px-6 py-3"><ShieldCheck size={18} /> Verify certificate</Link>
            <div className={`inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm ${apiStatus === "connected" ? "border-emerald-200 text-emerald-700" : apiStatus === "unavailable" ? "border-red-200 text-red-700" : "border-slate-200 text-slate-500"}`}>
              {apiStatus === "connected" ? <CheckCircle2 size={18} /> : <WifiOff size={18} />}
              {apiStatus === "connected" ? "API Connected" : apiStatus === "unavailable" ? "API Unavailable" : "Checking API…"}
            </div>
          </div>
        </div>
        <div className="ui-card p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#4935ca]">Built for trust</p>
          <h2 className="mt-3 text-2xl font-bold text-[#11172d]">Clear records. Protected ownership.</h2>
          <div className="mt-7 space-y-5 text-slate-600">
            {["Geographic parcel boundaries", "Permanent ownership history", "Role-based legal approvals"].map((item) => (
              <div key={item} className="flex items-center gap-3"><CheckCircle2 className="text-emerald-600" size={20} /><span>{item}</span></div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

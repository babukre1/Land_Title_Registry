export default function StatCard({ label, value, icon: Icon, tone = "navy" }) {
  const tones = { navy: "bg-blue-950 text-white", emerald: "bg-emerald-600 text-white", amber: "bg-amber-500 text-white", red: "bg-red-600 text-white" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={20} /></div><p className="mt-4 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-blue-950">{value}</p></div>;
}

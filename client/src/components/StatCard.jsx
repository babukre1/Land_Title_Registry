/** Compact metric tile backed by real registry data. */
export default function StatCard({ label, value, icon: Icon }) {
  return <div className="ui-card flex min-h-[98px] items-center gap-4 p-5"><div className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[#e5e2ff] bg-[#f7f5ff] text-[#4935ca]"><Icon size={20} strokeWidth={1.8} /></div><div><p className="text-2xl font-extrabold leading-none text-[#11172d]">{value}</p><p className="mt-2 text-[11px] text-[#647084]">{label}</p></div></div>;
}

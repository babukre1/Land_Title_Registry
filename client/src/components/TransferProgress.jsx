const steps = [
  ["INITIATED", "Initiated"], ["AWAITING_OWNER_CONSENT", "Owner confirmations"], ["AWAITING_BUYER_ACCEPTANCE", "Buyer acceptance"], ["CLERK_REVIEW", "Clerk review"], ["AWAITING_PAYMENT", "Payment"], ["REGISTRAR_REVIEW", "Registrar approval"], ["APPROVED", "Completed"],
];
export default function TransferProgress({ status }) {
  const terminal = ["CANCELLED", "REJECTED"].includes(status); const current = steps.findIndex(([value]) => value === status); const reached = status === "APPROVED" ? steps.length - 1 : Math.max(current, 0);
  return <div><div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-7">{steps.map(([value, label], index) => <div key={value} className={`rounded-xl border p-3 text-xs font-bold ${terminal ? "border-slate-200 bg-slate-50 text-slate-400" : index <= reached ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-400"}`}><span className="mr-1">{index + 1}.</span>{label}</div>)}</div>{terminal && <p className="mt-3 rounded-xl bg-red-50 p-3 font-semibold text-red-800">This transfer was {status.toLowerCase()} and did not change ownership.</p>}</div>;
}

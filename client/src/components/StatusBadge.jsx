const colors = {
  REGISTERED: "bg-emerald-100 text-emerald-800", VERIFIED: "bg-blue-100 text-blue-800", PENDING_SURVEY: "bg-amber-100 text-amber-800",
  RETURNED_FOR_CORRECTION: "bg-orange-100 text-orange-800", DISPUTED: "bg-red-100 text-red-800", OPEN: "bg-red-100 text-red-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800", RESOLVED: "bg-emerald-100 text-emerald-800", BLOCKED: "bg-red-100 text-red-800",
  AWAITING_OWNER_CONSENT: "bg-amber-100 text-amber-800", AWAITING_BUYER_ACCEPTANCE: "bg-blue-100 text-blue-800", CLERK_REVIEW: "bg-violet-100 text-violet-800", AWAITING_PAYMENT: "bg-orange-100 text-orange-800", REGISTRAR_REVIEW: "bg-indigo-100 text-indigo-800", APPROVED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-red-100 text-red-800", CANCELLED: "bg-slate-200 text-slate-700",
};
export default function StatusBadge({ status }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${colors[status] || "bg-slate-100 text-slate-700"}`}>{String(status).replaceAll("_", " ")}</span>; }

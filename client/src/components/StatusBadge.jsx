import { useLanguage } from "../context/LanguageContext.jsx";

const colors = {
  REGISTERED: "bg-[#e5f6ee] text-[#10835b]", VERIFIED: "bg-[#eaf1fe] text-[#235cb7]", PENDING: "bg-[#eef0f4] text-[#596579]", IN_PROGRESS: "bg-[#eaf1fe] text-[#235cb7]", PENDING_SURVEY: "bg-[#eef0f4] text-[#596579]",
  RETURNED_FOR_CORRECTION: "bg-[#fdecee] text-[#c8374b]", CANNOT_VERIFY: "bg-[#fdecee] text-[#c8374b]", DISPUTED: "bg-[#fdecee] text-[#c8374b]", OPEN: "bg-[#fdecee] text-[#c8374b]",
  UNDER_REVIEW: "bg-[#eaf1fe] text-[#235cb7]", RESOLVED: "bg-[#e5f6ee] text-[#10835b]", BLOCKED: "bg-[#fdecee] text-[#c8374b]", ACTIVE: "bg-[#fdecee] text-[#c8374b]", LIFTED: "bg-[#e5f6ee] text-[#10835b]",
  AWAITING_OWNER_CONSENT: "bg-[#eef0f4] text-[#596579]", AWAITING_BUYER_ACCEPTANCE: "bg-[#eaf1fe] text-[#235cb7]", CLERK_REVIEW: "bg-[#eaf1fe] text-[#235cb7]", AWAITING_PAYMENT: "bg-[#eef0f4] text-[#596579]", REGISTRAR_REVIEW: "bg-[#eaf1fe] text-[#235cb7]", APPROVED: "bg-[#e5f6ee] text-[#10835b]", CURRENT: "bg-[#e5f6ee] text-[#10835b]", SUPERSEDED: "bg-[#eef0f4] text-[#596579]", REJECTED: "bg-[#fdecee] text-[#c8374b]", CANCELLED: "bg-[#eef0f4] text-[#596579]",
};
/** Text-labelled semantic status; color is supplemental rather than the only cue. */
export default function StatusBadge({ status }) { const { t } = useLanguage(); return <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold ${colors[status] || "bg-[#eef0f4] text-[#596579]"}`}>{t(`status_${status}`)}</span>; }

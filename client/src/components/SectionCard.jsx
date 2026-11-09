/** Bordered content surface with an optional title and right-side action. */
export default function SectionCard({ title, action, children, className = "", bodyClassName = "ui-card-body" }) {
  return <section className={`ui-card ${className}`}>{(title || action) && <div className="ui-card-header"><h2 className="text-sm font-bold text-[#11172d]">{title}</h2>{action}</div>}<div className={bodyClassName}>{children}</div></section>;
}

/** Consistent page title, description, and action row. */
export default function PageHeader({ title, description, action }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[26px] font-extrabold leading-tight tracking-[-.025em] text-[#11172d]">{title}</h1>{description && <p className="mt-1.5 max-w-3xl text-sm text-[#647084]">{description}</p>}</div>{action && <div className="flex flex-wrap gap-2">{action}</div>}</div>;
}

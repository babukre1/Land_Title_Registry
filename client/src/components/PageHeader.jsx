export default function PageHeader({ title, description, action }) {
  return <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-black tracking-tight text-blue-950 sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-3xl text-slate-600">{description}</p>}</div>{action}</div>;
}

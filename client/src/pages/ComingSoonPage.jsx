import PageHeader from "../components/PageHeader.jsx";

export default function ComingSoonPage({ title = "Coming soon" }) { return <><PageHeader title={title} description="This workflow is planned for Phase 7 and is not presented as complete." /><div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">The data foundation exists, but workflow actions are intentionally disabled.</div></>; }

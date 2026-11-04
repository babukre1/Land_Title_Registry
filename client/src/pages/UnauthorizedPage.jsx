import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center"><div><p className="text-7xl font-black text-blue-950">403</p><h1 className="mt-4 text-2xl font-bold">Access not permitted</h1><p className="mt-2 text-slate-600">Your account does not have permission to view this page.</p><Link className="mt-7 inline-block rounded-xl bg-blue-950 px-5 py-3 font-semibold text-white" to="/dashboard">Return to dashboard</Link></div></main>;
}

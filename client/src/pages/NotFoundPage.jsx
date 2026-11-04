import { Link } from "react-router-dom";
export default function NotFoundPage() { return <div className="py-20 text-center"><p className="text-7xl font-black text-blue-950">404</p><h1 className="mt-4 text-2xl font-bold">Page not found</h1><Link to="/dashboard" className="mt-6 inline-block font-bold text-emerald-700">Return to dashboard</Link></div>; }

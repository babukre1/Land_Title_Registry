import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false); const location = useLocation();
  const { user } = useAuth(); const { t } = useLanguage();
  const key = location.pathname.startsWith("/owners") ? "owners" : location.pathname.startsWith("/disputes") ? "disputes" : location.pathname.startsWith("/surveys") ? "surveys" : location.pathname.startsWith("/registrations") ? "pendingApprovals" : location.pathname === "/parcels/new" ? "registerParcel" : location.pathname.startsWith("/parcels") ? "parcels" : "dashboard";
  return <div className="min-h-screen bg-slate-50"><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="lg:pl-72"><Header title={t(key)} onMenu={() => setMenuOpen(true)} /><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><Outlet context={{ user }} /></main></div></div>;
}

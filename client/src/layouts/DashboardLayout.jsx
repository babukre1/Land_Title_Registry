import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/** Shared responsive shell for every authenticated registry screen. */
export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false); const { user } = useAuth();
  return <div className="min-h-screen bg-[#f9fafc]"><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="lg:pl-[246px]"><Header onMenu={() => setMenuOpen(true)} /><main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-[30px]"><Outlet context={{ user }} /></main></div></div>;
}

import { Eye, EyeOff, Landmark, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await signIn(form);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-background grid min-h-screen place-items-center px-4 py-12">
      <div className="ui-card w-full max-w-md p-8 sm:p-10">
        <Link to="/" className="mx-auto grid size-12 place-items-center rounded-[10px] bg-[#4935ca] text-white"><Landmark /></Link>
        <h1 className="mt-5 text-center text-[26px] font-extrabold text-[#11172d]">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-[#647084]">Sign in to the Land Title Registry</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">
            Email address
            <span className="relative mt-2 block">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input className="ui-input py-3 pl-10 pr-3" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </span>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <span className="relative mt-2 block">
              <LockKeyhole className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input className="ui-input py-3 pl-10 pr-11" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-3 text-slate-500" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </span>
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={isSubmitting} className="ui-button-primary w-full py-3">{isSubmitting ? "Signing in…" : "Sign in"}</button>
        </form>
        <Link to="/" className="mt-6 block text-center text-sm font-medium text-slate-500 hover:text-blue-950">← Return to home</Link>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ArrowLeft, Eye, EyeOff, KeyRound, Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { useRouter } from "@/lib/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import "../cms.css";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("xmum-cms-dark");
    setDark(saved ? saved === "true" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!sessionError && data.session) router.replace("/admin");
    }).catch(() => {});
  }, [router]);

  const toggleTheme = () => {
    setDark((current) => {
      localStorage.setItem("xmum-cms-dark", String(!current));
      return !current;
    });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) setError(authError.message);
      else {
        setSuccess("Signed in. Opening the CMS…");
        window.setTimeout(() => router.replace("/admin"), 450);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reach the sign-in service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`cms-login ${dark ? "is-dark" : ""}`}>
      <section className="cms-login-art" aria-label="XMUM campus assistant">
        <div className="cms-login-brand"><i /> XMUM CAMPUS ASSISTANT</div>
        <div className="cms-login-portrait">
          <img src="/tan-kah-kee-portrait.webp" alt="Respectful illustrated portrait of Tan Kah Kee" />
          <div>
            <span className="cms-eyebrow">Staff workspace</span>
            <h2>Good answers begin with <em>care.</em></h2>
            <p>Maintain clear campus guidance and review the questions students bring to Captain Kah Kee.</p>
          </div>
        </div>
        <footer>Xiamen University Malaysia · Knowledge stewardship</footer>
      </section>

      <section className="cms-login-form-side">
        <div className="cms-login-tools">
          <Link className="cms-login-back" href="/"><ArrowLeft size={16} /> Campus guide</Link>
          <button type="button" className="cms-theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="cms-login-card">
          <span className="cms-eyebrow">Secure staff access</span>
          <h1>Sign in to the CMS</h1>
          <p>Use your authorized university account to manage published answers, suggestions, and chat records.</p>

          {!isSupabaseConfigured && (
            <div className="cms-alert cms-alert--warn" role="alert">
              <AlertTriangle size={19} />
              <span><b>Supabase connection is not configured.</b>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the existing app environment before signing in. Access remains protected.</span>
            </div>
          )}
          {error && <div className="cms-alert cms-alert--error" role="alert"><AlertTriangle size={19} /><span><b>Sign-in failed</b>{error}</span></div>}
          {success && <div className="cms-alert cms-alert--ok" role="status"><KeyRound size={18} /><span>{success}</span></div>}

          <form className="cms-login-form" onSubmit={handleLogin}>
            <div className="cms-field">
              <label htmlFor="admin-email">University email</label>
              <input id="admin-email" className="cms-input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@xmu.edu.my" disabled={loading} />
            </div>
            <div className="cms-field">
              <label htmlFor="admin-password">Password</label>
              <div className="cms-pw">
                <input id="admin-password" className="cms-input" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" disabled={loading} />
                <button type="button" className="cms-icon-btn" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>
            <button type="submit" className="cms-btn cms-btn--primary" disabled={loading || !isSupabaseConfigured}>
              <KeyRound size={17} /> {loading ? "Verifying account…" : "Sign in securely"}
            </button>
          </form>
          <div className="cms-login-note">Staff access only. There is no demo account or public CMS access.</div>
        </div>
      </section>
    </div>
  );
}

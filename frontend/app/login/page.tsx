"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { UserRole } from "../types";
import { authAPI, setToken } from "../lib/api";

export default function LoginPage() {
  const { login, showToast } = useApp();
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<UserRole>("customer");
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [email, setEmail] = useState("customer@canteen.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") === "1") {
      setIsSignup(true);
      setEmail("");
      setPassword("");
    }
    const next = params.get("next") || "";
    const roleForPath: UserRole | null = next.startsWith("/kitchen")
      ? "kitchen"
      : next.startsWith("/manager")
      ? "manager"
      : next.startsWith("/admin")
      ? "admin"
      : null;
    if (roleForPath) {
      setSelectedRole(roleForPath);
      setEmail(
        roleForPath === "kitchen"
          ? "staff@canteen.com"
          : roleForPath === "manager"
          ? "manager@canteen.com"
          : "admin@canteen.com"
      );
      setPassword("");
    }
  }, []);

  const rolesConfig: {
    role: UserRole;
    title: string;
    description: string;
    icon: string;
    color: string;
    defaultEmail: string;
    redirectTo: string;
  }[] = [
      {
        role: "customer",
        title: "Student / Employee",
        description: "Pre-order meals, select 15-min pickup slots & receive digital tokens",
        icon: "person",
        color: "border-primary bg-primary-fixed/60 text-primary",
        defaultEmail: "customer@canteen.com",
        redirectTo: "/",
      },
      {
        role: "kitchen",
        title: "Kitchen / Staff",
        description: "Live kitchen queue board, QR token collection scanner & order status advancer",
        icon: "soup_kitchen",
        color: "border-emerald-500 bg-emerald-50/50 text-emerald-600",
        defaultEmail: "staff@canteen.com",
        redirectTo: "/kitchen",
      },
      {
        role: "manager",
        title: "Canteen Manager",
        description: "Manage menu prices, stock levels, slot limits, sales reports & AI insights",
        icon: "query_stats",
        color: "border-blue-500 bg-blue-50/50 text-blue-600",
        defaultEmail: "manager@canteen.com",
        redirectTo: "/manager",
      },
      {
        role: "admin",
        title: "System Admin",
        description: "Manage users, canteen accounts, permissions, audit logs & categories",
        icon: "admin_panel_settings",
        color: "border-purple-500 bg-purple-50/50 text-purple-600",
        defaultEmail: "admin@canteen.com",
        redirectTo: "/admin",
      },
    ];

  const handleRoleSelect = (r: UserRole) => {
    setSelectedRole(r);
    const conf = rolesConfig.find((c) => c.role === r);
    if (conf) setEmail(conf.defaultEmail);
    if (r !== selectedRole) {
      setPassword("");
      setFormError("");
    }
  };

  const getSafeNextPath = () => {
    if (typeof window === "undefined") return null;
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError("");

    try {
      if (isSignup) {
        const res = await authAPI.register(name, email, password, phone);
        setToken(res.token);
        showToast(`Account created for ${res.user.name}.`);
        window.location.assign(getSafeNextPath() || "/");
        return;
      }

      // Authenticate against the backend (throws if the server is unreachable)
      const res = await login(selectedRole, { email, password });

      // Map backend 'staff' role to frontend 'kitchen'
      const mappedRole: UserRole =
        res.user.role === "staff" ? "kitchen" : (res.user.role as UserRole);

      const conf = rolesConfig.find((c) => c.role === mappedRole);
      router.push(getSafeNextPath() || (conf ? conf.redirectTo : "/"));
    } catch (err: any) {
      if (isSignup) {
        const message = err?.message || "Could not create your account.";
        showToast(message);
        setFormError(message);
        return;
      }
      const message =
        err instanceof TypeError
          ? "Cannot reach the canteen right now. Please try again in a moment."
          : err?.message || "Login failed. Please check your credentials and try again.";
      showToast(message);
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl border border-border-subtle flex flex-col gap-5 sm:gap-6 relative">
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Canteen</span>
          </button>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Open Daily
          </div>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-1.5 sm:gap-2">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-primary via-[#E85D75] to-[#F5A3B3] flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[28px] sm:text-[32px]">
              restaurant
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-semibold text-text-primary">
            Smart Canteen Portal
          </h1>
          <p className="text-xs text-text-muted max-w-sm">
            {isSignup ? "Create a customer account to order meals and receive digital tokens." : "Sign in to access Pre-Order Management, Digital Tokens, Kitchen Queue, or Manager Operations."}
          </p>
        </div>

        {/* Role Selector Cards */}
        {!isSignup && <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Select Your Role
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rolesConfig.map((item) => (
              <div
                key={item.role}
                onClick={() => handleRoleSelect(item.role)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${selectedRole === item.role
                    ? `${item.color} ring-2 ring-primary/20 shadow-md`
                    : "bg-surface-container-low border-border-strong hover:border-primary/40"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    <span className="font-bold text-xs text-text-primary">
                      {item.title}
                    </span>
                  </div>
                  {selectedRole === item.role && (
                    <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted leading-tight">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-semibold text-text-muted">
            Your account role must match the selected portal.
          </p>
        </div>}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignup && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-primary">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="w-full h-11 px-4 bg-surface-container-low border border-border-strong rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-primary">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 bg-surface-container-low border border-border-strong rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white"
            />
          </div>

          {isSignup && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-primary">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-4 bg-surface-container-low border border-border-strong rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-primary">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-4 bg-surface-container-low border border-border-strong rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold text-sm rounded-xl shadow-lg transition-all active:scale-95 mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              isSignup ? "Create Customer Account" : `Sign In as ${selectedRole.toUpperCase()}`
            )}
          </button>
          {formError && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {formError}
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            const nextIsSignup = !isSignup;
            setIsSignup(nextIsSignup);
            setSelectedRole("customer");
            setName("");
            setPhone("");
            setFormError("");
            setEmail(nextIsSignup ? "" : "customer@canteen.com");
            setPassword(nextIsSignup ? "" : "password123");
          }}
          className="text-xs font-bold text-primary hover:text-primary-hover"
        >
          {isSignup ? "Already have an account? Sign in" : "New customer? Create an account"}
        </button>
      </div>
    </div>
  );
}

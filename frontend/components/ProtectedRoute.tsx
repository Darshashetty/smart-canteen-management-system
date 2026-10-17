"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "../app/context/AppContext";
import { UserRole } from "../app/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  pageTitle: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  pageTitle,
}) => {
  const { isAuthenticated, role, currentUser } = useApp();

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 py-12 bg-white rounded-3xl shadow-xl border border-slate-100 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px]">lock</span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-headline font-extrabold text-slate-900">
            Login Required
          </h2>
          <p className="text-xs text-slate-500 max-w-xs">
            You must be logged in to access the <strong>{pageTitle}</strong> portal.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
        >
          Go to Login Page
        </Link>
      </div>
    );
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 py-12 bg-white rounded-3xl shadow-xl border border-slate-100 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px]">
            gpp_bad
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-headline font-extrabold text-slate-900">
            Access Denied
          </h2>
          <p className="text-xs text-slate-500 max-w-xs">
            Your current account (<strong>{currentUser.name}</strong> •{" "}
            <span className="uppercase text-orange-600 font-bold">{currentUser.role}</span>) does not have permission to access the <strong>{pageTitle}</strong> section.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Link
            href="/"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Back to Customer Menu
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
          >
            Switch Account Role
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

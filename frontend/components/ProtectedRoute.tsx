"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const { isAuthenticated, currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 py-12 bg-white rounded-3xl shadow-xl border border-border-subtle text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px]">
            gpp_bad
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-headline font-extrabold text-text-primary">
            Access Denied
          </h2>
          <p className="text-xs text-text-muted max-w-xs">
            Your current account (<strong>{currentUser.name}</strong> •{" "}
            <span className="uppercase text-primary font-bold">{currentUser.role}</span>) does not have permission to access the <strong>{pageTitle}</strong> section.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Link
            href="/"
            className="px-4 py-2.5 bg-primary-container hover:bg-primary-fixed text-on-primary-container border border-primary-fixed-dim font-bold text-xs rounded-xl transition-all"
          >
            Back to Customer Menu
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition-all"
          >
            Switch Account Role
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

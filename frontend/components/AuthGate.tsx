"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "../app/context/AppContext";

const PUBLIC_PATHS = ["/", "/login", "/menu"];

/**
 * Route guard: unauthenticated users may only see the landing page (/)
 * and the login page (/login). Every other page redirects to the landing page.
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isAuthReady } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
      const search =
        typeof window === "undefined" ? "" : window.location.search;
      const nextPath = `${pathname}${search}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [isAuthReady, isAuthenticated, pathname, router]);

  if (!isAuthReady) return null;
  if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) return null;

  return <>{children}</>;
};
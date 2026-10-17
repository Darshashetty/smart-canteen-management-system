"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "../app/context/AppContext";

const PUBLIC_PATHS = ["/", "/login"];

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
      router.replace("/");
    }
  }, [isAuthReady, isAuthenticated, pathname, router]);

  if (!isAuthReady) return null;

  return <>{children}</>;
};
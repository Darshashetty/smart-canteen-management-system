"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../app/context/AppContext";
import { UserRole } from "../app/types";
import { SmartCardTopUpModal } from "./SmartCardTopUpModal";

export const Header: React.FC = () => {
  const {
    role,
    cartCount,
    activeOrder,
    toastMessage,
    currentUser,
    logout,
    isAuthenticated,
  } = useApp();

  const pathname = usePathname();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const canAccessKitchen = isAuthenticated && ["kitchen", "manager", "admin"].includes(role);
  const canAccessManager = isAuthenticated && ["manager", "admin"].includes(role);
  const canAccessAdmin = isAuthenticated && role === "admin";

  const handleLogout = () => {
    setRoleMenuOpen(false);
    setMobileMenuOpen(false);
    logout();
  };

  const roleLabels: Record<UserRole, { title: string; badge: string; bg: string; defaultRoute: string }> = {
    customer: { title: "Customer / Student", badge: "Student Pass", bg: "bg-primary", defaultRoute: "/" },
    kitchen: { title: "Kitchen / Staff", badge: "Chef Station", bg: "bg-emerald-600", defaultRoute: "/kitchen" },
    manager: { title: "Canteen Manager", badge: "Manager AI", bg: "bg-blue-600", defaultRoute: "/manager" },
    admin: { title: "System Admin", badge: "Superuser", bg: "bg-purple-600", defaultRoute: "/admin" },
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pt-safe bg-white/90 backdrop-blur-xl border-b border-border-subtle shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 sm:h-20 px-3 sm:px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-primary via-[#E85D75] to-[#F5A3B3] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                restaurant
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-text-primary font-headline">
                  Smart Canteen
                </span>
                <span
                  className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full ${roleLabels[role].bg}`}
                >
                  {roleLabels[role].badge}
                </span>
              </div>
              <span className="hidden sm:block text-xs text-text-muted truncate">
                Campus Dining & Queue Hub
              </span>
            </div>
          </Link>

          {/* Navigation Links for Customer - Desktop */}
          {role === "customer" && (
            <nav className="hidden md:flex items-center gap-1 bg-surface-container-low/80 p-1.5 rounded-2xl border border-border-subtle">
              <Link
                href="/"
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  pathname === "/" || pathname === "/menu"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-primary-container hover:bg-primary-fixed/60"
                }`}
              >
                Menu
              </Link>
              <Link
                href="/cart"
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  pathname === "/cart"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-primary-container hover:bg-primary-fixed/60"
                }`}
              >
                Cart
                {cartCount > 0 && (
                  <span className="bg-primary text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/live-order"
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  pathname === "/live-order"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-primary-container hover:bg-primary-fixed/60"
                }`}
              >
                Live Token
                {activeOrder && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </Link>
              <Link
                href="/history"
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  pathname === "/history"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-primary-container hover:bg-primary-fixed/60"
                }`}
              >
                History
              </Link>
              <Link
                href="/preferences"
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  pathname === "/preferences"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-primary-container hover:bg-primary-fixed/60"
                }`}
              >
                Preferences
              </Link>
            </nav>
          )}

          {/* Navigation Links for Staff / Manager / Admin - Desktop */}
          {canAccessKitchen && (
            <div className="hidden md:flex items-center gap-2 text-xs font-bold">
              {(["kitchen", "manager", "admin"] as UserRole[]).includes(role) && (
                <Link
                  href="/kitchen"
                  className={`px-3.5 py-2 rounded-xl border transition-all ${
                    pathname === "/kitchen"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-surface-container-low text-text-muted hover:bg-surface-container border-border-subtle"
                  }`}
                >
                  Kitchen Board
                </Link>
              )}
              {canAccessManager && (
                <Link
                  href="/manager"
                  className={`px-3.5 py-2 rounded-xl border transition-all ${
                    pathname === "/manager"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-surface-container-low text-text-muted hover:bg-surface-container border-border-subtle"
                  }`}
                >
                  Manager Ops & AI
                </Link>
              )}
              {canAccessAdmin && (
                <Link
                  href="/admin"
                  className={`px-3.5 py-2 rounded-xl border transition-all ${
                    pathname === "/admin"
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-surface-container-low text-text-muted hover:bg-surface-container border-border-subtle"
                  }`}
                >
                  Admin Console
                </Link>
              )}
            </div>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Active Live Token Banner Pill */}
            {activeOrder && role === "customer" && (
              <Link
                href="/live-order"
                className="relative hidden sm:inline-flex items-center gap-1.5 bg-primary-fixed border border-primary-fixed-dim px-3 py-1.5 rounded-full hover:bg-primary-fixed transition-all shadow-sm active:scale-95"
              >
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="pulse-radar-dot absolute inline-flex h-2.5 w-2.5 rounded-full bg-primary"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                <span className="text-xs text-on-primary-fixed font-bold whitespace-nowrap">
                  #{activeOrder.tokenNumber}: {activeOrder.status}
                </span>
              </Link>
            )}

            {/* Cart Icon Trigger */}
            {role === "customer" && (
              <button
                onClick={() => setShowTopUp(true)}
                aria-label="Smart card balance"
                className="hidden sm:inline-flex items-center gap-1.5 bg-primary-container border border-primary-fixed-dim hover:bg-primary-fixed px-3 py-1.5 rounded-full transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">
                  contactless
                </span>
                <span className="text-xs font-extrabold text-text-primary whitespace-nowrap">
                  Rs. {(currentUser.smartCardBalance ?? 0).toFixed(0)}
                </span>
                <span className="material-symbols-outlined text-[14px] text-text-muted">
                  add
                </span>
              </button>
            )}
        {/* Mobile hamburger for staff/admin */}
            {canAccessKitchen && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container-low transition-colors"
                aria-label="Toggle navigation"
              >
                <span className="material-symbols-outlined text-[24px]">
                  {mobileMenuOpen ? "close" : "menu"}
                </span>
              </button>
            )}

            {/* Sign In button or Role Switcher / Profile Dropdown */}
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-extrabold shadow-md transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">
                  login
                </span>
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-primary-container hover:bg-primary-fixed rounded-full border border-primary-fixed-dim text-on-primary-container text-xs font-semibold transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    manage_accounts
                  </span>
                  <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name}</span>
                  <span className="material-symbols-outlined text-[16px]">
                    expand_more
                  </span>
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-border-subtle py-2 z-50 anim-fade-in-up">
                    <div className="px-4 py-2 border-b border-border-subtle">
                      <p className="text-xs font-bold text-text-primary">{currentUser.name}</p>
                      <p className="text-[11px] text-text-muted/70 truncate">{currentUser.email}</p>
                    </div>

                    <div className="px-4 py-3 text-xs font-semibold text-text-muted">
                      Signed in as {roleLabels[role].title}
                    </div>

                    <div className="pt-2 mt-1 border-t border-border-subtle px-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-between"
                      >
                        <span>Sign Out / Log Out</span>
                        <span className="material-symbols-outlined text-[16px]">
                          logout
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile slide-down nav for staff/admin */}
        {canAccessKitchen && mobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle bg-white px-3 py-3 flex flex-col gap-2 anim-fade-in-up">
            {(["kitchen", "manager", "admin"] as UserRole[]).includes(role) && (
              <Link
                href="/kitchen"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pathname === "/kitchen"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-surface-container-low text-text-muted"
                }`}
              >
                Kitchen Board
              </Link>
            )}
            {canAccessManager && (
              <Link
                href="/manager"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pathname === "/manager"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-surface-container-low text-text-muted"
                }`}
              >
                Manager Ops & AI
              </Link>
            )}
            {canAccessAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pathname === "/admin"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-surface-container-low text-text-muted"
                }`}
              >
              Admin Console
              </Link>
            )}
          </div>
        )}

        {/* Mobile Bottom Navigation Bar for Customer */}
        {role === "customer" && (
          <div className="md:hidden border-t border-border-subtle bg-white/95 px-1 py-1 pb-safe flex items-center justify-around">
            <Link
              href="/"
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] sm:text-xs font-semibold ${
                pathname === "/" || pathname === "/menu" ? "text-primary" : "text-text-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                restaurant_menu
              </span>
              <span>Menu</span>
            </Link>
            <Link
              href="/cart"
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] sm:text-xs font-semibold relative ${
                pathname === "/cart" ? "text-primary" : "text-text-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                shopping_cart
              </span>
              <span>Cart ({cartCount})</span>
            </Link>
            <Link
              href="/live-order"
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] sm:text-xs font-semibold ${
                pathname === "/live-order" ? "text-primary" : "text-text-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                confirmation_number
              </span>
              <span>Token</span>
            </Link>
            <Link
              href="/history"
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] sm:text-xs font-semibold ${
                pathname === "/history" ? "text-primary" : "text-text-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              <span>History</span>
            </Link>
            <Link
              href="/preferences"
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] sm:text-xs font-semibold ${
                pathname === "/preferences" ? "text-primary" : "text-text-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
              <span>Prefs</span>
            </Link>
          </div>
        )}
      </header>

      {/* Smart-card Add Money recharge */}
      <SmartCardTopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} />

      {/* Global Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto z-50 bg-inverse-surface text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/15 max-w-md anim-fade-in-up">
          <span className="material-symbols-outlined text-primary-fixed-dim text-[20px] shrink-0">
            info
          </span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </>
  );
};

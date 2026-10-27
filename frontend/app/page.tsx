"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "../components/Header";
import { CustomerHome } from "../components/CustomerHome";
import { useApp } from "./context/AppContext";

const LoginPromptButton: React.FC<{ children: React.ReactNode; className: string }> = ({
  children,
  className,
}) => {
  const { isAuthenticated, promptLogin } = useApp();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      router.push("/menu");
    } else {
      promptLogin("Please log in or create an account to place an order.");
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
};

/* ──────────── Data ──────────── */

const steps = [
  {
    number: "01",
    icon: "tune",
    title: "Browse & Pre-Order",
    text: "Filter live cafeteria menus by dietary tags (Vegetarian, Halal, Allergen-free), customize sauces, and book your guaranteed 15-minute pickup window.",
    note: "Allergen filters enabled",
    bgClass: "bg-primary-fixed",
    textClass: "text-status-limited-solid",
  },
  {
    number: "02",
    icon: "qr_code_2",
    title: "Get Digital Token",
    text: "Receive encrypted Token #C-023 with barcode & QR code pass synced straight to your Apple Wallet or Campus Card app.",
    note: "Wallet tap ready",
    bgClass: "bg-surface-container-highest",
    textClass: "text-tertiary",
  },
  {
    number: "03",
    icon: "notifications_active",
    title: "Track in Real Time",
    text: "Watch line cooks fire your order, monitor remaining prep countdowns, and get an automated SMS notification 5 minutes before pickup.",
    note: "Push chimes & alerts",
    bgClass: "bg-status-limited-bg",
    textClass: "text-status-limited-solid",
  },
  {
    number: "04",
    icon: "check_circle",
    title: "Quick Counter Pickup",
    text: "Bypass cafeteria queues entirely. Flash your screen at dedicated Express Heated Locker pods or Counter B for immediate hot food handover.",
    note: "Scan & walk away",
    bgClass: "bg-status-available-bg",
    textClass: "text-status-available-solid",
  },
];

const roles = [
  {
    icon: "school",
    title: "Students & Staff",
    text: "Browse daily rush menus, pre-order ahead of lectures, tap student card balances, and avoid cafeteria crowding.",
    features: [
      "Campus card & balance auto-sync",
      "Personalized allergen & diet alerts",
      "1-tap instant meal reordering",
    ],
    action: "Enter Customer App",
    actionIcon: "arrow_forward",
    href: "/menu",
    iconBg: "bg-primary-fixed",
    iconColor: "text-status-limited-solid",
    checkColor: "text-status-available-solid",
    btnClass:
      "bg-primary text-on-primary hover:bg-primary-hover",
  },
  {
    icon: "skillet",
    title: "Chefs & Line Staff",
    text: "Kitchen Display System (KDS) board with live queue priority sorting, ingredient 86 controls, and audio haptic chimes.",
    features: [
      "Glanceable high-contrast KDS board",
      "Automated delayed order rush alerts",
      "Instant 86 sold-out inventory switch",
    ],
    action: "Kitchen KDS Login",
    actionIcon: "desktop_windows",
    href: "/login",
    iconBg: "bg-surface-container-highest",
    iconColor: "text-tertiary",
    checkColor: "text-tertiary",
    btnClass:
      "bg-inverse-surface text-inverse-on-surface hover:bg-on-surface",
  },
  {
    icon: "monitoring",
    title: "Managers & Admins",
    text: "Configure slot capacity, adjust daily meal quotas, monitor peak rush analytics, and manage dining hall logistics.",
    features: [
      "Peak throughput velocity analytics",
      "Dynamic slot throttling & pacing rules",
      "Smart locker hardware telemetry",
    ],
    action: "Manager Portal",
    actionIcon: "settings",
    href: "/login",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface",
    checkColor: "text-text-primary",
    btnClass:
      "bg-primary-container text-on-primary-container border border-primary-fixed-dim hover:bg-primary-fixed",
  },
];

const pulseMetrics = [
  {
    label: "Current Wait Time",
    value: "~8 Mins",
    note: "Smooth Throughput",
    icon: "timer",
    iconColor: "text-status-available-solid",
    noteBg: "bg-status-available-bg",
    noteColor: "text-status-available-text",
    dotColor: "bg-status-available-solid",
  },
  {
    label: "Active Queue",
    value: "14 Orders",
    note: "Moderate Rush Flow",
    icon: "group_work",
    iconColor: "text-status-limited-solid",
    noteBg: "bg-status-limited-bg",
    noteColor: "text-status-limited-text",
    dotColor: "bg-status-limited-solid",
  },
  {
    label: "Popular Right Now",
    value: "Deluxe Chicken Burger",
    note: "42 portions served today",
    icon: "local_fire_department",
    iconColor: "text-primary",
    noteBg: "",
    noteColor: "text-text-muted",
    dotColor: "",
  },
  {
    label: "Next Ready Window",
    value: "1:15 PM",
    note: "12 express slots open",
    icon: "schedule",
    iconColor: "text-tertiary",
    noteBg: "",
    noteColor: "text-status-available-text",
    dotColor: "",
  },
];

const featureChips = [
  { icon: "lock_clock", label: "Smart Heated Pickup Lockers", color: "text-status-limited-solid" },
  { icon: "contactless", label: "Campus Card NFC & Apple Pay", color: "text-tertiary" },
  { icon: "verified_user", label: "Automated Allergy Guard", color: "text-secondary" },
  { icon: "speed", label: "Zero Queue Congestion", color: "text-status-available-solid" },
];

/* ──────────── Component ──────────── */

export default function LandingPage() {
  const { isAuthenticated, role, toastMessage } = useApp();

  if (isAuthenticated && role === "customer") {
    return (
      <div className="min-h-screen bg-surface-alt flex flex-col font-sans">
        <Header />
        <main className="flex-1 pt-16 md:pt-20">
          <CustomerHome />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt font-[Inter] text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 sm:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary text-white">
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">restaurant</span>
              </span>
              <span className="font-headline text-lg sm:text-xl font-bold tracking-tight text-on-surface">
                Smart Canteen
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-available-bg text-status-available-text border border-status-available-solid/20">
              <span className="w-2 h-2 rounded-full bg-status-available-solid animate-pulse" />
              <span className="text-[12px] font-bold tracking-wider">
                Open Now
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
              How It Works
            </a>
            <Link href="/menu" className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
              Menu
            </Link>
            <a href="#features" className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
              Features
            </a>
            <a href="#roles" className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
              For Kitchen &amp; Admins
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-primary-fixed-dim bg-primary-container text-on-primary-container text-xs sm:text-sm font-semibold hover:bg-primary-fixed transition-colors min-h-[38px] sm:min-h-[44px]"
            >
              Log In
            </Link>
            <LoginPromptButton
              className="inline-flex items-center justify-center px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary-hover transition-colors min-h-[38px] sm:min-h-[44px]"
            >
              Order Now
        </LoginPromptButton>
      </div>
        </div>
      </header>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="w-full pt-16 sm:pt-20 bg-surface-alt">
        <div className="flex flex-col w-full">
          {/* ─── SECTION 1: HERO ─── */}
          <section className="relative w-full overflow-hidden bg-surface-alt py-8 sm:py-12 lg:py-20">
            {/* Ambient glow blobs */}
            <div className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-primary-fixed/40 blur-3xl" />
            <div className="pointer-events-none absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-secondary-fixed/30 blur-3xl" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
                {/* Left: Copy */}
                <div className="lg:col-span-6 flex flex-col space-y-5 sm:space-y-6 anim-fade-in-up">
                  <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-status-limited-bg text-status-limited-text shadow-sm">
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-status-limited-solid">
                      bolt
                    </span>
                    <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider">
                      Lunch Rush Is On
                    </span>
                  </div>

                  <h1 className="font-headline text-3xl sm:text-5xl lg:text-[48px] lg:leading-[56px] font-bold tracking-tight text-text-primary">
                    Skip the Lunch Rush,{" "}
                    <br className="hidden sm:inline" />
                    <span className="text-primary">Not Your Meal.</span>
                  </h1>

                  <p className="text-base sm:text-lg leading-6 sm:leading-7 text-text-muted max-w-xl">
                    Pre-order food before your break starts, track live kitchen
                    prep times, and grab your tray with a digital token without
                    waiting in line.
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
            <LoginPromptButton
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-primary text-on-primary text-sm sm:text-base font-semibold shadow-md hover:bg-primary-hover transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px]"
            >
              <span className="material-symbols-outlined text-[20px]">
                restaurant
              </span>
              <span>Pre-Order Your Meal</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </LoginPromptButton>
                    <a
                      href="#pulse-widget"
                      className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl border border-primary-fixed-dim bg-primary-container text-on-primary-container text-sm sm:text-base font-semibold shadow-sm hover:bg-primary-fixed transition-all min-h-[48px] sm:min-h-[52px]"
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-available-solid opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-available-solid" />
                      </span>
                      <span>Check Pickup Times</span>
                    </a>
                  </div>

                  {/* Proof chips */}
                  <div className="flex flex-wrap items-center gap-3 pt-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface shadow-sm text-text-primary text-[12px] font-bold">
                      <span className="text-status-limited-solid font-bold">⚡</span>
                      <span>12 min avg prep time</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface shadow-sm text-text-primary text-[12px] font-bold">
                      <span className="text-status-available-solid font-bold">🚫</span>
                      <span>Zero counter wait</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface shadow-sm text-text-primary text-[12px] font-bold">
                      <span className="text-tertiary font-bold">📱</span>
                      <span>Digital meal pass</span>
                    </div>
                  </div>
                </div>

                {/* Right: Order Card Mockup */}
                <div className="lg:col-span-6 relative anim-fade-in-up" style={{ animationDelay: "120ms" }}>
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary-fixed-dim/30 to-surface-container-highest/50 rounded-3xl blur-xl" />
                  <div className="relative bg-surface rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
                    {/* Order Header */}
                    <div className="flex items-center justify-between pb-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-fixed flex items-center justify-center text-status-limited-solid font-bold font-headline text-lg">
                          #C
                        </div>
                        <div>
                          <div className="font-headline text-lg font-bold text-text-primary">
                            Order #C-023
                          </div>
                          <div className="text-sm text-text-muted">
                            Central Hub • Station 2
                          </div>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-limited-bg text-status-limited-text text-[12px] font-semibold">
                        <span className="h-2 w-2 rounded-full bg-status-limited-solid animate-pulse" />
                        <span>Est. 6 mins</span>
                      </div>
                    </div>

                    {/* Meal Summary */}
                    <div className="bg-surface-container-low rounded-xl p-4 flex gap-4 items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="w-16 h-16 rounded-lg object-cover shadow-sm shrink-0"
                        src="https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=200&q=80"
                        alt="Deluxe Chicken Burger Combo"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-text-primary truncate">
                          Deluxe Chicken Burger Combo
                        </div>
                        <div className="text-sm text-text-muted truncate">
                          Extra Crispy Fries • Peach Iced Tea
                        </div>
                        <div className="text-[12px] font-medium text-status-available-text mt-0.5">
                          Special request: Dressing on side
                        </div>
                      </div>
                    </div>

                    {/* Stepper Progress */}
                    <div className="py-6">
                      <div className="flex items-center justify-between relative">
                        {/* Connector Bar */}
                        <div className="absolute top-4 left-4 right-4 h-1 bg-surface-container-high z-0">
                          <div className="h-full bg-status-limited-solid transition-all duration-700 w-3/4" />
                        </div>
                        {/* Steps */}
                        {[
                          { icon: "check", label: "Placed", done: true },
                          { icon: "check", label: "Accepted", done: true },
                          { icon: "skillet", label: "Cooking", active: true },
                          { icon: "room_service", label: "Pickup", pending: true },
                        ].map((step) => (
                          <div key={step.label} className="relative z-10 flex flex-col items-center gap-1.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                                step.done
                                  ? "bg-status-available-solid text-on-primary"
                                  : step.active
                                  ? "bg-status-limited-solid text-on-primary shadow-md gentle-bounce"
                                  : "bg-surface-container-high text-text-muted"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {step.icon}
                              </span>
                            </div>
                            <span
                              className={`text-[12px] font-bold ${
                                step.active
                                  ? "text-status-limited-solid"
                                  : "text-text-muted"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* QR Pickup Lane */}
                    <div className="bg-surface-alt rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-surface p-2 rounded-lg shadow-sm shrink-0 flex items-center justify-center">
                          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" className="text-text-primary">
                            <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
                            <rect x="8" y="8" width="8" height="8" rx="1" fill="#FFFFFF" />
                            <rect x="28" y="4" width="16" height="16" rx="2" fill="currentColor" />
                            <rect x="32" y="8" width="8" height="8" rx="1" fill="#FFFFFF" />
                            <rect x="4" y="28" width="16" height="16" rx="2" fill="currentColor" />
                            <rect x="8" y="32" width="8" height="8" rx="1" fill="#FFFFFF" />
                            <rect x="28" y="28" width="6" height="6" fill="currentColor" />
                            <rect x="38" y="28" width="6" height="6" fill="currentColor" />
                            <rect x="28" y="38" width="16" height="6" fill="currentColor" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">
                            Counter B • Express Locker #14
                          </div>
                          <div className="text-sm text-text-muted">
                            Scan screen at door sensor to unlock tray
                          </div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-text-muted text-[24px]">
                        qr_code_scanner
                      </span>
                    </div>

                    {/* Toast overlay */}
                    <div className="mt-4 bg-inverse-surface text-inverse-on-surface p-3 rounded-xl flex items-center gap-3 shadow-lg">
                      <div className="w-2.5 h-2.5 rounded-full bg-status-available-solid shrink-0" />
                      <p className="text-[12px] font-semibold truncate">
                        Chef Marcus accepted your order • Griddle Station B
                      </p>
                      <span className="text-[12px] font-semibold text-outline-variant shrink-0 ml-auto">
                        Just now
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── SECTION 2: LIVE PULSE WIDGET ─── */}
          <section id="pulse-widget" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10">
            <div className="bg-surface rounded-2xl p-4 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-error animate-ping" />
                  <div>
                    <h2 className="font-headline text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                      Live Cafeteria Pulse • Central Dining Hall
                    </h2>
                    <p className="text-xs sm:text-sm text-text-muted">
                      Real-time load balancing and smart kitchen throughput metrics
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 self-start md:self-auto px-3 py-1.5 rounded-full bg-surface-container-low text-text-muted text-[11px] sm:text-[12px] font-bold">
                  <span className="material-symbols-outlined text-[16px] text-status-available-solid">
                    sync
                  </span>
                  <span>Updated 4 seconds ago</span>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {pulseMetrics.map((m) => (
                  <div key={m.label} className="bg-surface-alt rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted mb-2">
                      <span className="text-xs sm:text-sm font-semibold">{m.label}</span>
                      <span className={`material-symbols-outlined text-[20px] ${m.iconColor}`}>
                        {m.icon}
                      </span>
                    </div>
                    <div
                      className={`font-headline font-bold text-text-primary ${
                        m.label === "Popular Right Now"
                          ? "text-base sm:text-lg"
                          : "text-xl sm:text-2xl"
                      } line-clamp-1`}
                    >
                      {m.value}
                    </div>
                    {m.dotColor ? (
                      <div
                        className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md ${m.noteBg} ${m.noteColor} text-[11px] sm:text-[12px] font-bold self-start`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${m.dotColor}`} />
                        <span>{m.note}</span>
                      </div>
                    ) : (
                      <div className={`mt-2 text-xs sm:text-sm ${m.noteColor} font-semibold`}>
                        {m.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Capacity Bar */}
              <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 bg-surface-alt rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs sm:text-sm font-semibold text-text-primary">
                      Kitchen Production Capacity: 64%
                    </span>
                    <span className="text-[11px] sm:text-[12px] font-bold text-status-available-text">
                      Mobile ordering fully open
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-status-limited-solid h-full rounded-full transition-all duration-500"
                      style={{ width: "64%" }}
                    />
                  </div>
                </div>
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary-hover shrink-0 min-h-[42px] sm:min-h-[44px]"
                >
                  <span>Reserve Next Slot</span>
                  <span className="material-symbols-outlined text-[18px]">
                    keyboard_arrow_right
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* ─── SECTION 3: HOW IT WORKS ─── */}
          <section id="how-it-works" className="w-full py-10 sm:py-16 bg-surface-container-low/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
              <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
                <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest text-status-limited-solid">
                  Effortless Campus Dining in 4 Simple Steps
                </span>
                <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mt-2 tracking-tight">
                  How Smart Canteen Works
                </h2>
                <p className="text-sm sm:text-base text-text-muted mt-2 sm:mt-3">
                  From lecture hall to lunch tray in minutes. Engineered to
                  eliminate queue friction.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {steps.map((s) => (
                  <div
                    key={s.number}
                    className="bg-surface rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300"
                  >
                    <div>
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${s.bgClass} flex items-center justify-center ${s.textClass} mb-3 sm:mb-4 font-bold font-headline text-lg sm:text-xl`}
                      >
                        {s.number}
                      </div>
                      <h3 className="font-headline text-base sm:text-lg font-bold text-text-primary mb-1.5 sm:mb-2">
                        {s.title}
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-text-muted">
                        {s.text}
                      </p>
                    </div>
                    <div
                      className={`mt-4 sm:mt-6 pt-3 sm:pt-4 flex items-center gap-2 ${s.textClass} text-[11px] sm:text-[12px] font-semibold border-t border-border-subtle sm:border-0`}
                    >
                      <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                        {s.icon}
                      </span>
                      <span>{s.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── SECTION 4: ROLE PORTAL SWITCHER ─── */}
          <section id="roles" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-16">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest text-status-limited-solid">
                Bespoke Views
              </span>
              <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mt-2 tracking-tight">
                Designed for Everyone in the Dining Ecosystem
              </h2>
              <p className="text-sm sm:text-base text-text-muted mt-2 sm:mt-3">
                Tailored high-velocity workflows for hungry eaters, busy
                kitchen chefs, and dining supervisors.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {roles.map((r) => (
                <div
                  key={r.title}
                  className="bg-surface rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${r.iconBg} flex items-center justify-center ${r.iconColor} mb-4 sm:mb-6`}
                    >
                      <span className="material-symbols-outlined text-[24px] sm:text-[28px]">
                        {r.icon}
                      </span>
                    </div>
                    <h3 className="font-headline text-xl sm:text-2xl font-bold text-text-primary mb-2">
                      {r.title}
                    </h3>
                    <p className="text-sm sm:text-base text-text-muted mb-4 sm:mb-6">{r.text}</p>
                    <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                      {r.features.map((f) => (
                        <div key={f} className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold text-text-primary">
                          <span className={`material-symbols-outlined ${r.checkColor} text-[18px] sm:text-[20px]`}>
                            check_circle
                          </span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-6 sm:pt-8">
                    <Link
                      href={r.href}
                      className={`w-full inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors min-h-[44px] sm:min-h-[48px] ${r.btnClass}`}
                    >
                      <span>{r.action}</span>
                      <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                        {r.actionIcon}
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── SECTION 5: FEATURE HIGHLIGHTS & SOCIAL PROOF ─── */}
          <section id="features" className="w-full bg-surface py-10 sm:py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col gap-8 sm:gap-10">
              {/* Feature Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
                {featureChips.map((c) => (
                  <div
                    key={c.label}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-surface-alt text-text-primary text-xs sm:text-sm font-semibold shadow-sm"
                  >
                    <span className={`material-symbols-outlined text-[18px] sm:text-[20px] ${c.color}`}>
                      {c.icon}
                    </span>
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Quote Banner */}
              <div className="bg-gradient-to-r from-surface-container-low via-surface-alt to-surface-container-low rounded-2xl p-5 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
                <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-3 sm:gap-4">
                  <span className="material-symbols-outlined text-[32px] sm:text-[40px] text-status-limited-solid opacity-60">
                    format_quote
                  </span>
                  <p className="font-headline text-base sm:text-xl text-text-primary font-semibold leading-relaxed">
                    &ldquo;Reduced our peak noon rush wait from 25 minutes down
                    to an 8-minute grab-and-go experience across 4,000 daily
                    campus meals.&rdquo;
                  </p>
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1 mt-1 sm:mt-2">
                    <div className="text-sm sm:text-base font-bold text-text-primary">
                      Central Campus Dining Operations
                    </div>
                    <div className="text-xs sm:text-sm text-text-muted">
                      Serving 18,000 faculty, researchers &amp; students daily
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="w-full bg-surface-container-low/70 py-8 sm:py-10 shadow-[0_-1px_6px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 bg-surface px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border-subtle shadow-sm max-w-full">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px] sm:text-[20px] shrink-0">
                  location_on
                </span>
                <select className="bg-transparent text-xs sm:text-sm font-semibold text-on-surface focus:outline-none cursor-pointer pr-2 max-w-[200px] sm:max-w-none truncate">
                  <option>Main Campus Central Cafeteria</option>
                  <option>Science &amp; Tech Hub Dining</option>
                  <option>North Quad Express Pantry</option>
                  <option>South Hall Executive Dining</option>
                </select>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full bg-surface border border-border-subtle text-status-available-text self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-status-available-solid shadow-[0_0_8px_rgba(22,163,74,0.6)]" />
                <span className="text-[11px] sm:text-[12px] font-semibold">
                  Open Today · 8 AM – Midnight
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <Link href="/menu" className="text-xs sm:text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                View Menu
              </Link>
              <a href="#how-it-works" className="text-xs sm:text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                Find Us
              </a>
              <a href="#" className="text-xs sm:text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                Allergen Guide
              </a>
              <a href="#" className="text-xs sm:text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                Contact Us
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface-variant">
            <p className="text-xs sm:text-sm text-center sm:text-left">
              © 2026 Smart Canteen. Fresh meals, ready when you are.
            </p>
            <span className="text-[11px] sm:text-[12px] font-bold text-text-muted">
              Dine-in · Takeaway · Pre-order
            </span>
          </div>
        </div>
      </footer>

      {/* Global Floating Toast Alert (guest view) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto z-[60] bg-inverse-surface text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/15 max-w-md sm:ml-auto anim-fade-in-up">
          <span className="material-symbols-outlined text-primary-fixed-dim text-[20px] shrink-0">
            info
          </span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

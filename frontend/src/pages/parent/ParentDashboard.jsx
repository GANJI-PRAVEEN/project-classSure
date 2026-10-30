
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Users,
  ClipboardCheck,
  Wallet,
  LogOut,
  History as HistoryIcon,
  ShieldCheck,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import MyChildren from "./MyChildren";
import Review from "./Review";
import HistorySection from "./History";
import TodaysTuitions from "./TodaysTuitions";
import ParentOverview from "./ParentOverview";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });
  const parentName = currentUser?.name || currentUser?.fullName || "Parent";

  const menuItems = [
    { label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
    { label: "My Children", shortLabel: "Children", icon: Users },
    { label: "History", shortLabel: "History", icon: HistoryIcon },
    { label: "Reviews", shortLabel: "Reviews", icon: ClipboardCheck },
    { label: "Payments", shortLabel: "Payments", icon: Wallet },
  ];

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Highlighted Web Application Logo */}
          <button
            type="button"
            onClick={() => setActiveSection("Overview")}
            className="group flex items-center gap-3 text-left focus:outline-hidden"
            aria-label="ClassSure Home"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-white/90 transition-transform duration-300 group-hover:scale-105">
              <GraduationCap size={22} className="text-white drop-shadow-xs" strokeWidth={2.4} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-white" />
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-950 transition-colors">
                  Class<span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent font-black">Sure</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase text-blue-700 shadow-2xs">
                  <Sparkles size={10} className="text-blue-600" />
                  Academic Suite
                </span>
              </div>
              <span className="hidden lg:block text-[10px] font-medium text-slate-400 -mt-0.5 tracking-wide">
                Parent Academic Monitoring
              </span>
            </div>
          </button>

          {/* Active Section Breadcrumb Badge (Desktop) */}
          <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-1.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active:</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              {activeSection}
            </span>
          </div>

          {/* Right Side: Special Role Indicator & Logout */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Special Parent Role Indicator Pill */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-white px-2.5 sm:px-3 py-1.5 shadow-2xs hover:border-indigo-300 transition-all">
              <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-xs ring-2 ring-indigo-200/80">
                {parentName.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="max-w-[85px] sm:max-w-[120px] truncate text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    {parentName}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-2xs">
                    <ShieldCheck size={11} strokeWidth={2.4} />
                    Parent
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 truncate">
                  Parent Portal
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 shadow-2xs active:scale-95"
              aria-label="Logout"
              title="Sign out of ClassSure"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop Sidebar (hidden on mobile) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white p-4 lg:flex sticky top-16 h-[calc(100vh-4rem)]">
          <div className="px-3 pb-3 pt-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Parent Menu
            </p>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {menuItems.length} Tabs
            </span>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map(({ label, icon: Icon }) => {
              const isActive = activeSection === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setActiveSection(label);
                    setSidebarOpen(false);
                  }}
                  className={`relative group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-transparent text-blue-700 shadow-xs border border-blue-100/70 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1.5 before:rounded-r-full before:bg-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700"
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.4 : 1.9} />
                  </div>
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                <p className="text-xs font-bold text-slate-900">
                  Academic Guarantee
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Verified timestamps and tutor logs ensure transparent hourly billing for your enrolled children.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-28 lg:pb-8">
          <div className="mx-auto max-w-6xl">
            {(activeSection === "Overview" || activeSection === "Current Activities") && (
              <ParentOverview onNavigateToTab={setActiveSection} />
            )}

            {activeSection === "My Children" && (
              <section>
                <MyChildren />
              </section>
            )}

            {activeSection === "History" && (
              <section>
                <HistorySection />
              </section>
            )}

            {activeSection === "Reviews" && (
              <section>
                <Review />
              </section>
            )}

            {activeSection === "Payments" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Payments & Billing
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Review tuition invoices, fee receipts, and payment history.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
                    <Wallet size={26} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    No payment records found
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Tuition invoices, fee receipts, and payment transactions will appear here when active schedules are billed.
                  </p>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar (replaces sidebar on mobile) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {menuItems.map(({ label, shortLabel, icon: Icon }) => {
            const isActive = activeSection === label;

            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setActiveSection(label);
                  setSidebarOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                </div>
                <span className="text-[10px] leading-none truncate max-w-[62px]">
                  {shortLabel || label}
                </span>
                {isActive && (
                  <span className="h-1 w-4 rounded-full bg-blue-600 -mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

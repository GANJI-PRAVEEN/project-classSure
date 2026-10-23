
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  CalendarDays,
  Users,
  ClipboardCheck,
  Wallet,
  LogOut,
} from "lucide-react";
import MyChildren from "./MyChildren";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Current Activities");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { label: "Current Activities", shortLabel: "Activities", icon: CalendarDays },
    { label: "My Children", shortLabel: "Children", icon: Users },
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-xs">
                C
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Class<span className="text-blue-600">Sure</span>
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Parent Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => setActiveSection("Current Activities")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeSection === "Current Activities"
                    ? "text-blue-600 bg-blue-50/70"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Home
              </button>
            </nav>

            <div className="hidden h-4 w-px bg-slate-200 md:block" />

            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                P
              </div>
              <span className="text-xs font-medium text-slate-600">Parent</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Logout"
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
          <div className="px-3 pb-3 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </p>
          </div>

          <nav className="space-y-1">
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
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold text-slate-800">
                Tuition Support
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Need help coordinating with tutors? ClassSure is here to help.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-28 lg:pb-8">
          <div className="mx-auto max-w-6xl">
            {activeSection === "Current Activities" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Current Activities
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Track today's tuition schedules and ongoing learning sessions.
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
                    <CalendarDays size={26} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    No schedules to display today
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Your scheduled tuition sessions will appear here once approved by your assigned tutor.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection("My Children")}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    View Children & Schedules →
                  </button>
                </div>
              </section>
            )}

            {activeSection === "My Children" && (
              <section>
                <MyChildren />
              </section>
            )}

            {activeSection === "Reviews" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Reviews & Feedback
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    View feedback and performance evaluations from your children's tutors.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
                    <ClipboardCheck size={26} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    No reviews available yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Tutor feedback reports and progress evaluations will be listed here after tuition sessions are completed.
                  </p>
                </div>
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
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.04)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-4 h-16">
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
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    isActive ? "bg-blue-50 text-blue-600" : "text-slate-500"
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                </div>
                <span className="text-[11px] leading-none truncate max-w-[76px]">
                  {shortLabel || label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

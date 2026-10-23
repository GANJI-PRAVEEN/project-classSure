import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  History,
  Wallet,
  ClipboardList,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react";
import MyStudents from "./MyStudent.jsx";
import Requests from "./Requests.jsx";

const menuItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My Students", icon: Users },
  { label: "History", icon: History },
  { label: "Earnings & Payments", icon: Wallet },
  { label: "Requests", icon: ClipboardList },
];

export default function TutorDashboard() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                C
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Class<span className="text-blue-600">Sure</span>
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="mr-4 text-sm text-slate-500">
              Tutor workspace
            </span>
            <button
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>
            <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              T
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 md:hidden"
            aria-label="Logout"
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed bottom-0 left-0 top-16 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-60 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="border-b border-slate-100 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tutor menu
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Manage your tuition
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {menuItems.map(({ label, icon: Icon }) => {
              const active = activeSection === label;

              return (
                <button
                  key={label}
                  onClick={() => {
                    setActiveSection(label);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <Icon size={19} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={16} />}
                </button>
              );
            })}
          </nav>

          <div className="m-3 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Keep your schedule updated
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Manage your sessions to keep parents informed.
            </p>
          </div>
        </aside>

        {/* Main dashboard content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {activeSection === "Overview" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Overview
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Welcome to your tutor workspace.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "My Students" && (
              <section>
                <MyStudents />
              </section>
            )}

            {activeSection === "History" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    History
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    View past tuition sessions.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "Earnings & Payments" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Earnings & Payments
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Track your tuition payments and invoices.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "Requests" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Requests
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage incoming tuition requests.
                  </p>
                </div>
                <Requests />
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

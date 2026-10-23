
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
    { label: "Current Activities", icon: CalendarDays },
    { label: "My Children", icon: Users },
    { label: "Reviews", icon: ClipboardCheck },
    { label: "Payments", icon: Wallet },
  ];

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

            <h1 className="text-xl font-bold tracking-tight">
              Class<span className="text-blue-600">Sure</span>
            </h1>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <button
              onClick={() => setActiveSection("Current Activities")}
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              Home
            </button>
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Dashboard layout */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-20 bg-black/30 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed bottom-0 left-0 top-16 z-30 w-64 border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-60 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="border-b border-slate-100 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Parent Portal
            </p>
          </div>

          <nav className="space-y-1 p-3">
            {menuItems.map(({ label, icon: Icon }) => {
              const isActive = activeSection === label;

              return (
                <button
                  key={label}
                  onClick={() => {
                    setActiveSection(label);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${isActive
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {activeSection}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your children's tuition in one place.
              </p>
            </div>

            {activeSection === "Current Activities" && (
              <section className="mt-8">
                <div className="mb-5 flex items-center gap-2">
                  <CalendarDays size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Today's Schedules
                  </h3>
                </div>

                {/* Schedule cards will be added when real data is connected */}
                <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <CalendarDays
                    size={32}
                    className="text-slate-400"
                    strokeWidth={1.5}
                  />
                  <p className="mt-3 font-medium text-slate-700">
                    No schedules to display yet
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Your scheduled tuition sessions will appear here once
                    they're available.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "My Children" && (
              <section className="mt-8">
                <MyChildren />
              </section>
            )}

            {activeSection === "Reviews" && (
              <section className="mt-8">
                {/* Session review UI will be implemented separately */}
              </section>
            )}

            {activeSection === "Payments" && (
              <section className="mt-8">
                {/* Payment information UI will be implemented separately */}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


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
  Search,
  LogOut,
  CalendarDays,
  Clock3,
  IndianRupee,
  BookOpen,
  ChevronRight,
  Star,
} from "lucide-react";

const menuItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My Students", icon: Users },
  { label: "History", icon: History },
  { label: "Earnings & Payments", icon: Wallet },
  { label: "Requests", icon: ClipboardList },
];

const insights = [
  {
    label: "Total Classes",
    value: "24",
    detail: "Scheduled this month",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Hours Taught",
    value: "36.5",
    detail: "Confirmed teaching hours",
    icon: Clock3,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Earnings",
    value: "₹12,500",
    detail: "This month's earnings",
    icon: IndianRupee,
    color: "bg-emerald-50 text-emerald-600",
  },
];

const schedules = [
  {
    id: 1,
    title: "Mathematics",
    parent: "Ramesh Kumar",
    student: "Aarav Kumar",
    time: "6:00 PM – 7:00 PM",
    days: "Mon, Wed, Fri",
    status: "Active",
    initials: "AK",
  },
  {
    id: 2,
    title: "Physics",
    parent: "Suresh Reddy",
    student: "Ananya Reddy",
    time: "7:00 PM – 8:00 PM",
    days: "Tue, Thu, Sat",
    status: "Active",
    initials: "AR",
  },
  {
    id: 3,
    title: "Computer Science",
    parent: "Priya Sharma",
    student: "Vihaan Sharma",
    time: "5:00 PM – 6:00 PM",
    days: "Mon, Tue, Thu",
    status: "Pending",
    initials: "VS",
  },
];

export default function TutorDashboard() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
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
          className={`fixed bottom-0 left-0 top-16 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-60 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={19} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={16} />}
                  {label === "Requests" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      2
                    </span>
                  )}
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

        {/* Main dashboard */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {/* Page heading */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Monday, October 19
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {activeSection === "Overview"
                    ? "Tutor Dashboard"
                    : activeSection}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Here's an overview of your teaching activities.
                </p>
              </div>

              <div className="flex gap-3">
                <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  <CalendarDays size={17} />
                  This month
                </button>
                <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                  <Search size={17} />
                  Find
                </button>
              </div>
            </div>

            {/* Daily insights */}
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Daily Insights
                </h2>
                <span className="text-xs text-slate-500">
                  Sample figures
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {insights.map(({ label, value, detail, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {label}
                        </p>
                        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                          {value}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 ${color}`}>
                        <Icon size={21} />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Schedules */}
            <section className="mt-9">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Tuition Schedules
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review your assigned students and upcoming sessions.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection("History")}
                  className="self-start text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View history →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {schedules.map((schedule) => (
                  <article
                    key={schedule.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-semibold text-blue-700">
                          {schedule.initials}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {schedule.title}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {schedule.days}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          schedule.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {schedule.status}
                      </span>
                    </div>

                    <div className="my-5 space-y-3 border-y border-slate-100 py-4">
                      <div>
                        <p className="text-xs text-slate-400">
                          Parent
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {schedule.parent}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">
                          Student
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {schedule.student}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock3 size={16} className="text-slate-400" />
                        {schedule.time}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => alert("Reschedule flow will be added next.")}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => alert("Session activation flow will be added next.")}
                        className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        {schedule.status === "Active" ? "View details" : "Activate"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-slate-400">
              © 2026 ClassSure. Manage tuition with confidence.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

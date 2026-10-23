import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  History,
  Wallet,
  ClipboardList,
  LogOut,
  CalendarCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import MyStudents from "./MyStudent.jsx";
import Requests from "./Requests.jsx";
import TuitionCard from "./TuitionCard.jsx";
import {
  getTodaySchedulesAPI,
  getParentDetailsAPI,
  getStudentDetailsAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
} from "../../API/api.js";

const menuItems = [
  { label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { label: "My Students", shortLabel: "Students", icon: Users },
  { label: "History", shortLabel: "History", icon: History },
  { label: "Earnings & Payments", shortLabel: "Earnings", icon: Wallet },
  { label: "Requests", shortLabel: "Requests", icon: ClipboardList },
];

export default function TutorDashboard() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleError, setScheduleError] = useState("");

  async function fetchTodaySchedules() {
    try {
      setLoadingSchedules(true);
      setScheduleError("");

      const response = await getTodaySchedulesAPI();
      const responseText = await response.text();
      let result = {};
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse today schedules JSON:", e);
        }
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to load today's schedules");
      }

      const schedules = Array.isArray(result.data) ? result.data : [];

      const enriched = await Promise.all(
        schedules.map(async (schedule) => {
          let parent = null;
          let student = null;

          // Fetch parent details
          if (schedule.parentId) {
            try {
              const pRes = await getParentDetailsAPI(schedule.parentId);
              if (pRes.ok) {
                const pData = await pRes.json();
                parent = pData.data ?? null;
              }
            } catch (err) {
              console.error("Error fetching parent details:", err);
            }
          }

          // Fetch student details
          if (schedule.childId) {
            try {
              const sRes = await getStudentDetailsAPI(schedule.childId);
              if (sRes.ok) {
                const sData = await sRes.json();
                student = sData.data ?? null;
                console.log("students data", student);
                // Resolve subjects if IDs are present
                if (student && Array.isArray(student.subjectIds) && student.subjectIds.length > 0) {
                  // console.log("subjects hai")
                  try {
                    console.log("subject ids ", student.subjectIds);
                    const subRes = await getSubjectsByIdsAPI(student.subjectIds);
                    if (subRes.ok) {
                      const subData = await subRes.json();
                      console.log("fetched subjects", subData);
                      if (Array.isArray(subData)) {
                        student = {
                          ...student,
                          subjects: subData.map((s) => s.name ?? s.subjectName),
                        };
                      }
                    }
                    else console.log("subRes is not okay", subRes.message);
                  } catch {
                    // ignore
                  }
                }

                // Resolve board if present
                if (student && student.board) {
                  try {
                    const bRes = await getBoardByIdAPI(student.board);
                    if (bRes.ok) {
                      const bData = await bRes.json();
                      student = {
                        ...student,
                        board: bData.name ?? bData.boardName ?? student.board,
                      };
                    }
                  } catch {
                    // ignore
                  }
                }

                //
              }
            } catch (err) {
              console.error("Error fetching student details:", err);
            }
          }

          return {
            ...schedule,
            id: schedule.id || schedule._id,
            student,
            parent,
            subjects: student?.subjects || []
          };
        })
      );

      // Sort today's schedules by start time
      enriched.sort((a, b) => {
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });

      setTodaySchedules(enriched);
    } catch (err) {
      console.error("Error fetching today's schedules:", err);
      setScheduleError(err.message || "Failed to load today's schedules");
    } finally {
      setLoadingSchedules(false);
    }
  }

  useEffect(() => {
    fetchTodaySchedules();
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.location.href = "/login";
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
              Tutor Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => setActiveSection("Overview")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${activeSection === "Overview"
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
                T
              </div>
              <span className="text-xs font-medium text-slate-600">Tutor</span>
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
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${isActive
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
                Tuition Schedule
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Keep class statuses updated so parents receive timely confirmations.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-28 lg:pb-8">
          <div className="mx-auto max-w-6xl">
            {activeSection === "Overview" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Overview
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Welcome to your tutor workspace. Manage students, tuition timings, and requests.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                  <div
                    onClick={() => setActiveSection("My Students")}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Assigned Students
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          View Roster →
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60">
                        <Users size={22} strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveSection("Requests")}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Tuition Requests
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Check Pending →
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60">
                        <ClipboardList size={22} strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveSection("Earnings & Payments")}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all group sm:col-span-2 lg:col-span-1"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Earnings & Billing
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          View Statements →
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60">
                        <Wallet size={22} strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Activity Section */}
                {loadingSchedules ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 sm:p-14 text-center shadow-xs">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                      <p className="mt-3 text-sm font-medium text-slate-500">
                        Loading today&apos;s tuition schedule...
                      </p>
                    </div>
                  </div>
                ) : scheduleError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                      <AlertCircle size={20} />
                    </div>
                    <p className="text-sm font-medium text-rose-700">{scheduleError}</p>
                    <button
                      type="button"
                      onClick={fetchTodaySchedules}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      <RefreshCw size={13} />
                      Retry
                    </button>
                  </div>
                ) : todaySchedules.length === 0 ? (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        Current Activity
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Your scheduled tuition sessions
                      </p>
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-12 text-center shadow-xs">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                        <CalendarCheck size={26} strokeWidth={1.8} />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">
                        No scheduled sessions today
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                        You don&apos;t have any tuition classes scheduled for today. Check your student roster or pending requests to review upcoming arrangements.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSection("My Students")}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        View Assigned Students →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        Current Activity
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Your scheduled tuition sessions
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {todaySchedules.map((item) => (
                        <TuitionCard
                          key={item.id}
                          schedule={item}
                          student={item.student}
                          parent={item.parent}
                          subjects={item.subjects}
                          onStartTimer={(schedule) => {
                            // Connect your start-session logic here.
                            console.log("Start timer:", schedule.id);
                          }}
                          onReschedule={(schedule) => {
                            // Open your reschedule modal here.
                            console.log("Reschedule:", schedule.id);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

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
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Session History
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    View records and attendance of past tuition classes.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
                    <History size={26} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    No session history yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Completed tuition classes and attendance logs will appear here as sessions finish.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "Earnings & Payments" && (
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Earnings & Payments
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Track your tuition payments, monthly compensation, and invoices.
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
                    <Wallet size={26} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    No payment records yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Compensation details and tuition billing records will appear here as active sessions are processed.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "Requests" && (
              <section>
                <Requests />
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
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive
                  ? "text-blue-600 font-semibold"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isActive ? "bg-blue-50 text-blue-600" : "text-slate-500"
                    }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                </div>
                <span className="text-[10px] leading-none truncate max-w-[62px]">
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

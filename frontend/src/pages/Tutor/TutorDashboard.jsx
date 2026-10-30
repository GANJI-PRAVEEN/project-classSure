import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  History,
  Wallet,
  ClipboardList,
  LogOut,
  AlertCircle,
  Square,
  X,
} from "lucide-react";
import MyStudents from "./MyStudent.jsx";
import Requests from "./Requests.jsx";
import Earnings from "./Earnings.jsx";
import HistorySection from "./History.jsx";
import RescheduleModal from "./RescheduleModal.jsx";
import TutorOverview from "./TutorOverview.jsx";
import {
  getParentDetailsAPI,
  getStudentDetailsAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
  startSessionAPI,
  endSessionAPI,
  getTodaySessionsAPI,
  getCompletedTuitionsAPI,
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
  const [todaySessions, setTodaySessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [startingSessionId, setStartingSessionId] = useState(null);
  const [endingSessionId, setEndingSessionId] = useState(null);
  const [sessionToEnd, setSessionToEnd] = useState(null);
  const [sessionToReschedule, setSessionToReschedule] = useState(null);
  const [actionError, setActionError] = useState("");
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);

  async function fetchTodaySessions(isInitial = false) {
    try {
      if (isInitial) {
        setLoadingSessions(true);
      }
      setSessionError("");

      const [response, completedRes] = await Promise.all([
        getTodaySessionsAPI(),
        getCompletedTuitionsAPI().catch(() => null),
      ]);
      const responseText = await response.text();
      let result = {};
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse today sessions JSON:", e);
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          setTodaySessions([]);
          setLoadingSessions(false);
          return;
        }
        throw new Error(result.message || "Failed to load today's sessions");
      }

      const sessions = Array.isArray(result.data) ? result.data : [];

      // Map completed tuitions for quick lookup by sessionId
      const completedTuitionMap = new Map();
      if (completedRes && completedRes.ok) {
        try {
          const compJson = await completedRes.json();
          const compList = Array.isArray(compJson.data)
            ? compJson.data
            : Array.isArray(compJson)
            ? compJson
            : [];
          compList.forEach((ct) => {
            if (ct.sessionId) completedTuitionMap.set(String(ct.sessionId), ct);
            if (ct.id) completedTuitionMap.set(String(ct.id), ct);
          });
        } catch (e) {
          console.warn("Could not parse completed tuitions:", e);
        }
      }

      const enriched = await Promise.all(
        sessions.map(async (session) => {
          let parent = null;
          let student = null;

          // Fetch parent details
          if (session.parentId) {
            try {
              const pRes = await getParentDetailsAPI(session.parentId);
              if (pRes.ok) {
                const pData = await pRes.json();
                parent = pData.data ?? null;
              }
            } catch (err) {
              console.error("Error fetching parent details:", err);
            }
          }

          // Fetch student details
          if (session.childId) {
            try {
              const sRes = await getStudentDetailsAPI(session.childId);
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

          const extractTime = (val) => {
            if (!val) return "";
            if (typeof val === "string") {
              return val.includes("T") ? val.split("T")[1].slice(0, 5) : val;
            }
            if (Array.isArray(val) && val.length >= 5) {
              const hours = String(val[3]).padStart(2, "0");
              const minutes = String(val[4]).padStart(2, "0");
              return `${hours}:${minutes}`;
            }
            return "";
          };

          const startTime = session.startTime || extractTime(session.scheduleStart);
          const endTime = session.endTime || extractTime(session.scheduleEnd);
          const sessionId = String(session.id || session._id || "");
          const matchingCompleted = completedTuitionMap.get(sessionId) || null;

          return {
            ...session,
            id: session.id || session._id,
            startTime,
            endTime,
            student,
            parent,
            subjects: student?.subjects || [],
            matchingCompleted,
          };
        })
      );

      // Sort today's sessions by start time
      enriched.sort((a, b) => {
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });

      setTodaySessions(enriched);
    } catch (err) {
      console.error("Error fetching today's sessions:", err);
      setSessionError(err.message || "Failed to load today's sessions");
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    fetchTodaySessions(true);
  }, []);

  async function startTimer(session) {
    if (!session?.id || startingSessionId) return;

    try {
      setStartingSessionId(session.id);
      setActionError("");

      const response = await startSessionAPI(session.id);
      const responseText = await response.text();
      let result = {};
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse start session JSON:", e);
        }
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to start session");
      }

      const startedAt = result.data?.actualStart || new Date().toISOString();

      // Immediately update session in state so timer starts without delay
      setTodaySessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? {
                ...s,
                sessionStatus: "IN_PROGRESS",
                actualStart: startedAt,
              }
            : s
        )
      );

      // Background refetch to ensure complete consistency with backend
      await fetchTodaySessions(false);
      setOverviewRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error in start timer:", error);
      setActionError(error.message || "Failed to start session. Please try again.");
    } finally {
      setStartingSessionId(null);
    }
  }

  async function handleConfirmEndSession(session) {
    if (!session?.id || endingSessionId) return;

    try {
      setEndingSessionId(session.id);
      setActionError("");

      const response = await endSessionAPI(session.id);
      const responseText = await response.text();
      let result = {};
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse end session JSON:", e);
        }
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to end session");
      }

      const endedAt = result.data?.actualEnd || new Date().toISOString();

      // Immediately update session in state to AWAITING_VERIFICATION and record actualEnd
      setTodaySessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? {
                ...s,
                sessionStatus: "AWAITING_VERIFICATION",
                actualEnd: endedAt,
              }
            : s
        )
      );

      // Close the confirmation modal
      setSessionToEnd(null);

      // Background refetch to ensure complete consistency with backend
      await fetchTodaySessions(false);
      setOverviewRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error in end session:", error);
      setActionError(error.message || "Failed to end session. Please try again.");
      setSessionToEnd(null);
    } finally {
      setEndingSessionId(null);
    }
  }

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
                Tuition Sessions
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
              <TutorOverview
                onStartTimer={startTimer}
                onEndSession={(session) => setSessionToEnd(session)}
                onReschedule={(session) => setSessionToReschedule(session)}
                startingSessionId={startingSessionId}
                endingSessionId={endingSessionId}
                refreshTrigger={overviewRefreshKey}
              />
            )}

            {activeSection === "My Students" && (
              <section>
                <MyStudents />
              </section>
            )}

            {activeSection === "History" && (
              <section>
                <HistorySection />
              </section>
            )}

            {activeSection === "Earnings & Payments" && (
              <section>
                <Earnings />
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

      {/* End Session Confirmation Modal */}
      {sessionToEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/80 shadow-2xs">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    End Tuition Session?
                  </h3>
                  <p className="text-xs text-slate-500">
                    {sessionToEnd.student?.name ? `Student: ${sessionToEnd.student.name}` : "Confirm session completion"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={endingSessionId === sessionToEnd.id}
                onClick={() => setSessionToEnd(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Are you sure you want to end this tuition session? The timer will stop, and the completed duration will be submitted as <span className="font-semibold text-slate-800">Awaiting Verification</span> for the parent to review.
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={endingSessionId === sessionToEnd.id}
                onClick={() => setSessionToEnd(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={endingSessionId === sessionToEnd.id}
                onClick={() => handleConfirmEndSession(sessionToEnd)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {endingSessionId === sessionToEnd.id ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Ending Session...</span>
                  </>
                ) : (
                  <>
                    <Square size={14} className="fill-white" />
                    <span>Yes, End Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule One-Day Session Modal */}
      {sessionToReschedule && (
        <RescheduleModal
          session={sessionToReschedule}
          isOpen={Boolean(sessionToReschedule)}
          onClose={() => setSessionToReschedule(null)}
          onSuccess={() => {
            fetchTodaySessions();
            setSessionToReschedule(null);
            setOverviewRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

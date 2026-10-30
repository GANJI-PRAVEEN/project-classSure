import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  User,
  Radio,
  Timer,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  Check,
  X,
  Play,
  Square,
  ClipboardList,
  Wallet,
  Calendar as CalendarIcon,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import {
  getTodaySessionsAPI,
  getCompletedTuitionsAPI,
  getAllTutorStudentsAPI,
  getTutorPendingRequestAPI,
  getTutorSchedulesAPI,
  getParentDetailsAPI,
  getStudentDetailsAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
  startSessionAPI,
  updateScheduleStatusAPI,
} from "../../API/api.js";
import {
  parseTimestamp,
  formatScheduledTimeRange,
  formatSessionDate,
  getTodayKolkataDateStr,
  getTodayKolkataDayOfWeek,
  formatTodayKolkataDisplay,
} from "../../utils/dateTimeUtils.js";

/**
 * Format currency in Indian Rupees (₹)
 */
function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format elapsed milliseconds into HH:MM:SS
 */
function formatElapsedTime(elapsedMs) {
  if (elapsedMs == null || isNaN(elapsedMs) || elapsedMs < 0) {
    return "00:00:00";
  }
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format hours decimal to human readable (e.g. 1.5 -> 1 hr 30 min)
 */
function formatHoursToHuman(hoursVal) {
  const num = Number(hoursVal);
  if (isNaN(num) || num <= 0) return "--";
  const totalMinutes = Math.round(num * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

export default function TutorOverview({
  onStartTimer,
  onEndSession,
  onReschedule,
  startingSessionId: parentStartingId,
  endingSessionId: parentEndingId,
}) {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [tutorUser, setTutorUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const [todaySessions, setTodaySessions] = useState([]);
  const [completedTuitions, setCompletedTuitions] = useState([]);
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Action states for in-progress operations
  const [internalStartingId, setInternalStartingId] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState({});
  const [requestMessages, setRequestMessages] = useState({});
  const [actionError, setActionError] = useState("");

  // Ticking time for live timers
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startingId = parentStartingId || internalStartingId;

  // Hydrate single session with parent, student, subjects and board details
  const hydrateSession = useCallback(async (session, completedMap = new Map()) => {
    let parent = null;
    let student = null;

    if (session.parentId) {
      try {
        const pRes = await getParentDetailsAPI(session.parentId);
        if (pRes.ok) {
          const pData = await pRes.json();
          parent = pData.data ?? null;
        }
      } catch (e) {
        console.warn("Could not fetch parent details:", e);
      }
    }

    if (session.childId) {
      try {
        const sRes = await getStudentDetailsAPI(session.childId);
        if (sRes.ok) {
          const sData = await sRes.json();
          student = sData.data ?? null;

          if (student && Array.isArray(student.subjectIds) && student.subjectIds.length > 0) {
            try {
              const subRes = await getSubjectsByIdsAPI(student.subjectIds);
              if (subRes.ok) {
                const subData = await subRes.json();
                if (Array.isArray(subData)) {
                  student = {
                    ...student,
                    subjects: subData.map((s) => s.name ?? s.subjectName),
                  };
                }
              }
            } catch {}
          }

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
            } catch {}
          }
        }
      } catch (e) {
        console.warn("Could not fetch student details:", e);
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
    const matchingCompleted = completedMap.get(sessionId) || null;

    return {
      ...session,
      id: sessionId,
      startTime,
      endTime,
      student,
      parent,
      subjects: student?.subjects || [],
      matchingCompleted,
    };
  }, []);

  // Hydrate pending schedule requests with student and parent info
  const hydratePendingRequests = useCallback(async (rawRequests) => {
    return await Promise.all(
      rawRequests.map(async (req) => {
        let parent = null;
        let student = null;

        if (req.parentId) {
          try {
            const pRes = await getParentDetailsAPI(req.parentId);
            if (pRes.ok) {
              const pData = await pRes.json();
              parent = pData.data ?? null;
            }
          } catch {}
        }

        if (req.childId) {
          try {
            const sRes = await getStudentDetailsAPI(req.childId);
            if (sRes.ok) {
              const sData = await sRes.json();
              student = sData.data ?? null;

              if (student && Array.isArray(student.subjectIds) && student.subjectIds.length > 0) {
                try {
                  const subRes = await getSubjectsByIdsAPI(student.subjectIds);
                  if (subRes.ok) {
                    const subData = await subRes.json();
                    if (Array.isArray(subData)) {
                      student = {
                        ...student,
                        subjects: subData.map((s) => s.name ?? s.subjectName),
                      };
                    }
                  }
                } catch {}
              }

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
                } catch {}
              }
            }
          } catch {}
        }

        return {
          ...req,
          id: req.id || req._id,
          parent,
          student,
        };
      })
    );
  }, []);

  // Fetch all overview data in parallel
  const loadOverviewData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      setActionError("");

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setTutorUser(user);
      const tutorId = user.id || user._id;

      const [
        todayRes,
        completedRes,
        studentsRes,
        pendingRes,
        schedulesRes,
      ] = await Promise.all([
        getTodaySessionsAPI().catch(() => null),
        getCompletedTuitionsAPI().catch(() => null),
        tutorId ? getAllTutorStudentsAPI(tutorId).catch(() => null) : Promise.resolve(null),
        getTutorPendingRequestAPI().catch(() => null),
        getTutorSchedulesAPI().catch(() => null),
      ]);

      // 1. Process Completed Tuitions
      let compList = [];
      const completedMap = new Map();
      if (completedRes && completedRes.ok) {
        try {
          const compJson = await completedRes.json();
          compList = Array.isArray(compJson.data)
            ? compJson.data
            : Array.isArray(compJson)
            ? compJson
            : [];
          compList.forEach((ct) => {
            if (ct.sessionId) completedMap.set(String(ct.sessionId), ct);
            if (ct.id) completedMap.set(String(ct.id), ct);
          });
        } catch (e) {
          console.warn("Could not parse completed tuitions:", e);
        }
      }
      setCompletedTuitions(compList);

      // 2. Process Today's Sessions
      let sessions = [];
      if (todayRes && todayRes.ok) {
        try {
          const todayJson = await todayRes.json();
          sessions = Array.isArray(todayJson.data)
            ? todayJson.data
            : Array.isArray(todayJson)
            ? todayJson
            : [];
        } catch (e) {
          console.warn("Could not parse today sessions:", e);
        }
      }

      // Enrich today's sessions
      const enrichedSessions = await Promise.all(
        sessions.map((s) => hydrateSession(s, completedMap))
      );

      enrichedSessions.sort((a, b) => {
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });
      setTodaySessions(enrichedSessions);

      // 3. Process Assigned Students
      if (studentsRes && studentsRes.ok) {
        try {
          const sJson = await studentsRes.json();
          setStudents(Array.isArray(sJson) ? sJson : Array.isArray(sJson.data) ? sJson.data : []);
        } catch (e) {
          console.warn("Could not parse students list:", e);
        }
      }

      // 4. Process Pending Requests
      if (pendingRes && pendingRes.ok) {
        try {
          const pJson = await pendingRes.json();
          const rawReqs = Array.isArray(pJson.data)
            ? pJson.data
            : Array.isArray(pJson)
            ? pJson
            : [];
          const enrichedReqs = await hydratePendingRequests(rawReqs);
          setPendingRequests(enrichedReqs);
        } catch (e) {
          console.warn("Could not parse pending requests:", e);
        }
      }

      // 5. Process Accepted Schedules (for weekly hours)
      if (schedulesRes && schedulesRes.ok) {
        try {
          const schedJson = await schedulesRes.json();
          const schedList = Array.isArray(schedJson)
            ? schedJson
            : Array.isArray(schedJson.data)
            ? schedJson.data
            : [];
          setSchedules(schedList);
        } catch (e) {
          console.warn("Could not parse schedules:", e);
        }
      }
    } catch (err) {
      console.error("Error loading tutor overview data:", err);
      setError(err.message || "Failed to load overview data. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [hydrateSession, hydratePendingRequests]);

  useEffect(() => {
    loadOverviewData(true);
  }, [loadOverviewData]);

  // Handle Quick Start Timer directly from Overview
  async function handleStartTimer(session) {
    if (onStartTimer) {
      onStartTimer(session);
      return;
    }
    if (!session?.id || startingId) return;

    try {
      setInternalStartingId(session.id);
      setActionError("");
      const response = await startSessionAPI(session.id);
      if (!response.ok) {
        const text = await response.text();
        let json = {};
        try {
          json = JSON.parse(text);
        } catch {}
        throw new Error(json.message || "Failed to start session");
      }
      // Optimistic update
      setTodaySessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? {
                ...s,
                sessionStatus: "IN_PROGRESS",
                actualStart: new Date().toISOString(),
              }
            : s
        )
      );
      await loadOverviewData(false);
    } catch (err) {
      console.error("Error starting session:", err);
      setActionError(err.message || "Failed to start session");
    } finally {
      setInternalStartingId(null);
    }
  }

  // Handle Quick Accept/Decline of Pending Tuition Request
  async function handleUpdateRequestStatus(scheduleId, status) {
    if (!scheduleId || requestActionLoading[scheduleId]) return;

    try {
      setRequestActionLoading((prev) => ({ ...prev, [scheduleId]: status }));
      setActionError("");

      const response = await updateScheduleStatusAPI(scheduleId, status);
      const responseText = await response.text();
      let result = {};
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {}
      }

      if (!response.ok) {
        throw new Error(
          result.message || `Failed to update request status (HTTP ${response.status})`
        );
      }

      const confirmedStatus = (result.data?.status || status).toUpperCase();

      // Update state
      setPendingRequests((prev) =>
        prev.filter((r) => r.id !== scheduleId && r._id !== scheduleId)
      );

      const msg =
        confirmedStatus === "ACCEPTED"
          ? "Tuition schedule accepted successfully! Student added to your roster."
          : "Tuition request declined.";

      setRequestMessages((prev) => ({ ...prev, [scheduleId]: msg }));
      setTimeout(() => {
        setRequestMessages((prev) => {
          const next = { ...prev };
          delete next[scheduleId];
          return next;
        });
      }, 5000);

      // Refresh overview data in background to update student count and schedules
      await loadOverviewData(false);
    } catch (err) {
      console.error("Error updating schedule status:", err);
      setActionError(err.message || "Failed to update request");
    } finally {
      setRequestActionLoading((prev) => {
        const next = { ...prev };
        delete next[scheduleId];
        return next;
      });
    }
  }

  // Computed metrics
  const tutorName = tutorUser?.name || tutorUser?.fullName || "Tutor";

  const liveSession = useMemo(() => {
    return todaySessions.find((s) => s.sessionStatus === "IN_PROGRESS");
  }, [todaySessions]);

  const liveDurationText = useMemo(() => {
    if (!liveSession || !liveSession.actualStart) return "00:00:00";
    const startMs = parseTimestamp(liveSession.actualStart);
    if (!startMs) return "00:00:00";
    const elapsed = Math.max(0, nowMs - startMs);
    return formatElapsedTime(elapsed);
  }, [liveSession, nowMs]);

  // Total weekly scheduled hours
  const weeklyScheduledHours = useMemo(() => {
    let minutes = 0;
    schedules
      .filter((s) => s.status === "ACCEPTED")
      .forEach((s) => {
        if (!s.startTime || !s.endTime || !Array.isArray(s.daysOfWeek)) return;
        const [sh, sm] = s.startTime.split(":").map(Number);
        const [eh, em] = s.endTime.split(":").map(Number);
        const durationMins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
        if (durationMins > 0) {
          minutes += durationMins * s.daysOfWeek.length;
        }
      });
    return (minutes / 60).toFixed(1);
  }, [schedules]);

  // Total verified earnings & hours from completed tuitions
  const totalVerifiedEarnings = useMemo(() => {
    return completedTuitions.reduce((sum, ct) => {
      const amt = Number(ct.earnedAmount) || 0;
      return sum + amt;
    }, 0);
  }, [completedTuitions]);

  const totalVerifiedHours = useMemo(() => {
    return completedTuitions
      .reduce((sum, ct) => {
        const hrs = Number(ct.verifiedDurationHours) || 0;
        return sum + hrs;
      }, 0)
      .toFixed(1);
  }, [completedTuitions]);

  const liveClassesCount = liveSession ? 1 : 0;
  const upcomingClassesCount = useMemo(() => {
    return todaySessions.filter(
      (s) => s.sessionStatus === "UPCOMING" || s.sessionStatus === "SCHEDULED" || !s.sessionStatus
    ).length;
  }, [todaySessions]);

  const completedTodayCount = useMemo(() => {
    return todaySessions.filter(
      (s) => s.sessionStatus === "APPROVED" || s.sessionStatus === "AWAITING_VERIFICATION"
    ).length;
  }, [todaySessions]);

  const activePendingCount = pendingRequests.length;
  const activeStudentsCount = students.length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Hero Welcome Header */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/25 to-indigo-50/30 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100/90 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Tutor Workspace
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                IST Timezone
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, <span className="text-blue-600">{tutorName}</span> 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 flex-wrap">
              <CalendarDays size={15} className="text-slate-400 shrink-0" />
              <span className="font-medium text-slate-600">{formatTodayKolkataDisplay()}</span>
              <span>•</span>
              <span>Live teaching monitoring and academic session tracker</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {liveClassesCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span>Teaching Live Session</span>
              </span>
            ) : todaySessions.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-2xs">
                <CalendarCheck size={14} className="text-blue-600" />
                <span>
                  {todaySessions.length} {todaySessions.length === 1 ? "Class" : "Classes"} Today
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Schedule Clear Today</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => loadOverviewData(false)}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
              title="Refresh tutor data"
            >
              <RefreshCw
                size={13}
                className={`text-slate-500 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Action Error Banner */}
      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100/70 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-xs"
              >
                <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
                <div className="h-7 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="h-64 rounded-2xl border border-slate-200 bg-white p-8 animate-pulse shadow-xs flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              <p className="text-sm font-medium text-slate-400">Loading your tutor workspace...</p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertCircle size={20} />
          </div>
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => loadOverviewData(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <RefreshCw size={13} />
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* 2. Informative KPI Metric Cards (Pure Stats - No External Link Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Assigned Students */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Assigned Students
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {activeStudentsCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-2xs">
                  <Users size={22} strokeWidth={1.9} />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 font-medium">
                Active learners under your mentorship
              </p>
            </div>

            {/* Card 2: Weekly Teaching Commitment */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Weekly Teaching Load
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {weeklyScheduledHours} <span className="text-base font-bold text-slate-500">hrs/wk</span>
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100/60 shadow-2xs">
                  <Clock size={22} strokeWidth={1.9} />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 font-medium">
                Scheduled commitment across recurring days
              </p>
            </div>

            {/* Card 3: Today's Sessions */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Today&apos;s Classes
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {todaySessions.length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 shadow-2xs">
                  <CalendarCheck size={22} strokeWidth={1.9} />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 font-medium">
                {liveClassesCount > 0 ? (
                  <span className="text-amber-600 font-semibold">1 class live now</span>
                ) : upcomingClassesCount > 0 ? (
                  <span>{upcomingClassesCount} upcoming scheduled</span>
                ) : completedTodayCount > 0 ? (
                  <span className="text-emerald-600 font-semibold">All classes completed</span>
                ) : (
                  <span>No sessions today</span>
                )}
              </p>
            </div>

            {/* Card 4: Verified Earnings & Hours */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Verified Earnings
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-600 truncate">
                    {formatINR(totalVerifiedEarnings)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 shadow-2xs">
                  <Wallet size={22} strokeWidth={1.9} />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 font-medium">
                From {totalVerifiedHours} hrs verified teaching
              </p>
            </div>
          </div>

          {/* 3. Pending Schedule Requests Widget (Instant Action Panel) */}
          {activePendingCount > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <ClipboardList size={19} className="text-amber-600" />
                    <span>Pending Tuition Requests</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      {activePendingCount} New
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Parents have proposed new tuition arrangements awaiting your acceptance
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => {
                  const reqId = req.id || req._id;
                  const isActing = Boolean(requestActionLoading[reqId]);
                  const ackMsg = requestMessages[reqId];

                  return (
                    <div
                      key={reqId}
                      className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-white via-white to-amber-50/20 p-5 shadow-xs relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-100">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold text-base shadow-2xs">
                            {req.student?.name?.charAt(0)?.toUpperCase() ?? "S"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                              {req.student?.name || "Student"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {req.student?.grade && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                  <GraduationCap size={12} className="text-slate-500" />
                                  <span>{req.student.grade}</span>
                                </span>
                              )}
                              {req.student?.board && (
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {req.student.board}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                          Awaiting Review
                        </span>
                      </div>

                      {/* Request details */}
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 flex items-center gap-1">
                            <User size={13} className="text-slate-400" />
                            <span>Parent:</span>
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {req.parent?.name || "Parent"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>Schedule:</span>
                          </span>
                          <span className="font-semibold text-slate-800">
                            {req.startTime} – {req.endTime}
                          </span>
                        </div>

                        {req.hourlyRate != null && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Wallet size={13} className="text-slate-400" />
                              <span>Rate:</span>
                            </span>
                            <span className="font-bold text-emerald-700">
                              ₹{req.hourlyRate}/hr
                            </span>
                          </div>
                        )}

                        {Array.isArray(req.daysOfWeek) && req.daysOfWeek.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-slate-400">Days:</span>
                            {req.daysOfWeek.map((day, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100/60"
                              >
                                {String(day).slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Feedback message */}
                      {ackMsg && (
                        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-800">
                          {ackMsg}
                        </div>
                      )}

                      {/* Quick Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleUpdateRequestStatus(reqId, "ACCEPTED")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-60"
                        >
                          {requestActionLoading[reqId] === "ACCEPTED" ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Check size={14} strokeWidth={2.5} />
                          )}
                          <span>Accept Request</span>
                        </button>

                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleUpdateRequestStatus(reqId, "REJECTED")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition active:scale-95 disabled:opacity-60"
                        >
                          {requestActionLoading[reqId] === "REJECTED" ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                          ) : (
                            <X size={14} strokeWidth={2.5} />
                          )}
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. Today's Teaching Schedule (Live Activity & Controls) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Radio size={19} className="text-blue-600" />
                  <span>Today&apos;s Teaching Schedule</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {todaySessions.length} {todaySessions.length === 1 ? "Class" : "Classes"}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Real-time class monitoring, live elapsed timer, and session controls
                </p>
              </div>
            </div>

            {/* Active Live Session Highlight Banner if teaching right now */}
            {liveSession && (
              <div className="rounded-2xl border-2 border-blue-500 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-5 sm:p-6 text-white shadow-md">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs text-white">
                      <Radio size={24} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                          Live In Progress
                        </span>
                        <span className="text-xs text-blue-100">
                          Student: {liveSession.student?.name || "Student"}
                        </span>
                      </div>
                      <h3 className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
                        Class Session Underway
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-start md:self-auto">
                    <div className="rounded-xl bg-black/25 px-4 py-2 border border-white/10 backdrop-blur-xs text-center">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-blue-200">
                        Elapsed Time
                      </p>
                      <p className="font-mono text-xl sm:text-2xl font-black tracking-wider">
                        {liveDurationText}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={parentEndingId === liveSession.id}
                      onClick={() => onEndSession && onEndSession(liveSession)}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-rose-700 shadow-md hover:bg-rose-50 transition active:scale-95 disabled:opacity-60"
                    >
                      {parentEndingId === liveSession.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-700 border-t-transparent" />
                      ) : (
                        <Square size={14} className="fill-rose-700 text-rose-700" />
                      )}
                      <span>End Class</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Today Sessions Cards */}
            {todaySessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
                <div className="mx-auto mb-3.5 flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-xs">
                  <CalendarCheck size={26} strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No tuition sessions scheduled for today
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500">
                  You have no classes scheduled for today. Review your student roster or accepted schedules to prepare for upcoming sessions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todaySessions.map((session) => {
                  const isLive = session.sessionStatus === "IN_PROGRESS";
                  const isAwaiting = session.sessionStatus === "AWAITING_VERIFICATION";
                  const isApproved = session.sessionStatus === "APPROVED";
                  const isStarting = startingId === session.id;

                  return (
                    <div
                      key={session.id}
                      className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition duration-200 ${
                        isLive
                          ? "border-blue-400 bg-gradient-to-br from-white via-white to-blue-50/30 ring-2 ring-blue-500/20"
                          : isAwaiting
                          ? "border-amber-300 bg-amber-50/20"
                          : isApproved
                          ? "border-emerald-200/90 bg-white"
                          : "border-slate-200/90 bg-white"
                      }`}
                    >
                      {/* Card Header: Student & Live Status Badge */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-base shadow-xs ${
                              isLive
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200/60"
                            }`}
                          >
                            {session.student?.name?.charAt(0)?.toUpperCase() ?? "S"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                              {session.student?.name || "Student"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {session.student?.grade && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                  <GraduationCap size={12} className="text-slate-500 shrink-0" />
                                  <span>{session.student.grade}</span>
                                </span>
                              )}
                              {session.student?.board && (
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {session.student.board}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400 bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                              <Radio size={13} className="animate-pulse" />
                              <span>Live Ongoing</span>
                            </span>
                          ) : isAwaiting ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Awaiting Review</span>
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Verified & Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                              <span>Upcoming</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Live Ticking Timer banner if session is in progress */}
                      {isLive && (
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-600 px-3.5 py-2 text-white shadow-xs">
                          <div className="flex items-center gap-2">
                            <Timer size={16} className="animate-spin text-blue-200" />
                            <span className="text-xs font-medium">Session in progress:</span>
                          </div>
                          <span className="font-mono text-sm font-bold tracking-wider">
                            {liveDurationText}
                          </span>
                        </div>
                      )}

                      {/* Card Details: Parent, Timing, Rate, Subjects */}
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 flex items-center gap-1">
                            <User size={13} className="text-slate-400" />
                            <span>Parent:</span>
                          </span>
                          <span className="font-semibold text-slate-800 text-right truncate">
                            {session.parent?.name || "Parent"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>Scheduled:</span>
                          </span>
                          <span className="font-semibold text-slate-800 text-right">
                            {session.startTime || "--"} – {session.endTime || "--"}
                          </span>
                        </div>

                        {session.hourlyRate != null && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Wallet size={13} className="text-slate-400" />
                              <span>Hourly Rate:</span>
                            </span>
                            <span className="font-bold text-emerald-700">
                              ₹{session.hourlyRate}/hr
                            </span>
                          </div>
                        )}

                        {session.subjects && session.subjects.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                            <BookOpen size={12} className="text-slate-400 shrink-0" />
                            {session.subjects.map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100/60"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons directly on card */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        {isLive ? (
                          <button
                            type="button"
                            disabled={parentEndingId === session.id}
                            onClick={() => onEndSession && onEndSession(session)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition active:scale-95 disabled:opacity-60"
                          >
                            {parentEndingId === session.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Square size={13} className="fill-white" />
                            )}
                            <span>End Session</span>
                          </button>
                        ) : isAwaiting ? (
                          <div className="w-full text-center py-1.5 text-xs font-medium text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                            Awaiting parent review & verification
                          </div>
                        ) : isApproved ? (
                          <div className="w-full text-center py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={13} />
                            <span>Approved • Verified to account</span>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isStarting}
                              onClick={() => handleStartTimer(session)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
                            >
                              {isStarting ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <Play size={13} className="fill-white" />
                              )}
                              <span>Start Class</span>
                            </button>

                            {onReschedule && (
                              <button
                                type="button"
                                onClick={() => onReschedule(session)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                              >
                                Reschedule
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 5. Recent Completed Tuitions & Verified Earnings Summary */}
          {completedTuitions.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Sparkles size={19} className="text-emerald-600" />
                  <span>Recent Completed Tuitions & Verified Earnings</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Verified sessions approved by parents and credited to your account
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {completedTuitions.slice(0, 6).map((ct, idx) => {
                  const student = students.find(
                    (s) => String(s.id ?? s._id) === String(ct.childId)
                  );
                  const durationHuman = formatHoursToHuman(ct.verifiedDurationHours);

                  return (
                    <div
                      key={ct.id || idx}
                      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-emerald-200 transition"
                    >
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {student?.name || "Student"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {ct.sessionDate ? formatSessionDate(ct.sessionDate) : "Completed"}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Check size={11} strokeWidth={2.5} />
                          Verified
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Duration:</span>
                        <span className="font-semibold text-slate-800">{durationHuman}</span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Rate:</span>
                        <span className="font-medium text-slate-700">
                          ₹{ct.hourlyRate != null ? ct.hourlyRate : "--"}/hr
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Earned:</span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          {formatINR(ct.earnedAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 6. Academic Integrity & Verification Guarantee Footer */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>
                ClassSure Academic Integrity: Verified teaching timestamps ensure transparent parent approval and accurate earnings.
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              ClassSure Tutor Network
            </span>
          </div>
        </>
      )}
    </div>
  );
}

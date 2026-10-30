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
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  getParentTodaySessionsAPI,
  getParentHistoryAPI,
  getAllChildrensAPI,
  getSchedulesAPI,
  getPendingReviewSessionsAPI,
  approveSessionAPI,
  getTutorByIdAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
} from "../../API/api.js";
import {
  parseTimestamp,
  formatScheduledTimeRange,
  extractSessionDateStr,
  getTodayKolkataDateStr,
  getTodayKolkataDayOfWeek,
  formatTodayKolkataDisplay,
  parseKolkataDateTimeToMs,
} from "../../utils/dateTimeUtils.js";

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

function formatTime(timeStr) {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parts[1].slice(0, 2) : "00";
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

const DAYS_ORDER = [
  { key: "MONDAY", label: "Monday", short: "Mon" },
  { key: "TUESDAY", label: "Tuesday", short: "Tue" },
  { key: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { key: "THURSDAY", label: "Thursday", short: "Thu" },
  { key: "FRIDAY", label: "Friday", short: "Fri" },
  { key: "SATURDAY", label: "Saturday", short: "Sat" },
  { key: "SUNDAY", label: "Sunday", short: "Sun" },
];

export default function ParentOverview({ onNavigateToTab }) {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [children, setChildren] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [todayTuitions, setTodayTuitions] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [approvingSessionId, setApprovingSessionId] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Parent profile info
  const parentName = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.fullName || parsed.name || parsed.email?.split("@")[0] || "Parent";
      }
    } catch {
      // ignore
    }
    return "Parent";
  }, []);

  // Main loader for all overview metrics
  const loadOverviewData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const todayKolkataDateStr = getTodayKolkataDateStr();
    const todayKolkataDay = getTodayKolkataDayOfWeek();

    try {
      // 1. Fetch children, schedules, today's sessions, and pending reviews in parallel
      const [childRes, schedRes, sessRes, pendingRes] = await Promise.all([
        getAllChildrensAPI().catch(() => null),
        getSchedulesAPI().catch(() => null),
        getParentTodaySessionsAPI().catch(() => null),
        getPendingReviewSessionsAPI().catch(() => null),
      ]);

      // Parse children
      const childrenMap = new Map();
      let rawChildren = [];
      if (childRes && childRes.ok) {
        try {
          const cData = await childRes.json();
          if (Array.isArray(cData)) {
            rawChildren = cData;
            cData.forEach((c) => {
              const id = String(c.id || c._id || "");
              if (id) childrenMap.set(id, c);
            });
          }
        } catch (e) {
          console.warn("Could not parse children:", e);
        }
      }
      setChildren(rawChildren);

      // Parse schedules
      let rawSchedules = [];
      const schedulesMap = new Map();
      if (schedRes && schedRes.ok) {
        try {
          const sData = await schedRes.json();
          if (Array.isArray(sData)) {
            rawSchedules = sData;
            sData.forEach((s) => {
              const id = String(s.id || s._id || "");
              if (id) schedulesMap.set(id, s);
            });
          }
        } catch (e) {
          console.warn("Could not parse schedules:", e);
        }
      }
      setSchedules(rawSchedules);

      // Parse sessions
      let allSessions = [];
      if (sessRes && sessRes.ok) {
        try {
          const sJson = await sessRes.json();
          allSessions = Array.isArray(sJson.data)
            ? sJson.data
            : Array.isArray(sJson.sessions)
            ? sJson.sessions
            : Array.isArray(sJson)
            ? sJson
            : [];
        } catch (e) {
          console.warn("Could not parse sessions:", e);
        }
      } else {
        // Fallback to history API if today-sessions returned non-ok
        try {
          const histRes = await getParentHistoryAPI();
          if (histRes && histRes.ok) {
            const hJson = await histRes.json();
            allSessions = Array.isArray(hJson.sessions)
              ? hJson.sessions
              : Array.isArray(hJson.data)
              ? hJson.data
              : [];
          }
        } catch (e) {
          console.warn("Could not parse history fallback:", e);
        }
      }

      // Filter sessions for today
      const todaySessionsList = allSessions.filter((s) => {
        const sDate = extractSessionDateStr(s.sessionDate || s.scheduleStart || s.actualStart);
        return sDate === todayKolkataDateStr;
      });

      // Filter active schedules that apply today
      const activeTodaySchedules = rawSchedules.filter((s) => {
        if (s.status !== "ACCEPTED") return false;
        if (Array.isArray(s.daysOfWeek) && !s.daysOfWeek.map((d) => String(d).toUpperCase()).includes(todayKolkataDay)) {
          return false;
        }
        if (s.effectiveFrom) {
          const effFromStr = extractSessionDateStr(s.effectiveFrom);
          if (effFromStr && todayKolkataDateStr < effFromStr) return false;
        }
        if (s.effectiveTo) {
          const effToStr = extractSessionDateStr(s.effectiveTo);
          if (effToStr && todayKolkataDateStr > effToStr) return false;
        }
        return true;
      });

      // Combine today's sessions with active schedules not yet created as session
      const existingScheduleIds = new Set(todaySessionsList.map((s) => String(s.scheduleId || "")).filter(Boolean));
      const combinedToday = [...todaySessionsList];
      activeTodaySchedules.forEach((sched) => {
        const schedId = String(sched.id || sched._id || "");
        if (!existingScheduleIds.has(schedId)) {
          combinedToday.push({
            id: `sched_${schedId}`,
            scheduleId: schedId,
            childId: sched.childId,
            tutorId: sched.tutorId,
            sessionStatus: "UPCOMING",
            sessionDate: todayKolkataDateStr,
            scheduleStart: `${todayKolkataDateStr}T${sched.startTime}`,
            scheduleEnd: `${todayKolkataDateStr}T${sched.endTime}`,
            hourlyRate: sched.hourlyRate,
            isSynthesized: true,
          });
        }
      });

      // Parse pending review sessions
      let pendingList = [];
      if (pendingRes && pendingRes.ok) {
        try {
          const pJson = await pendingRes.json();
          pendingList = Array.isArray(pJson.data)
            ? pJson.data
            : Array.isArray(pJson)
            ? pJson
            : [];
        } catch (e) {
          console.warn("Could not parse pending reviews:", e);
        }
      }
      setPendingReviews(pendingList);

      // Collect IDs to resolve tutors, subjects, and boards
      const uniqueTutorIds = [
        ...new Set([
          ...combinedToday.map((s) => s.tutorId).filter(Boolean),
          ...rawChildren.map((c) => c.tutorId).filter(Boolean),
          ...pendingList.map((p) => p.tutorId).filter(Boolean),
        ]),
      ];
      const uniqueSubjectIds = [
        ...new Set(rawChildren.flatMap((c) => (Array.isArray(c.subjectIds) ? c.subjectIds : []))),
      ];
      const uniqueBoardIds = [...new Set(rawChildren.map((c) => c.board).filter(Boolean))];

      // Resolve in parallel
      const tutorsMap = new Map();
      const subjectsMap = new Map();
      const boardsMap = new Map();

      await Promise.allSettled([
        Promise.allSettled(
          uniqueTutorIds.map(async (tId) => {
            try {
              const res = await getTutorByIdAPI(tId);
              if (res.ok) {
                const data = await res.json();
                tutorsMap.set(String(tId), data.fullName || data.name || data.email || "Tutor");
              }
            } catch {
              // ignore
            }
          })
        ),
        uniqueSubjectIds.length > 0
          ? getSubjectsByIdsAPI(uniqueSubjectIds)
              .then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data)) {
                    data.forEach((s) => {
                      const id = String(s.id || s._id || "");
                      const name = s.name || s.subjectName;
                      if (id && name) subjectsMap.set(id, name);
                    });
                  }
                }
              })
              .catch(() => null)
          : Promise.resolve(),
        Promise.allSettled(
          uniqueBoardIds.map(async (bId) => {
            try {
              const res = await getBoardByIdAPI(bId);
              if (res.ok) {
                const data = await res.json();
                boardsMap.set(String(bId), data.name || data.boardName || bId);
              }
            } catch {
              // ignore
            }
          })
        ),
      ]);

      // Enrich today's tuitions
      const currentNowMs = Date.now();
      const enrichedToday = combinedToday.map((session) => {
        const childId = String(session.childId || "");
        const child = childrenMap.get(childId);
        const sched = session.scheduleId ? schedulesMap.get(String(session.scheduleId)) : null;
        const tutorId = String(session.tutorId || child?.tutorId || sched?.tutorId || "");

        const studentName = child?.name || session.studentName || "Student";
        const grade = child?.grade || "Grade unavailable";
        const boardName = child?.board ? boardsMap.get(String(child.board)) || child.board : "";
        const tutorName = tutorsMap.get(tutorId) || session.tutorName || "Tutor unavailable";

        let subjectNames = [];
        if (Array.isArray(child?.subjectIds) && child.subjectIds.length > 0) {
          subjectNames = child.subjectIds.map((id) => subjectsMap.get(String(id))).filter(Boolean);
        }
        if (subjectNames.length === 0 && Array.isArray(child?.subjects)) {
          subjectNames = child.subjects;
        }

        const sessionDateStr =
          extractSessionDateStr(session.sessionDate || session.scheduleStart || session.actualStart) ||
          todayKolkataDateStr;

        // Determine status
        let displayStatus = "UPCOMING";
        const rawStatus = String(session.sessionStatus || "").toUpperCase();
        if (rawStatus === "APPROVED") displayStatus = "APPROVED";
        else if (rawStatus === "DISPUTED") displayStatus = "DISPUTED";
        else if (rawStatus === "AWAITING_VERIFICATION") displayStatus = "AWAITING_VERIFICATION";
        else if (rawStatus === "IN_PROGRESS" || (session.actualStart && !session.actualEnd && rawStatus !== "AWAITING_VERIFICATION")) {
          displayStatus = "IN_PROGRESS";
        } else {
          const scheduleEndMs = parseKolkataDateTimeToMs(session.scheduleEnd || session.endTime, sessionDateStr);
          if (scheduleEndMs && currentNowMs > scheduleEndMs && !session.actualStart) {
            displayStatus = "MISSED";
          } else {
            displayStatus = "UPCOMING";
          }
        }

        const timeRangeDisplay = formatScheduledTimeRange(
          session.scheduleStart || (session.startTime ? `${sessionDateStr}T${session.startTime}` : null),
          session.scheduleEnd || (session.endTime ? `${sessionDateStr}T${session.endTime}` : null)
        );

        return {
          ...session,
          studentName,
          grade,
          boardName,
          tutorName,
          subjectNames,
          displayStatus,
          timeRangeDisplay,
        };
      });

      setTodayTuitions(enrichedToday);

      // Enrich pending reviews
      const enrichedPending = pendingList.map((p) => {
        const child = childrenMap.get(String(p.childId || ""));
        const tutorName = tutorsMap.get(String(p.tutorId || "")) || "Tutor";
        return {
          ...p,
          studentName: child?.name || "Student",
          grade: child?.grade || "",
          tutorName,
        };
      });
      setPendingReviews(enrichedPending);
    } catch (err) {
      console.error("Failed to load overview data:", err);
      setError(err.message || "Failed to load dashboard overview.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverviewData(false);
  }, [loadOverviewData]);

  // Live timer interval for active classes
  useEffect(() => {
    const hasLive = todayTuitions.some((t) => t.displayStatus === "IN_PROGRESS");
    if (!hasLive) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [todayTuitions]);

  // Quick 1-click session approval from Overview
  async function handleQuickApprove(sessionId) {
    setApprovingSessionId(sessionId);
    setApprovalMessage("");
    try {
      const res = await approveSessionAPI(sessionId);
      if (res.ok) {
        setApprovalMessage("Session verified and approved successfully!");
        setTimeout(() => setApprovalMessage(""), 4000);
        // Refresh overview metrics
        loadOverviewData(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Approval could not be recorded.");
      }
    } catch (err) {
      console.error("Approve failed:", err);
      alert("Network error approving session.");
    } finally {
      setApprovingSessionId(null);
    }
  }

  // Summary Metrics Computation
  const activeSchedulesCount = useMemo(() => {
    return schedules.filter((s) => s.status === "ACCEPTED").length;
  }, [schedules]);

  const liveClassesCount = useMemo(() => {
    return todayTuitions.filter((t) => t.displayStatus === "IN_PROGRESS").length;
  }, [todayTuitions]);

  const upcomingTodayCount = useMemo(() => {
    return todayTuitions.filter((t) => t.displayStatus === "UPCOMING").length;
  }, [todayTuitions]);

  const totalWeeklyHours = useMemo(() => {
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

  // Map schedules by day of week for the Weekly Timetable Widget
  const weeklyScheduleMap = useMemo(() => {
    const map = new Map();
    DAYS_ORDER.forEach((d) => map.set(d.key, []));

    schedules
      .filter((s) => s.status === "ACCEPTED")
      .forEach((sched) => {
        if (!Array.isArray(sched.daysOfWeek)) return;
        const child = children.find((c) => String(c.id ?? c._id) === String(sched.childId));
        sched.daysOfWeek.forEach((dayKey) => {
          const upperDay = String(dayKey).toUpperCase();
          if (map.has(upperDay)) {
            map.get(upperDay).push({
              ...sched,
              studentName: child?.name || "Student",
              grade: child?.grade || "",
              subjects: child?.subjects || [],
            });
          }
        });
      });

    return map;
  }, [schedules, children]);

  const todayDayKey = getTodayKolkataDayOfWeek();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Welcome Header */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100/80 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Parent Overview
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                IST Timezone
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, <span className="text-blue-600">{parentName}</span> 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
              <CalendarDays size={15} className="text-slate-400" />
              <span>{formatTodayKolkataDisplay()}</span>
              <span>•</span>
              <span>Live tuition monitoring and academic schedule overview</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            {liveClassesCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                {liveClassesCount} Class{liveClassesCount > 1 ? "es" : ""} Live Now
              </span>
            ) : todayTuitions.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-2xs">
                <Sparkles size={14} className="text-blue-600" />
                {todayTuitions.length} Class{todayTuitions.length > 1 ? "es" : ""} Today
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs">
                <CheckCircle2 size={14} className="text-emerald-500" />
                All Caught Up
              </span>
            )}

            <button
              type="button"
              onClick={() => loadOverviewData(true)}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw
                size={14}
                className={isRefreshing ? "animate-spin text-blue-600" : "text-slate-500"}
              />
              <span className="hidden xs:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success alert for session verification */}
      {approvalMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm font-semibold text-emerald-800 shadow-2xs animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{approvalMessage}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100 p-4 border border-slate-200/60" />
            ))}
          </div>
          <div className="h-48 rounded-2xl bg-slate-100 border border-slate-200/60 animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-semibold text-rose-900">Failed to load overview data</h3>
          <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => loadOverviewData(false)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <>
          {/* Key Metrics Strip (Clear, informative statistics - NO links) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Enrolled Children */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Enrolled Children
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60">
                  <Users size={18} strokeWidth={2} />
                </div>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
                {children.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                {children.length === 0
                  ? "No students registered"
                  : children.map((c) => c.name).join(", ")}
              </p>
            </div>

            {/* Card 2: Active Schedules */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Active Schedules
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                  <CalendarCheck size={18} strokeWidth={2} />
                </div>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
                {activeSchedulesCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {totalWeeklyHours} hrs weekly tuition
              </p>
            </div>

            {/* Card 3: Today's Classes */}
            <div
              className={`rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-sm transition ${
                liveClassesCount > 0
                  ? "border-amber-300 bg-amber-50/30"
                  : "border-slate-200/90 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Classes Today
                </p>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                    liveClassesCount > 0
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-sky-50 text-sky-600 border-sky-100/60"
                  }`}
                >
                  <Clock size={18} strokeWidth={2} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {todayTuitions.length}
                </p>
                {liveClassesCount > 0 && (
                  <span className="text-xs font-bold text-amber-700 animate-pulse">
                    ({liveClassesCount} Live)
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {upcomingTodayCount} upcoming later today
              </p>
            </div>

            {/* Card 4: Pending Verification */}
            <div
              className={`rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-sm transition ${
                pendingReviews.length > 0
                  ? "border-rose-300 bg-rose-50/40"
                  : "border-slate-200/90 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Needs Review
                </p>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                    pendingReviews.length > 0
                      ? "bg-rose-100 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-600 border-emerald-100/60"
                  }`}
                >
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
              </div>
              <p
                className={`mt-2 text-2xl sm:text-3xl font-extrabold ${
                  pendingReviews.length > 0 ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {pendingReviews.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {pendingReviews.length > 0
                  ? "Tutor awaiting parent approval"
                  : "All completed sessions verified"}
              </p>
            </div>
          </div>

          {/* Pending Verifications Alert Box (If any exists, parent can verify immediately!) */}
          {pendingReviews.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/80 to-amber-50/30 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-2xs">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">
                      Pending Session Verifications ({pendingReviews.length})
                    </h3>
                    <p className="text-xs text-amber-800">
                      Tutors have marked these sessions completed. Confirm hours taught to release earnings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {pendingReviews.map((rev) => {
                  const revId = String(rev.id || rev._id || "");
                  const isApproving = approvingSessionId === revId;
                  const durationMins = rev.durationMinutes || rev.durationHours * 60 || 60;
                  const hours = (durationMins / 60).toFixed(1);

                  return (
                    <div
                      key={revId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white p-3.5 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {rev.studentName}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-600 font-medium">
                            Tutor: {rev.tutorName}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {extractSessionDateStr(rev.sessionDate)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {hours} hrs taught
                          </span>
                          {rev.hourlyRate != null && rev.hourlyRate > 0 && (
                            <span className="text-slate-500">
                              Fee: ₹{rev.hourlyRate}/hr • Total: ₹{(rev.hourlyRate * Number(hours)).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isApproving}
                          onClick={() => handleQuickApprove(revId)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50"
                        >
                          <Check size={14} />
                          <span>{isApproving ? "Verifying..." : "Approve Session"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Live Tuition Monitor */}
          <section className="space-y-4">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <Clock size={19} className="text-blue-600" />
                  <span>Today&apos;s Tuition Schedule</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Real-time class statuses for enrolled children today
                </p>
              </div>

              {todayTuitions.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {todayTuitions.length} Session{todayTuitions.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {todayTuitions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center shadow-xs">
                <div className="mx-auto mb-3.5 flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-xs">
                  <CalendarCheck size={26} strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No classes scheduled for today
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500">
                  Enjoy your day! None of your enrolled children have tuitions scheduled for today ({todayKolkataDay}).
                  Review the weekly timetable below to see upcoming classes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayTuitions.map((tuition) => {
                  const isLive = tuition.displayStatus === "IN_PROGRESS";
                  const isAwaiting = tuition.displayStatus === "AWAITING_VERIFICATION";
                  const isApproved = tuition.displayStatus === "APPROVED";

                  // Live duration computation
                  let liveDurationText = "00:00:00";
                  if (isLive && tuition.actualStart) {
                    const startMs = parseTimestamp(tuition.actualStart);
                    if (startMs && nowMs >= startMs) {
                      liveDurationText = formatElapsedTime(nowMs - startMs);
                    }
                  }

                  return (
                    <div
                      key={tuition.id}
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
                            {tuition.studentName?.charAt(0)?.toUpperCase() ?? "S"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                              {tuition.studentName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {tuition.grade && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                  <GraduationCap size={12} className="text-slate-500 shrink-0" />
                                  <span>{tuition.grade}</span>
                                </span>
                              )}
                              {tuition.boardName && (
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {tuition.boardName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
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
                              <span>Approved</span>
                            </span>
                          ) : tuition.displayStatus === "MISSED" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              <span>Missed Class</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                              <span>Upcoming</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Live Ticking Timer banner if class is currently ongoing */}
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

                      {/* Card Details: Tutor, Timing, Subjects */}
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 flex items-center gap-1">
                            <User size={13} className="text-slate-400" />
                            <span>Tutor:</span>
                          </span>
                          <span className="font-semibold text-slate-800 text-right truncate">
                            {tuition.tutorName}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>Scheduled:</span>
                          </span>
                          <span className="font-semibold text-slate-800 text-right">
                            {tuition.timeRangeDisplay}
                          </span>
                        </div>

                        {tuition.subjectNames && tuition.subjectNames.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                            <BookOpen size={12} className="text-slate-400 shrink-0" />
                            {tuition.subjectNames.map((s, idx) => (
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
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Weekly Timetable Matrix Widget (At-a-Glance Timetable for Parents) */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <CalendarIcon size={19} className="text-indigo-600" />
                <span>Weekly Tuition Timetable</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Weekly recurring schedule overview across all enrolled children
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {DAYS_ORDER.map(({ key, label, short }) => {
                const daySchedules = weeklyScheduleMap.get(key) || [];
                const isToday = key === todayDayKey;

                return (
                  <div
                    key={key}
                    className={`flex flex-col rounded-2xl border p-3.5 transition ${
                      isToday
                        ? "border-blue-400 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200/80 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                        {short}
                      </span>
                      {isToday ? (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          Today
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          {daySchedules.length}
                        </span>
                      )}
                    </div>

                    {daySchedules.length === 0 ? (
                      <p className="text-[11px] italic text-slate-400 my-auto text-center py-4">
                        No class
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-200/90 bg-white p-2 text-xs shadow-2xs"
                          >
                            <p className="font-bold text-slate-900 truncate">
                              {item.studentName}
                            </p>
                            <p className="text-[11px] font-semibold text-blue-700 mt-0.5 truncate">
                              {formatTime(item.startTime)} – {formatTime(item.endTime)}
                            </p>
                            {item.subjects && item.subjects.length > 0 && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {item.subjects.join(", ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Academic Integrity & Tracking Guarantee footer */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>
                Verified hourly tuition sessions are protected with timestamp accuracy and parent review confirmation.
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              ClassSure Academic Tracker
            </span>
          </div>
        </>
      )}
    </div>
  );
}

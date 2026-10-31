import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CalendarDays,
  Clock,
  User,
  GraduationCap,
  BookOpen,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Timer,
  ChevronRight,
  Info,
  CalendarCheck,
  ArrowUpRight,
} from "lucide-react";
import {
  getParentTodaySessionsAPI,
  getParentHistoryAPI,
  getAllChildrensAPI,
  getSchedulesAPI,
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

/**
 * Formats elapsed milliseconds into HH:MM:SS
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
 * Determine accurate display session status according to specification rules:
 * - UPCOMING: The session has not started and its scheduled time has not passed.
 * - IN_PROGRESS: The session has actually started and has not ended.
 * - AWAITING_VERIFICATION: The tutor ended the session and the parent must review it.
 * - APPROVED: The parent approved the session. Keep this status even after scheduled time has passed.
 * - DISPUTED: The parent disputed the session. Keep this status until backend resolves it.
 * - MISSED: The session has passed without being started (now > scheduleEnd and !actualStart).
 * Never label an ongoing, approved, disputed, or awaiting-verification session as Upcoming.
 */
function determineSessionStatus(session, nowMs, sessionDateStr) {
  const rawStatus = String(session?.sessionStatus || "").toUpperCase();

  if (rawStatus === "APPROVED") {
    return "APPROVED";
  }

  if (rawStatus === "DISPUTED") {
    return "DISPUTED";
  }

  if (rawStatus === "AWAITING_VERIFICATION") {
    return "AWAITING_VERIFICATION";
  }

  // Active in progress
  if (
    rawStatus === "IN_PROGRESS" ||
    (session?.actualStart && !session?.actualEnd && rawStatus !== "AWAITING_VERIFICATION")
  ) {
    return "IN_PROGRESS";
  }

  // Check if scheduled time has passed for an unstarted session
  const scheduleEndMs = parseKolkataDateTimeToMs(
    session?.scheduleEnd || session?.endTime,
    sessionDateStr
  );

  if (scheduleEndMs && nowMs > scheduleEndMs && !session?.actualStart) {
    return "MISSED";
  }

  return "UPCOMING";
}

/**
 * Status Badge Component with ClassSure system colors & icons
 */
function SessionStatusBadge({ status }) {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          Live In Progress
        </span>
      );

    case "AWAITING_VERIFICATION":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Awaiting Verification
        </span>
      );

    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-xs">
          <CheckCircle2 size={13} className="text-emerald-600" />
          Approved
        </span>
      );

    case "DISPUTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-xs">
          <AlertCircle size={13} className="text-rose-600" />
          Disputed
        </span>
      );

    case "MISSED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Missed
        </span>
      );

    case "UPCOMING":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Upcoming
        </span>
      );
  }
}

/**
 * Dedicated Live Timer Component for ongoing tuitions
 * Updates every second from the persisted actualStart timestamp
 */
function LiveElapsedTimer({ actualStart, nowMs }) {
  const startMs = parseTimestamp(actualStart);

  if (!startMs || isNaN(startMs)) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle size={15} className="shrink-0 text-amber-600" />
        <span className="font-medium">
          Start timestamp not recorded by tutor. Elapsed timer unavailable.
        </span>
      </div>
    );
  }

  const elapsedMs = Math.max(0, nowMs - startMs);
  const timerDisplay = formatElapsedTime(elapsedMs);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
          <Timer size={18} className="animate-pulse" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
            Live Session Elapsed Time
          </p>
          <p className="text-xs text-slate-500">
            Started at{" "}
            {new Intl.DateTimeFormat("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            }).format(new Date(startMs))}{" "}
            IST
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <div className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 border border-blue-200/80 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-lg font-bold tracking-wider text-slate-900">
            {timerDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Tuition Card displaying details for a single today's session
 */
function TuitionCard({ tuition, nowMs, onNavigateToTab }) {
  const {
    id,
    studentName,
    grade,
    boardName,
    tutorName,
    subjectNames,
    scheduleStart,
    scheduleEnd,
    sessionDateStr,
    actualStart,
    actualEnd,
    displayStatus,
  } = tuition;

  const timeRangeDisplay = formatScheduledTimeRange(
    scheduleStart,
    scheduleEnd,
    sessionDateStr
  );

  const isOngoing = displayStatus === "IN_PROGRESS";
  const isAwaitingReview = displayStatus === "AWAITING_VERIFICATION";
  const isApproved = displayStatus === "APPROVED";
  const isDisputed = displayStatus === "DISPUTED";
  const isMissed = displayStatus === "MISSED";

  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

  const recordedDuration = useMemo(() => {
    if (tuition?.correctedDurationMinutes != null && Number(tuition.correctedDurationMinutes) > 0) {
      const mins = Number(tuition.correctedDurationMinutes);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return `${m} mins (adjusted)`;
      return `${h} hr ${m} min (adjusted)`;
    }
    if (!actualStart || !actualEnd) return null;
    const s = parseTimestamp(actualStart);
    const e = parseTimestamp(actualEnd);
    if (!s || !e || e <= s) return null;
    const mins = Math.round((e - s) / (1000 * 60));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} mins`;
    return `${h} hr ${m} min`;
  }, [actualStart, actualEnd, tuition?.correctedDurationMinutes]);

  return (
    <div
      className={`group relative rounded-2xl border bg-white p-5 sm:p-6 transition-all duration-200 shadow-xs hover:shadow-md ${
        isOngoing
          ? "border-blue-300 ring-2 ring-blue-500/10 bg-gradient-to-br from-white via-white to-blue-50/20"
          : isAwaitingReview
          ? "border-indigo-200/90"
          : "border-slate-200/80"
      }`}
    >
      {/* Header Row: Student avatar, details, and status badge */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${
              isOngoing
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 border border-slate-200/60"
            }`}
          >
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                {studentName}
              </h3>
              {grade && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  <GraduationCap size={12} className="text-slate-500" />
                  {grade}
                </span>
              )}
              {boardName && (
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                  {boardName}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <User size={13} className="text-slate-400" />
              <span>Tutor:</span>
              <span className="font-medium text-slate-800">{tutorName}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          <SessionStatusBadge status={displayStatus} />
        </div>
      </div>

      {/* Middle Body: Scheduled Time and Subjects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
        {/* Scheduled Start & End Time */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 border border-slate-200/60">
            <Clock size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Scheduled Time (IST)
            </p>
            <p className="text-xs font-medium text-slate-800">
              {timeRangeDisplay}
            </p>
          </div>
        </div>

        {/* Subjects */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 border border-slate-200/60">
            <BookOpen size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Subjects
            </p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {subjectNames && subjectNames.length > 0 ? (
                subjectNames.map((subj, idx) => (
                  <span
                    key={`${id}_subj_${idx}`}
                    className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100/60"
                  >
                    {subj}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">
                  Subjects not specified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Running Timer: Rendered strictly when IN_PROGRESS */}
      {isOngoing && (
        <div className="mt-1 mb-2">
          <LiveElapsedTimer actualStart={actualStart} nowMs={nowMs} />
        </div>
      )}

      {/* Contextual Action / Status Footer */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
        {isAwaitingReview && (
          <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-indigo-50/80 px-3.5 py-2.5 border border-indigo-100 text-indigo-900">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-indigo-600 shrink-0" />
              <span className="text-xs font-medium">
                Tutor ended the session{recordedDuration ? ` (${recordedDuration})` : ""}. Please review and verify duration.
              </span>
            </div>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("Reviews")}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Review Session
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {isApproved && (
          <div className="flex items-center justify-between w-full text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Verified and recorded in tuition history.{recordedDuration ? ` (${recordedDuration})` : ""}
            </span>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("History")}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
              >
                View History
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        )}

        {isDisputed && (
          <div className="flex items-center justify-between w-full text-slate-500">
            <span className="flex items-center gap-1.5 text-rose-700 font-medium">
              <AlertCircle size={14} className="text-rose-600" />
              Disputed session under review.
            </span>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("Reviews")}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
              >
                View Details
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}

        {isMissed && (
          <div className="flex items-center justify-between w-full text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-600">
              <AlertTriangle size={14} className="text-amber-500" />
              Session was not started during scheduled window.
            </span>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("My Children")}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
              >
                Check Schedule
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}

        {displayStatus === "UPCOMING" && (
          <div className="flex items-center justify-between w-full text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Clock size={14} className="text-sky-500" />
              Session is scheduled for today. Tutor will initiate when starting.
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Timezone: IST (Asia/Kolkata)
            </span>
          </div>
        )}

        {isOngoing && (
          <div className="flex items-center justify-between w-full text-slate-500">
            <span className="flex items-center gap-1.5 text-blue-700 font-medium">
              <Radio size={14} className="text-blue-600 animate-pulse" />
              Session is live. Duration is actively logged.
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Updates in real-time
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Loading Skeleton Component
 */
function TodaysTuitionsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div
          key={`skel_${i}`}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse"
        >
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-36 rounded bg-slate-200" />
                <div className="h-3 w-28 rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-6 w-24 rounded-full bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
            <div className="h-12 rounded-xl bg-slate-100" />
            <div className="h-12 rounded-xl bg-slate-100" />
          </div>
          <div className="pt-3 border-t border-slate-100">
            <div className="h-4 w-48 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Main Today's Tuitions Component for Parent Dashboard
 */
export default function TodaysTuitions({ onNavigateToTab }) {
  const [tuitions, setTuitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Prevent duplicate concurrent requests
  const isFetchingRef = useRef(false);

  /**
   * Main fetcher using existing tuition / session APIs
   */
  const fetchTodaysTuitions = useCallback(async (showRefreshingSpinner = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const todayKolkataDateStr = getTodayKolkataDateStr();
      const todayKolkataDay = getTodayKolkataDayOfWeek();

      // 1. Fetch parent's tuition sessions using today-sessions API or history API
      let allSessions = [];
      try {
        let historyRes = await getParentTodaySessionsAPI();
        if (historyRes.status === 404 || !historyRes.ok) {
          historyRes = await getParentHistoryAPI();
        }

        if (historyRes.status === 401) {
          throw new Error("Your login session has expired. Please log in again.");
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          allSessions = Array.isArray(historyData?.data)
            ? historyData.data
            : Array.isArray(historyData?.sessions)
            ? historyData.sessions
            : Array.isArray(historyData)
            ? historyData
            : [];
        } else if (historyRes.status !== 404) {
          let errMsg = "Failed to load tuition details.";
          try {
            const errBody = await historyRes.json();
            if (errBody?.message) errMsg = errBody.message;
          } catch {
            // ignore
          }
          throw new Error(errMsg);
        }
      } catch (sessErr) {
        if (sessErr.message?.includes("expired")) {
          throw sessErr;
        }
        console.warn("Could not load sessions, will fallback to active schedules:", sessErr);
      }

      // 2. Fetch parent's children (source of student names, grades, board, and subjectIds)
      const childrenMap = new Map();
      try {
        const cRes = await getAllChildrensAPI();
        if (cRes.ok) {
          const cData = await cRes.json();
          if (Array.isArray(cData)) {
            cData.forEach((c) => {
              const cId = String(c.id || c._id || "");
              if (cId) childrenMap.set(cId, c);
            });
          }
        }
      } catch (childErr) {
        console.warn("Could not load children details:", childErr);
      }

      // 3. Fetch parent's schedules (to complement or cross-reference today's active schedules)
      const schedulesMap = new Map();
      let activeTodaySchedules = [];
      try {
        const sRes = await getSchedulesAPI();
        if (sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData)) {
            sData.forEach((s) => {
              const sId = String(s.id || s._id || "");
              if (sId) {
                schedulesMap.set(sId, s);
              }
            });

            // Filter schedules accepted for today
            activeTodaySchedules = sData.filter((s) => {
              if (s.status !== "ACCEPTED") return false;

              // Check days of week
              if (
                Array.isArray(s.daysOfWeek) &&
                !s.daysOfWeek.map((d) => String(d).toUpperCase()).includes(todayKolkataDay)
              ) {
                return false;
              }

              // Check effective date range
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
          }
        }
      } catch (schedErr) {
        console.warn("Could not load schedules details:", schedErr);
      }

      // 4. Filter sessions that belong to TODAY in Asia/Kolkata
      const todaySessions = allSessions.filter((s) => {
        const sessionDate = extractSessionDateStr(
          s.sessionDate || s.scheduleStart || s.actualStart
        );
        return sessionDate === todayKolkataDateStr;
      });

      // Combine today's sessions with any active accepted schedules without introducing duplicates
      const existingScheduleIds = new Set(
        todaySessions.map((s) => String(s.scheduleId || "")).filter(Boolean)
      );
      const existingChildTimeKeys = new Set(
        todaySessions.map((s) => {
          const cId = String(s.childId || "");
          const time = s.startTime || (s.scheduleStart ? String(s.scheduleStart).slice(11, 16) : "");
          return `${cId}_${time}`;
        })
      );

      const combinedSessions = [];
      const seenCombinedKeys = new Set();

      for (const s of todaySessions) {
        const sId = String(s.id || s._id || "");
        const schedId = String(s.scheduleId || "");
        const cId = String(s.childId || "");
        const time = s.startTime || (s.scheduleStart ? String(s.scheduleStart).slice(11, 16) : "");
        const key = schedId ? `sched_${schedId}` : sId ? `id_${sId}` : `c_${cId}_${time}`;
        if (!seenCombinedKeys.has(key)) {
          seenCombinedKeys.add(key);
          combinedSessions.push(s);
        }
      }

      activeTodaySchedules.forEach((sched) => {
        const schedId = String(sched.id || sched._id || "");
        const childId = String(sched.childId || "");
        const timeKey = `${childId}_${String(sched.startTime || "").slice(0, 5)}`;
        const key = `sched_${schedId}`;
        if (!existingScheduleIds.has(schedId) && !existingChildTimeKeys.has(timeKey) && !seenCombinedKeys.has(key)) {
          seenCombinedKeys.add(key);
          combinedSessions.push({
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

      // 5. Gather unique tutor IDs and subject IDs to batch resolve
      const uniqueTutorIds = [
        ...new Set(
          combinedSessions
            .map((s) => s.tutorId || childrenMap.get(String(s.childId))?.tutorId)
            .filter(Boolean)
        ),
      ];

      const uniqueSubjectIds = [
        ...new Set(
          Array.from(childrenMap.values()).flatMap((c) =>
            Array.isArray(c.subjectIds) ? c.subjectIds : []
          )
        ),
      ];

      const uniqueBoardIds = [
        ...new Set(
          Array.from(childrenMap.values())
            .map((c) => c.board)
            .filter(Boolean)
        ),
      ];

      // Resolve tutors in parallel
      const tutorsMap = new Map();
      if (uniqueTutorIds.length > 0) {
        await Promise.allSettled(
          uniqueTutorIds.map(async (tId) => {
            try {
              const tRes = await getTutorByIdAPI(tId);
              if (tRes.ok) {
                const tData = await tRes.json();
                const name =
                  tData.fullName || tData.name || tData.email || "Tutor";
                tutorsMap.set(String(tId), name);
              }
            } catch {
              // ignore
            }
          })
        );
      }

      // Resolve subjects in batch
      const subjectsMap = new Map();
      if (uniqueSubjectIds.length > 0) {
        try {
          const subRes = await getSubjectsByIdsAPI(uniqueSubjectIds);
          if (subRes.ok) {
            const subData = await subRes.json();
            if (Array.isArray(subData)) {
              subData.forEach((s) => {
                const id = String(s.id || s._id || "");
                const name = s.name || s.subjectName;
                if (id && name) subjectsMap.set(id, name);
              });
            }
          }
        } catch {
          // ignore
        }
      }

      // Resolve boards
      const boardsMap = new Map();
      if (uniqueBoardIds.length > 0) {
        await Promise.allSettled(
          uniqueBoardIds.map(async (bId) => {
            try {
              const bRes = await getBoardByIdAPI(bId);
              if (bRes.ok) {
                const bData = await bRes.json();
                const bName = bData.name || bData.boardName || bId;
                boardsMap.set(String(bId), bName);
              }
            } catch {
              // ignore
            }
          })
        );
      }

      // 6. Enrich every today's tuition item
      const currentNowMs = Date.now();
      const enrichedTuitions = combinedSessions.map((session) => {
        const childId = String(session.childId || "");
        const child = childrenMap.get(childId);
        const schedule = session.scheduleId
          ? schedulesMap.get(String(session.scheduleId))
          : null;

        const tutorId = String(
          session.tutorId || child?.tutorId || schedule?.tutorId || ""
        );

        const studentName =
          child?.name || session.studentName || "Student";
        const grade = child?.grade || "Grade unavailable";

        const boardName = child?.board
          ? boardsMap.get(String(child.board)) || child.board
          : "";

        const tutorName =
          tutorsMap.get(tutorId) ||
          session.tutorName ||
          "Tutor unavailable";

        // Resolve subject names
        let subjectNames = [];
        if (Array.isArray(child?.subjectIds) && child.subjectIds.length > 0) {
          subjectNames = child.subjectIds
            .map((id) => subjectsMap.get(String(id)))
            .filter(Boolean);
        }
        if (subjectNames.length === 0 && Array.isArray(child?.subjects)) {
          subjectNames = child.subjects;
        }

        const sessionDateStr =
          extractSessionDateStr(
            session.sessionDate || session.scheduleStart || session.actualStart
          ) || todayKolkataDateStr;

        const scheduleStart =
          session.scheduleStart || schedule?.startTime || "";
        const scheduleEnd =
          session.scheduleEnd || schedule?.endTime || "";

        const scheduleStartMs = parseKolkataDateTimeToMs(
          scheduleStart,
          sessionDateStr
        );
        const scheduleEndMs = parseKolkataDateTimeToMs(
          scheduleEnd,
          sessionDateStr
        );

        const displayStatus = determineSessionStatus(
          session,
          currentNowMs,
          sessionDateStr
        );

        return {
          id: String(session.id || session._id || Math.random()),
          rawSession: session,
          childId,
          studentName,
          grade,
          boardName,
          tutorName,
          subjectNames,
          sessionDateStr,
          scheduleStart,
          scheduleEnd,
          scheduleStartMs,
          scheduleEndMs,
          actualStart: session.actualStart,
          actualEnd: session.actualEnd,
          displayStatus,
        };
      });

      // Sort by scheduled start time
      enrichedTuitions.sort(
        (a, b) => (a.scheduleStartMs || 0) - (b.scheduleStartMs || 0)
      );

      setTuitions(enrichedTuitions);
    } catch (err) {
      console.error("Error fetching today's tuitions:", err);
      setError(err.message || "Failed to retrieve today's tuition schedules.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTodaysTuitions(false);
  }, [fetchTodaysTuitions]);

  // Live timer interval: updates nowMs every second when at least one session is IN_PROGRESS
  useEffect(() => {
    const hasLive = tuitions.some((t) => t.displayStatus === "IN_PROGRESS");
    if (!hasLive) return;

    setNowMs(Date.now());
    const timerId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [tuitions]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    let ongoing = 0;
    let upcoming = 0;
    let awaitingReview = 0;
    let approved = 0;
    let missed = 0;

    tuitions.forEach((t) => {
      if (t.displayStatus === "IN_PROGRESS") ongoing++;
      else if (t.displayStatus === "UPCOMING") upcoming++;
      else if (t.displayStatus === "AWAITING_VERIFICATION") awaitingReview++;
      else if (t.displayStatus === "APPROVED") approved++;
      else if (t.displayStatus === "MISSED") missed++;
    });

    return {
      total: tuitions.length,
      ongoing,
      upcoming,
      awaitingReview,
      approved,
      missed,
    };
  }, [tuitions]);

  return (
    <section className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Today's Tuitions
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Asia/Kolkata
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
            <CalendarDays size={15} className="text-slate-400" />
            <span>{formatTodayKolkataDisplay()}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchTodaysTuitions(true)}
            disabled={loading || isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            aria-label="Refresh today's tuitions"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin text-blue-600" : "text-slate-500"}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip when records exist */}
      {!loading && !error && tuitions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Today's Total
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {summaryCounts.total}{" "}
              <span className="text-xs font-normal text-slate-500">
                {summaryCounts.total === 1 ? "session" : "sessions"}
              </span>
            </p>
          </div>

          <div
            className={`rounded-xl border p-3.5 shadow-xs ${
              summaryCounts.ongoing > 0
                ? "border-amber-200 bg-amber-50/50"
                : "border-slate-200/80 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Ongoing Live
              </p>
              {summaryCounts.ongoing > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </div>
            <p className="mt-1 text-xl font-bold text-amber-900">
              {summaryCounts.ongoing}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
              Upcoming
            </p>
            <p className="mt-1 text-xl font-bold text-sky-900">
              {summaryCounts.upcoming}
            </p>
          </div>

          <div
            className={`rounded-xl border p-3.5 shadow-xs ${
              summaryCounts.awaitingReview > 0
                ? "border-indigo-200 bg-indigo-50/50"
                : "border-slate-200/80 bg-white"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              Needs Review
            </p>
            <p className="mt-1 text-xl font-bold text-indigo-900">
              {summaryCounts.awaitingReview}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <TodaysTuitionsSkeleton />}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 sm:p-8 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-semibold text-rose-900">
            Unable to load today's tuitions
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-rose-600">
            {error}
          </p>
          <button
            type="button"
            onClick={() => fetchTodaysTuitions(false)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty State: No Tuitions Today */}
      {!loading && !error && tuitions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-xs">
            <CalendarCheck size={26} strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No tuitions scheduled for today
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            You don't have any tuition sessions scheduled for today across your enrolled children.
            Schedules will automatically appear here on their scheduled class days once approved.
          </p>
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab("My Children")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-xs"
            >
              View Children & Schedules →
            </button>
          )}
        </div>
      )}

      {/* Tuitions List */}
      {!loading && !error && tuitions.length > 0 && (
        <div className="space-y-4">
          {tuitions.map((tuition) => (
            <TuitionCard
              key={tuition.id}
              tuition={tuition}
              nowMs={nowMs}
              onNavigateToTab={onNavigateToTab}
            />
          ))}
        </div>
      )}
    </section>
  );
}

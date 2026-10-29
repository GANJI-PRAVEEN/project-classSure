import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  CalendarDays,
  Clock,
  User,
  GraduationCap,
  Search,
  X,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  getParentHistoryAPI,
  getAllChildrensAPI,
  getTutorByIdAPI,
  getSchedulesAPI,
} from "../../API/api.js";
import {
  formatSessionDate,
  formatTime12h,
  formatScheduledTimeRange,
  calculateDurationMinutes,
  formatDurationHuman,
  formatCurrency,
  getComparableDateStr,
} from "../../utils/dateTimeUtils.js";

/**
 * Status badge component matching existing ClassSure styling system
 */
function StatusBadge({ status }) {
  const normalizedStatus = String(status || "UPCOMING").toUpperCase();

  switch (normalizedStatus) {
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Approved
        </span>
      );

    case "AWAITING_VERIFICATION":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Awaiting Review
        </span>
      );

    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          In Progress
        </span>
      );

    case "DISPUTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Disputed
        </span>
      );

    case "MISSED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
          Missed
        </span>
      );

    case "UPCOMING":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          Upcoming
        </span>
      );
  }
}

export default function History() {
  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [completedTuitions, setCompletedTuitions] = useState([]);

  // Modal state
  const [selectedSession, setSelectedSession] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [tutorFilter, setTutorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  /**
   * Main data fetching and enrichment workflow
   */
  const loadHistoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch parent history endpoint
      const res = await getParentHistoryAPI();

      if (res.status === 401) {
        throw new Error("Authentication session has expired. Please log in again.");
      }

      if (!res.ok) {
        let errMsg = "Failed to load tuition session history.";
        try {
          const errBody = await res.json();
          if (errBody && errBody.message) errMsg = errBody.message;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }

      const resText = await res.text();
      let resData = {};
      if (resText && resText.trim()) {
        try {
          resData = JSON.parse(resText);
          console.log("parent history : ", resData);
        } catch (jsonErr) {
          console.warn("Failed to parse history response JSON:", jsonErr);
        }
      }

      // Extract raw sessions and completed tuitions safely
      const rawSessions = Array.isArray(resData.sessions)
        ? resData.sessions
        : Array.isArray(resData.data)
          ? resData.data
          : Array.isArray(resData)
            ? resData
            : [];
      console.log(rawSessions, "rawsession");
      const rawCompleted = Array.isArray(resData.completedTuitions)
        ? resData.completedTuitions
        : [];

      setCompletedTuitions(rawCompleted);

      // 2. Fetch parent's children (deduplicated source for students)
      const childrenMap = new Map();
      try {
        const cRes = await getAllChildrensAPI();
        if (cRes.ok) {
          const cData = await cRes.json();
          if (Array.isArray(cData)) {
            cData.forEach((c) => {
              const cId = c.id || c._id;
              if (cId) {
                childrenMap.set(String(cId), c);
              }
            });
          }
        }
      } catch (childErr) {
        console.warn("Error fetching children details:", childErr);
      }

      // 3. Fetch parent's schedules (to optionally resolve schedule details)
      const schedulesMap = new Map();
      try {
        const sRes = await getSchedulesAPI();
        if (sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData)) {
            sData.forEach((s) => {
              const sId = s.id || s._id;
              if (sId) {
                schedulesMap.set(String(sId), s);
              }
            });
          }
        }
      } catch (schedErr) {
        console.warn("Error fetching schedules:", schedErr);
      }

      // 4. Resolve unique tutor IDs
      const tutorsMap = new Map();
      const uniqueTutorIds = [
        ...new Set(
          [
            ...rawSessions.map((s) => s.tutorId),
            ...rawCompleted.map((c) => c.tutorId),
          ].filter(Boolean)
        ),
      ];

      if (uniqueTutorIds.length > 0) {
        await Promise.allSettled(
          uniqueTutorIds.map(async (tutorId) => {
            try {
              const tRes = await getTutorByIdAPI(tutorId);
              if (tRes && tRes.ok) {
                const tData = await tRes.json();
                const tName =
                  tData.fullName ||
                  tData.name ||
                  tData.email ||
                  "Tutor";
                tutorsMap.set(String(tutorId), tName);
              }
            } catch (tErr) {
              console.warn(`Error resolving tutor ${tutorId}:`, tErr);
            }
          })
        );
      }

      // 5. Index completed tuitions by sessionId
      const completedTuitionMap = new Map();
      rawCompleted.forEach((ct) => {
        if (ct.sessionId) {
          completedTuitionMap.set(String(ct.sessionId), ct);
        }
      });

      // 6. Enrich every session record
      const enriched = rawSessions.map((session) => {
        const sessionId = String(session.id || session._id || "");
        const childRecord = session.childId
          ? childrenMap.get(String(session.childId))
          : null;
        const studentName =
          childRecord?.name ||
          session.studentName ||
          "Student unavailable";

        const tutorName =
          (session.tutorId && tutorsMap.get(String(session.tutorId))) ||
          session.tutorName ||
          "Tutor unavailable";

        const scheduleRecord = session.scheduleId
          ? schedulesMap.get(String(session.scheduleId))
          : null;

        const matchingCompleted = completedTuitionMap.get(sessionId) || null;

        // Duration calculation
        let calculatedDuration = null;
        if (matchingCompleted?.verifiedDurationHours) {
          calculatedDuration = Math.round(
            matchingCompleted.verifiedDurationHours * 60
          );
        } else if (session.correctedDurationMinutes != null && session.correctedDurationMinutes > 0) {
          calculatedDuration = Number(session.correctedDurationMinutes);
        } else if (session.actualStart && session.actualEnd) {
          calculatedDuration = calculateDurationMinutes(
            session.actualStart,
            session.actualEnd
          );
        } else if (session.durationMinutes != null && session.durationMinutes > 0) {
          calculatedDuration = Number(session.durationMinutes);
        }

        // Finalized amount
        let finalizedAmount = null;
        if (matchingCompleted && matchingCompleted.earnedAmount != null) {
          finalizedAmount = Number(matchingCompleted.earnedAmount);
        }

        // Hourly rate
        const hourlyRate =
          session.hourlyRate ??
          matchingCompleted?.hourlyRate ??
          scheduleRecord?.hourlyRate ??
          null;

        return {
          ...session,
          id: sessionId,
          studentName,
          tutorName,
          scheduleRecord,
          matchingCompleted,
          calculatedDuration,
          finalizedAmount,
          hourlyRate,
          sessionStatus: session.sessionStatus || "UPCOMING",
          comparableDate: getComparableDateStr(session),
        };
      });

      // Sort newest first by session date
      enriched.sort((a, b) => {
        const dateA = a.comparableDate || "";
        const dateB = b.comparableDate || "";
        return dateB.localeCompare(dateA);
      });

      setSessions(enriched);
    } catch (err) {
      console.error("Parent history loading error:", err);
      setError(err.message || "Failed to load tuition session history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  /**
   * Calculate summary metrics from actual loaded data
   * Requirements:
   * - Count each session once
   * - Sum finalized amounts only from completedTuitions (never double count)
   * - Do not label finalized tuition as payments received
   */
  const summaries = useMemo(() => {
    const totalSessions = sessions.length;
    const approvedSessions = sessions.filter(
      (s) => String(s.sessionStatus).toUpperCase() === "APPROVED"
    ).length;
    const awaitingReviewSessions = sessions.filter(
      (s) => String(s.sessionStatus).toUpperCase() === "AWAITING_VERIFICATION"
    ).length;

    // Sum finalized amount from completedTuitions (deduplicated by id/sessionId)
    const seenCtIds = new Set();
    let totalFinalizedAmount = 0;

    completedTuitions.forEach((ct) => {
      const key = ct.id || ct._id || ct.sessionId;
      if (key && !seenCtIds.has(key)) {
        seenCtIds.add(key);
        const amt = Number(ct.earnedAmount);
        if (!isNaN(amt) && amt > 0) {
          totalFinalizedAmount += amt;
        }
      }
    });

    return {
      totalSessions,
      approvedSessions,
      awaitingReviewSessions,
      totalFinalizedAmount,
    };
  }, [sessions, completedTuitions]);

  /**
   * Unique lists for dropdown filters
   */
  const filterOptions = useMemo(() => {
    const students = Array.from(
      new Set(
        sessions
          .map((s) => s.studentName)
          .filter((name) => name && name !== "Student unavailable")
      )
    ).sort();

    const tutors = Array.from(
      new Set(
        sessions
          .map((s) => s.tutorName)
          .filter((name) => name && name !== "Tutor unavailable")
      )
    ).sort();

    return { students, tutors };
  }, [sessions]);

  /**
   * Filter sessions client-side
   */
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // 1. Search Query (student name or tutor name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const studentMatch = (session.studentName || "")
          .toLowerCase()
          .includes(query);
        const tutorMatch = (session.tutorName || "")
          .toLowerCase()
          .includes(query);
        if (!studentMatch && !tutorMatch) {
          return false;
        }
      }

      // 2. Student Filter
      if (studentFilter !== "ALL") {
        if (session.studentName !== studentFilter) {
          return false;
        }
      }

      // 3. Tutor Filter
      if (tutorFilter !== "ALL") {
        if (session.tutorName !== tutorFilter) {
          return false;
        }
      }

      // 4. Status Filter
      if (statusFilter !== "ALL") {
        if (
          String(session.sessionStatus).toUpperCase() !==
          String(statusFilter).toUpperCase()
        ) {
          return false;
        }
      }

      // 5. Date Range Filter
      const sessionDateStr = session.comparableDate;
      if (startDateFilter && sessionDateStr) {
        if (sessionDateStr < startDateFilter) {
          return false;
        }
      }
      if (endDateFilter && sessionDateStr) {
        if (sessionDateStr > endDateFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    sessions,
    searchQuery,
    studentFilter,
    tutorFilter,
    statusFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    studentFilter !== "ALL" ||
    tutorFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    Boolean(startDateFilter) ||
    Boolean(endDateFilter);

  function handleClearFilters() {
    setSearchQuery("");
    setStudentFilter("ALL");
    setTutorFilter("ALL");
    setStatusFilter("ALL");
    setStartDateFilter("");
    setEndDateFilter("");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Session History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track tuition session attendance, verified durations, and finalized tuition amounts.
          </p>
        </div>

        <button
          type="button"
          onClick={loadHistoryData}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
          title="Refresh history records"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin text-blue-600" : "text-slate-500"}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sessions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Sessions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays size={18} />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">
                {summaries.totalSessions}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Recorded tuition classes
            </p>
          </div>
        </div>

        {/* Approved Sessions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Approved Sessions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600">
                {summaries.approvedSessions}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Verified by parent review
            </p>
          </div>
        </div>

        {/* Sessions Awaiting Review */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Awaiting Review
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-2xl font-bold text-indigo-600">
                {summaries.awaitingReviewSessions}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Pending attendance approval
            </p>
          </div>
        </div>

        {/* Total Finalized Amount */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Finalized Tuition
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <span className="text-sm font-bold">₹</span>
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(summaries.totalFinalizedAmount)}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Verified from completed tuitions
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student or tutor name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Student Filter */}
            <div className="relative">
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                aria-label="Filter by student"
              >
                <option value="ALL">All Students</option>
                {filterOptions.students.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Tutor Filter */}
            <div className="relative">
              <select
                value={tutorFilter}
                onChange={(e) => setTutorFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                aria-label="Filter by tutor"
              >
                <option value="ALL">All Tutors</option>
                {filterOptions.tutors.map((tu) => (
                  <option key={tu} value={tu}>
                    {tu}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                aria-label="Filter by session status"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="AWAITING_VERIFICATION">Awaiting Review</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="DISPUTED">Disputed</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-1 text-xs text-slate-600">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-hidden"
                title="From session date"
                aria-label="From session date"
              />
              <span className="text-slate-300">—</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-hidden"
                title="To session date"
                aria-label="To session date"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                title="Reset all search filters"
              >
                <RotateCcw size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Count & Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {filteredSessions.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {sessions.length}
            </span>{" "}
            sessions
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {studentFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
                  Student: {studentFilter}
                  <button
                    type="button"
                    onClick={() => setStudentFilter("ALL")}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {tutorFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
                  Tutor: {tutorFilter}
                  <button
                    type="button"
                    onClick={() => setTutorFilter("ALL")}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
                  Status: {statusFilter}
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {(startDateFilter || endDateFilter) && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
                  Date: {startDateFilter || "Start"} to {endDateFilter || "End"}
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                    }}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        /* Loading Skeleton */
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-none"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* API Error State */
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-semibold text-rose-900">
            Unable to Load Tuition History
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-rose-700">
            {error}
          </p>
          <button
            type="button"
            onClick={loadHistoryData}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition"
          >
            <RefreshCw size={14} />
            <span>Retry Loading</span>
          </button>
        </div>
      ) : sessions.length === 0 ? (
        /* Empty History State */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <CalendarDays size={26} strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No tuition sessions recorded yet
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Your tuition session logs, verified attendances, and finalized amounts will appear here once your enrolled schedules conduct learning classes.
          </p>
        </div>
      ) : filteredSessions.length === 0 ? (
        /* No Matching Results State */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Search size={22} strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No sessions match your filter criteria
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Try adjusting your search query, selecting different student/tutor options, or widening the date range.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            <RotateCcw size={13} />
            <span>Clear All Filters</span>
          </button>
        </div>
      ) : (
        /* History Table & Responsive Mobile Cards */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-5 py-3.5">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Tutor
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Scheduled Time
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Actual Duration
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-blue-50/40 transition-colors"
                  >
                    {/* 1. Date */}
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar
                          size={15}
                          className="text-slate-400 shrink-0"
                        />
                        <span>{formatSessionDate(session.sessionDate || session.scheduleStart)}</span>
                      </div>
                    </td>

                    {/* 2. Student */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/70 text-xs font-bold text-blue-700">
                          {session.studentName[0] || "S"}
                        </div>
                        <span className="font-medium text-slate-900">
                          {session.studentName}
                        </span>
                      </div>
                    </td>

                    {/* 3. Tutor */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100/70 text-xs font-bold text-purple-700">
                          {session.tutorName[0] || "T"}
                        </div>
                        <span className="text-slate-700">
                          {session.tutorName}
                        </span>
                      </div>
                    </td>

                    {/* 4. Scheduled Time */}
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600 font-mono text-xs">
                      {formatScheduledTimeRange(
                        session.scheduleStart,
                        session.scheduleEnd
                      )}
                    </td>

                    {/* 5. Actual Duration */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {session.calculatedDuration != null ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock size={14} className="text-slate-400" />
                          {formatDurationHuman(session.calculatedDuration)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* 6. Amount */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {session.finalizedAmount != null ? (
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(session.finalizedAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-400" title="Finalized tuition recorded upon approval">
                          —
                        </span>
                      )}
                    </td>

                    {/* 7. Status */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <StatusBadge status={session.sessionStatus} />
                    </td>

                    {/* 8. Action */}
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSession(session)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredSessions.map((session) => (
              <div key={session.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-800">
                      {formatSessionDate(session.sessionDate || session.scheduleStart)}
                    </span>
                  </div>
                  <StatusBadge status={session.sessionStatus} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Student
                    </span>
                    <span className="font-medium text-slate-900 truncate block">
                      {session.studentName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Tutor
                    </span>
                    <span className="font-medium text-slate-800 truncate block">
                      {session.tutorName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Scheduled
                    </span>
                    <span className="text-slate-600 font-mono text-[11px] block">
                      {formatScheduledTimeRange(session.scheduleStart, session.scheduleEnd)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Duration / Amount
                    </span>
                    <span className="font-semibold text-slate-900 block">
                      {formatDurationHuman(session.calculatedDuration)}{" "}
                      {session.finalizedAmount != null && (
                        <span className="text-blue-700 font-bold ml-1">
                          • {formatCurrency(session.finalizedAmount)}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSession(session)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    <Eye size={13} />
                    <span>View Session Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-session-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3
                    id="modal-session-details-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Session Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatSessionDate(
                      selectedSession.sessionDate || selectedSession.scheduleStart
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
              {/* Status and Session ID */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Session Status
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={selectedSession.sessionStatus} />
                  </div>
                </div>
                {selectedSession.id && (
                  <div className="text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Session Reference
                    </span>
                    <span className="font-mono text-xs text-slate-600 mt-1 block">
                      #{selectedSession.id.slice(-8)}
                    </span>
                  </div>
                )}
              </div>

              {/* People Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/80 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <GraduationCap size={15} className="text-blue-600" />
                    <span>Student</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {selectedSession.studentName}
                  </p>
                  {selectedSession.scheduleRecord?.grade && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Grade: {selectedSession.scheduleRecord.grade}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200/80 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <User size={15} className="text-purple-600" />
                    <span>Tutor</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {selectedSession.tutorName}
                  </p>
                  {selectedSession.hourlyRate != null && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Rate: {formatCurrency(selectedSession.hourlyRate)}/hr
                    </p>
                  )}
                </div>
              </div>

              {/* Timing Breakdown */}
              <div className="rounded-xl border border-slate-200/80 p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Class Timings & Attendance
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Scheduled Start</span>
                    <span className="font-medium text-slate-800 font-mono">
                      {formatTime12h(selectedSession.scheduleStart) || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Scheduled End</span>
                    <span className="font-medium text-slate-800 font-mono">
                      {formatTime12h(selectedSession.scheduleEnd) || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Actual Start</span>
                    <span className="font-medium text-slate-800 font-mono">
                      {formatTime12h(selectedSession.actualStart) || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Actual End</span>
                    <span className="font-medium text-slate-800 font-mono">
                      {formatTime12h(selectedSession.actualEnd) || "—"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Verified Duration:</span>
                  <span className="font-bold text-slate-900">
                    {formatDurationHuman(selectedSession.calculatedDuration)}
                  </span>
                </div>

                {selectedSession.correctedDurationMinutes != null && selectedSession.correctedDurationMinutes > 0 && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-indigo-950">
                      <span className="font-semibold">Parent Corrected Duration:</span>
                      <span className="font-bold font-mono">
                        {formatDurationHuman(selectedSession.correctedDurationMinutes)}
                      </span>
                    </div>
                    {selectedSession.durationCorrectionReason && (
                      <p className="text-[11px] text-indigo-800">
                        Reason: {selectedSession.durationCorrectionReason}
                      </p>
                    )}
                    {selectedSession.durationCorrectionNotes && (
                      <p className="text-[11px] text-indigo-700 italic">
                        Notes: &quot;{selectedSession.durationCorrectionNotes}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tuition Amount & Billing Info */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">
                    Finalized Tuition Amount
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    {selectedSession.finalizedAmount != null
                      ? formatCurrency(selectedSession.finalizedAmount)
                      : "—"}
                  </span>
                </div>

                {selectedSession.matchingCompleted ? (
                  <p className="text-[11px] text-blue-700/80 leading-relaxed">
                    Finalized record verified via parent review on{" "}
                    {formatSessionDate(selectedSession.matchingCompleted.approvedAt)}.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tuition amount is finalized upon session review and approval.
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-blue-100/80">
                  <Info size={13} className="shrink-0 text-blue-600" />
                  <span>
                    Payment gateway is not yet integrated. No transaction has been charged or received.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

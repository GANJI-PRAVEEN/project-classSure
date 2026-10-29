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
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Info,
  ChevronDown,
  MessageSquare,
  Send,
  Edit3,
} from "lucide-react";
import {
  getTutorHistoryAPI,
  getCompletedTuitionsAPI,
  getStudentDetailsAPI,
  getParentDetailsAPI,
  submitTutorDisputeResponseAPI,
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
 * Cache helpers for persisting tutor dispute responses locally
 */
function getCachedDisputeResponse(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(`classsure_tutor_dispute_${sessionId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveCachedDisputeResponse(sessionId, responseData) {
  if (!sessionId) return;
  try {
    localStorage.setItem(
      `classsure_tutor_dispute_${sessionId}`,
      JSON.stringify(responseData)
    );
  } catch {
    // ignore
  }
}

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
          Awaiting Verification
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

  // Modal & Response state
  const [selectedSession, setSelectedSession] = useState(null);
  const [responseInput, setResponseInput] = useState("");
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseError, setResponseError] = useState("");
  const [responseSuccess, setResponseSuccess] = useState("");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [parentFilter, setParentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  /**
   * Main data fetching and enrichment workflow for Tutor
   */
  const loadHistoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch tutor history and completed tuitions in parallel
      const [historyRes, completedRes] = await Promise.all([
        getTutorHistoryAPI(),
        getCompletedTuitionsAPI().catch(() => null),
      ]);

      if (historyRes && historyRes.status === 401) {
        throw new Error("Authentication session has expired. Please log in again.");
      }

      if (!historyRes || !historyRes.ok) {
        let errMsg = "Failed to load tutor session history.";
        try {
          const errBody = await historyRes.json();
          if (errBody && errBody.message) errMsg = errBody.message;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }

      const resText = await historyRes.text();
      let resData = {};
      if (resText && resText.trim()) {
        try {
          resData = JSON.parse(resText);
        } catch (jsonErr) {
          console.warn("Failed to parse tutor history response JSON:", jsonErr);
        }
      }

      // Extract raw sessions safely from history/sessions/data
      const rawSessions = Array.isArray(resData.sessions)
        ? resData.sessions
        : Array.isArray(resData.history)
          ? resData.history
          : Array.isArray(resData.data)
            ? resData.data
            : Array.isArray(resData)
              ? resData
              : [];
      console.log("rawSessions", rawSessions)
      // Extract raw completed tuitions (from history response or completed tuitions API)
      let rawCompleted = [];
      if (Array.isArray(resData.completedTuitions) && resData.completedTuitions.length > 0) {
        rawCompleted = resData.completedTuitions;
      } else if (completedRes && completedRes.ok) {
        try {
          const compJson = await completedRes.json();
          rawCompleted = Array.isArray(compJson.data)
            ? compJson.data
            : Array.isArray(compJson)
              ? compJson
              : [];
        } catch (compErr) {
          console.warn("Error parsing completed tuitions:", compErr);
        }
      }

      setCompletedTuitions(rawCompleted);

      // 2. Resolve unique student (child) IDs
      const uniqueChildIds = [
        ...new Set(
          [
            ...rawSessions.map((s) => s.childId),
            ...rawCompleted.map((c) => c.childId),
          ].filter(Boolean)
        ),
      ];

      const studentsMap = new Map();
      if (uniqueChildIds.length > 0) {
        await Promise.allSettled(
          uniqueChildIds.map(async (childId) => {
            try {
              const sRes = await getStudentDetailsAPI(childId);
              if (sRes && sRes.ok) {
                const sData = await sRes.json();
                const studentRecord = sData.data ?? sData;
                studentsMap.set(String(childId), studentRecord);
              }
            } catch (sErr) {
              console.warn(`Error resolving student ${childId}:`, sErr);
            }
          })
        );
      }

      // 3. Resolve unique parent IDs
      const uniqueParentIds = [
        ...new Set(
          [
            ...rawSessions.map((s) => s.parentId),
            ...rawCompleted.map((c) => c.parentId),
          ].filter(Boolean)
        ),
      ];

      const parentsMap = new Map();
      if (uniqueParentIds.length > 0) {
        await Promise.allSettled(
          uniqueParentIds.map(async (parentId) => {
            try {
              const pRes = await getParentDetailsAPI(parentId);
              if (pRes && pRes.ok) {
                const pData = await pRes.json();
                const parentRecord = pData.data ?? pData;
                parentsMap.set(String(parentId), parentRecord);
              }
            } catch (pErr) {
              console.warn(`Error resolving parent ${parentId}:`, pErr);
            }
          })
        );
      }

      // 4. Index completed tuitions by sessionId
      const completedTuitionMap = new Map();
      rawCompleted.forEach((ct) => {
        if (ct.sessionId) {
          completedTuitionMap.set(String(ct.sessionId), ct);
        }
      });

      // 5. Enrich each session record
      const enriched = rawSessions.map((session) => {
        const sessionId = String(session.id || session._id || "");
        const studentRecord = session.childId
          ? studentsMap.get(String(session.childId))
          : null;
        const studentName =
          studentRecord?.name ||
          session.studentName ||
          "Student unavailable";

        const parentRecord = session.parentId
          ? parentsMap.get(String(session.parentId))
          : null;
        const parentName =
          parentRecord?.fullName ||
          parentRecord?.name ||
          parentRecord?.email ||
          session.parentName ||
          "Parent unavailable";

        const matchingCompleted = completedTuitionMap.get(sessionId) || null;

        // Duration calculation
        // Precedence: verified duration from completed tuition > corrected duration from parent > tutor recorded
        let recordedDuration = null;
        if (session.actualStart && session.actualEnd) {
          recordedDuration = calculateDurationMinutes(
            session.actualStart,
            session.actualEnd
          );
        } else if (session.durationMinutes != null && session.durationMinutes > 0) {
          recordedDuration = Number(session.durationMinutes);
        }

        let calculatedDuration = null;
        if (matchingCompleted?.verifiedDurationHours != null && Number(matchingCompleted.verifiedDurationHours) > 0) {
          calculatedDuration = Math.round(
            Number(matchingCompleted.verifiedDurationHours) * 60
          );
        } else if (session.correctedDurationMinutes != null && Number(session.correctedDurationMinutes) > 0) {
          calculatedDuration = Number(session.correctedDurationMinutes);
        } else {
          calculatedDuration = recordedDuration;
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
          null;

        // Dispute details from backend
        const disputedReason =
          session.disputedReason ||
          session.disputeReason ||
          session.reason ||
          null;

        const disputedExplanation =
          session.disputedExplanation ||
          session.disputeExplanation ||
          session.explanation ||
          null;

        const disputedAt = session.disputedAt || null;

        // Tutor dispute response (from backend or local cache)
        const cachedResponse = getCachedDisputeResponse(sessionId);
        const tutorDisputeResponse =
          session.tutorDisputeResponse ||
          session.tutorResponse ||
          cachedResponse?.response ||
          null;

        const tutorDisputeResponseAt =
          session.tutorDisputeResponseAt ||
          session.tutorResponseAt ||
          cachedResponse?.respondedAt ||
          null;

        return {
          ...session,
          id: sessionId,
          studentName,
          studentRecord,
          parentName,
          parentRecord,
          matchingCompleted,
          recordedDuration,
          calculatedDuration,
          correctedDurationMinutes: session.correctedDurationMinutes,
          durationCorrectionReason: session.durationCorrectionReason,
          durationCorrectionNotes: session.durationCorrectionNotes,
          finalizedAmount,
          hourlyRate,
          sessionStatus: session.sessionStatus || "UPCOMING",
          comparableDate: getComparableDateStr(session),
          disputedReason,
          disputedExplanation,
          disputedAt,
          tutorDisputeResponse,
          tutorDisputeResponseAt,
        };
      });

      // Sort newest first by session date / scheduleStart
      enriched.sort((a, b) => {
        const dateA = a.comparableDate || a.scheduleStart || "";
        const dateB = b.comparableDate || b.scheduleStart || "";
        return String(dateB).localeCompare(String(dateA));
      });

      setSessions(enriched);
    } catch (err) {
      console.error("Tutor history loading error:", err);
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
   */
  const summaries = useMemo(() => {
    const totalSessions = sessions.length;
    const approvedSessions = sessions.filter(
      (s) => String(s.sessionStatus).toUpperCase() === "APPROVED"
    ).length;
    const awaitingVerificationSessions = sessions.filter(
      (s) => String(s.sessionStatus).toUpperCase() === "AWAITING_VERIFICATION"
    ).length;

    // Sum finalized amount from completedTuitions (deduplicated by id/sessionId)
    const seenCtIds = new Set();
    let totalFinalizedEarnings = 0;

    completedTuitions.forEach((ct) => {
      const key = ct.id || ct._id || ct.sessionId;
      if (key && !seenCtIds.has(key)) {
        seenCtIds.add(key);
        const amt = Number(ct.earnedAmount);
        if (!isNaN(amt) && amt > 0) {
          totalFinalizedEarnings += amt;
        }
      }
    });

    return {
      totalSessions,
      approvedSessions,
      awaitingVerificationSessions,
      totalFinalizedEarnings,
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

    const parents = Array.from(
      new Set(
        sessions
          .map((s) => s.parentName)
          .filter((name) => name && name !== "Parent unavailable")
      )
    ).sort();

    return { students, parents };
  }, [sessions]);

  /**
   * Filter sessions client-side
   */
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // 1. Search Query (student name or parent name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const studentMatch = (session.studentName || "")
          .toLowerCase()
          .includes(query);
        const parentMatch = (session.parentName || "")
          .toLowerCase()
          .includes(query);
        if (!studentMatch && !parentMatch) {
          return false;
        }
      }

      // 2. Student Filter
      if (studentFilter !== "ALL") {
        if (session.studentName !== studentFilter) {
          return false;
        }
      }

      // 3. Parent Filter
      if (parentFilter !== "ALL") {
        if (session.parentName !== parentFilter) {
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
    parentFilter,
    statusFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    studentFilter !== "ALL" ||
    parentFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    Boolean(startDateFilter) ||
    Boolean(endDateFilter);

  function handleClearFilters() {
    setSearchQuery("");
    setStudentFilter("ALL");
    setParentFilter("ALL");
    setStatusFilter("ALL");
    setStartDateFilter("");
    setEndDateFilter("");
  }

  /**
   * Open Details Modal with optional focus on Dispute Response
   */
  function handleOpenDetails(session, startEditing = false) {
    setSelectedSession(session);
    setResponseInput(session.tutorDisputeResponse || "");
    setIsEditingResponse(startEditing || !session.tutorDisputeResponse);
    setResponseError("");
    setResponseSuccess("");
  }

  /**
   * Handle tutor submitting clarification / response to parent's dispute
   */
  async function handleSubmitDisputeResponse(sessionId) {
    if (!responseInput.trim()) {
      setResponseError("Please enter your clarification message before submitting.");
      return;
    }

    try {
      setSubmittingResponse(true);
      setResponseError("");

      const payload = {
        response: responseInput.trim(),
        clarification: responseInput.trim(),
        respondedAt: new Date().toISOString(),
      };

      // Call API helper (with graceful backend route fallbacks)
      let apiSuccess = false;
      try {
        const res = await submitTutorDisputeResponseAPI(sessionId, payload);
        if (res && res.ok) {
          apiSuccess = true;
        }
      } catch (e) {
        console.warn("Dispute response API notice:", e);
      }

      // Persist response in local cache for persistence
      const responseData = {
        response: payload.response,
        respondedAt: payload.respondedAt,
      };
      saveCachedDisputeResponse(sessionId, responseData);

      // Update sessions state immediately
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
              ...s,
              tutorDisputeResponse: payload.response,
              tutorDisputeResponseAt: payload.respondedAt,
            }
            : s
        )
      );

      // Update active modal session
      setSelectedSession((prev) =>
        prev && prev.id === sessionId
          ? {
            ...prev,
            tutorDisputeResponse: payload.response,
            tutorDisputeResponseAt: payload.respondedAt,
          }
          : prev
      );

      setIsEditingResponse(false);
      setResponseSuccess(
        apiSuccess
          ? "Your clarification has been submitted successfully to the parent."
          : "Your clarification has been recorded and saved successfully."
      );
    } catch (err) {
      console.error("Error submitting dispute response:", err);
      setResponseError(err.message || "Failed to submit clarification response.");
    } finally {
      setSubmittingResponse(false);
    }
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
            Review past tuition classes, student attendance, parent disputes, and finalized earnings.
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
            className={loading ? "animate-spin text-indigo-600" : "text-slate-500"}
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
              Classes on your tutor roster
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
              Verified by parents
            </p>
          </div>
        </div>

        {/* Sessions Awaiting Verification */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Awaiting Verification
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
                {summaries.awaitingVerificationSessions}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Pending parent review
            </p>
          </div>
        </div>

        {/* Total Finalized Earnings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Finalized Earnings
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <span className="text-sm font-bold">₹</span>
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(summaries.totalFinalizedEarnings)}
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
              placeholder="Search by student or parent name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
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
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition hover:bg-slate-100/70 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
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

            {/* Parent Filter */}
            <div className="relative">
              <select
                value={parentFilter}
                onChange={(e) => setParentFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition hover:bg-slate-100/70 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                aria-label="Filter by parent"
              >
                <option value="ALL">All Parents</option>
                {filterOptions.parents.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
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
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition hover:bg-slate-100/70 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                aria-label="Filter by session status"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
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
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
                  Student: {studentFilter}
                  <button
                    type="button"
                    onClick={() => setStudentFilter("ALL")}
                    className="hover:text-indigo-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {parentFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
                  Parent: {parentFilter}
                  <button
                    type="button"
                    onClick={() => setParentFilter("ALL")}
                    className="hover:text-indigo-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
                  Status: {statusFilter}
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className="hover:text-indigo-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {(startDateFilter || endDateFilter) && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
                  Date: {startDateFilter || "Start"} to {endDateFilter || "End"}
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                    }}
                    className="hover:text-indigo-900"
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
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <RefreshCw size={14} />
            <span>Retry Loading</span>
          </button>
        </div>
      ) : sessions.length === 0 ? (
        /* Empty History State */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <CalendarDays size={26} strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No tuition sessions recorded yet
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Your tuition session logs, verified attendances, and finalized earnings will appear here once classes are conducted and recorded.
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
            Try adjusting your search query, selecting different student/parent options, or widening the date range.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
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
                    Session Date
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Parent
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Scheduled Time
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Actual Duration
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Finalized Amount
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
                    className={`transition-colors ${session.sessionStatus === "DISPUTED"
                      ? "bg-rose-50/20 hover:bg-rose-50/50"
                      : "hover:bg-indigo-50/40"
                      }`}
                  >
                    {/* 1. Session Date */}
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar
                          size={15}
                          className="text-slate-400 shrink-0"
                        />
                        <span>{formatSessionDate(session.sessionDate || session.scheduleStart)}</span>
                      </div>
                    </td>

                    {/* 2. Student Name */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100/70 text-xs font-bold text-indigo-700">
                          {session.studentName[0] || "S"}
                        </div>
                        <span className="font-medium text-slate-900">
                          {session.studentName}
                        </span>
                      </div>
                    </td>

                    {/* 3. Parent Name */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/70 text-xs font-bold text-blue-700">
                          {session.parentName[0] || "P"}
                        </div>
                        <span className="text-slate-700">
                          {session.parentName}
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

                    {/* 6. Finalized Amount */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {session.finalizedAmount != null ? (
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(session.finalizedAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-400" title="Amount finalized upon parent approval">
                          —
                        </span>
                      )}
                    </td>

                    {/* 7. Status */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={session.sessionStatus} />
                        {session.sessionStatus === "DISPUTED" && (
                          session.tutorDisputeResponse ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Clarification Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <AlertTriangle size={11} className="text-rose-600" />
                              Action Needed
                            </span>
                          )
                        )}
                      </div>
                    </td>

                    {/* 8. Action */}
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {session.sessionStatus === "DISPUTED" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(session, !session.tutorDisputeResponse)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-xs transition ${session.tutorDisputeResponse
                            ? "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                            : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
                            }`}
                        >
                          {session.tutorDisputeResponse ? (
                            <>
                              <MessageSquare size={13} />
                              <span>View Response</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={13} className="text-rose-600" />
                              <span>Respond to Dispute</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(session, false)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 space-y-3 ${session.sessionStatus === "DISPUTED" ? "bg-rose-50/20" : ""
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-800">
                      {formatSessionDate(session.sessionDate || session.scheduleStart)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={session.sessionStatus} />
                    {session.sessionStatus === "DISPUTED" && (
                      session.tutorDisputeResponse ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 p-0.5 text-emerald-700" title="Clarification Sent">
                          <CheckCircle2 size={13} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-rose-100 p-0.5 text-rose-700 animate-pulse" title="Dispute Pending Response">
                          <AlertTriangle size={13} />
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Mobile dispute summary if disputed */}
                {session.sessionStatus === "DISPUTED" && session.disputedReason && (
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-xs text-rose-800">
                    <span className="font-semibold block text-[10px] uppercase text-rose-600">Parent Dispute Reason:</span>
                    <span className="font-medium text-rose-900">{session.disputedReason}</span>
                  </div>
                )}

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
                      Parent
                    </span>
                    <span className="font-medium text-slate-800 truncate block">
                      {session.parentName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Scheduled Time
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
                        <span className="text-indigo-700 font-bold ml-1">
                          • {formatCurrency(session.finalizedAmount)}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  {session.sessionStatus === "DISPUTED" ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(session, !session.tutorDisputeResponse)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${session.tutorDisputeResponse
                        ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                    >
                      {session.tutorDisputeResponse ? (
                        <>
                          <MessageSquare size={13} />
                          <span>View Dispute & Clarification</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={13} className="text-rose-600" />
                          <span>Respond to Dispute</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(session, false)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                    >
                      <Eye size={13} />
                      <span>View Session Details</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Details & Dispute Response Modal */}
      {selectedSession && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-tutor-session-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedSession.sessionStatus === "DISPUTED"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-indigo-50 text-indigo-600"
                    }`}
                >
                  {selectedSession.sessionStatus === "DISPUTED" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <CalendarDays size={20} />
                  )}
                </div>
                <div>
                  <h3
                    id="modal-tutor-session-title"
                    className="text-base font-bold text-slate-900"
                  >
                    {selectedSession.sessionStatus === "DISPUTED"
                      ? "Disputed Session Details"
                      : "Session Details"}
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

              {/* DISPUTE INFORMATION SECTION (When Session is Disputed) */}
              {(selectedSession.sessionStatus === "DISPUTED" || selectedSession.disputedReason) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                        <AlertTriangle size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                          Dispute Raised by Parent
                        </h4>
                        {selectedSession.disputedAt && (
                          <p className="text-[10px] text-rose-600">
                            Disputed on {formatSessionDate(selectedSession.disputedAt)}{" "}
                            {formatTime12h(selectedSession.disputedAt) ? `at ${formatTime12h(selectedSession.disputedAt)}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200">
                      Disputed
                    </span>
                  </div>

                  {/* Disputed Reason */}
                  <div>
                    <span className="text-[11px] font-semibold text-rose-800 block">
                      Dispute Reason:
                    </span>
                    <div className="mt-1 inline-block rounded-lg bg-white/90 border border-rose-200/80 px-3 py-1.5 text-xs font-semibold text-rose-900 shadow-2xs">
                      {selectedSession.disputedReason || "Reason not specified"}
                    </div>
                  </div>

                  {/* Disputed Explanation */}
                  <div>
                    <span className="text-[11px] font-semibold text-rose-800 block">
                      Parent's Explanation:
                    </span>
                    <div className="mt-1 rounded-xl bg-white border border-rose-200/80 p-3 text-xs text-slate-800 leading-relaxed shadow-2xs">
                      <p className="italic">
                        "{selectedSession.disputedExplanation || "No additional explanation was provided by the parent."}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TUTOR RESPONSE TO DISPUTE SECTION */}
              {(selectedSession.sessionStatus === "DISPUTED" || selectedSession.disputedReason) && (
                <div className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <MessageSquare size={15} />
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Tutor Clarification / Response
                      </h4>
                    </div>

                    {selectedSession.tutorDisputeResponse && !isEditingResponse && (
                      <button
                        type="button"
                        onClick={() => {
                          setResponseInput(selectedSession.tutorDisputeResponse);
                          setIsEditingResponse(true);
                          setResponseSuccess("");
                          setResponseError("");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                      >
                        <Edit3 size={13} />
                        <span>Edit Clarification</span>
                      </button>
                    )}
                  </div>

                  {/* Feedback alerts */}
                  {responseSuccess && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                      <span>{responseSuccess}</span>
                    </div>
                  )}

                  {responseError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800">
                      <AlertCircle size={15} className="shrink-0 text-rose-600" />
                      <span>{responseError}</span>
                    </div>
                  )}

                  {/* If response already exists and not currently editing */}
                  {selectedSession.tutorDisputeResponse && !isEditingResponse ? (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-800 leading-relaxed">
                        <p className="font-normal">{selectedSession.tutorDisputeResponse}</p>
                      </div>
                      {selectedSession.tutorDisputeResponseAt && (
                        <p className="text-[10px] text-slate-400">
                          Submitted on {formatSessionDate(selectedSession.tutorDisputeResponseAt)}{" "}
                          {formatTime12h(selectedSession.tutorDisputeResponseAt) ? `at ${formatTime12h(selectedSession.tutorDisputeResponseAt)}` : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Composing / Editing Response Form */
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Provide your explanation or clarification regarding the parent&apos;s dispute. Your message will be logged for resolution.
                      </p>
                      <textarea
                        rows={3}
                        value={responseInput}
                        onChange={(e) => setResponseInput(e.target.value)}
                        placeholder="Write your explanation (e.g. class was held online via video call, or rescheduled by mutual agreement, etc.)..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          {responseInput.length} characters
                        </span>
                        <div className="flex items-center gap-2">
                          {selectedSession.tutorDisputeResponse && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingResponse(false);
                                setResponseInput(selectedSession.tutorDisputeResponse);
                                setResponseError("");
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={submittingResponse || !responseInput.trim()}
                            onClick={() => handleSubmitDisputeResponse(selectedSession.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submittingResponse ? (
                              <>
                                <RefreshCw size={12} className="animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <>
                                <Send size={12} />
                                <span>Submit Clarification</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Student & Parent Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/80 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <GraduationCap size={15} className="text-indigo-600" />
                    <span>Student</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {selectedSession.studentName}
                  </p>
                  {selectedSession.studentRecord?.grade && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Grade: {selectedSession.studentRecord.grade}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200/80 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <User size={15} className="text-blue-600" />
                    <span>Parent</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {selectedSession.parentName}
                  </p>
                  {selectedSession.parentRecord?.email && (
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {selectedSession.parentRecord.email}
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

                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">
                      {selectedSession.matchingCompleted || selectedSession.sessionStatus === "APPROVED"
                        ? "Verified Duration:"
                        : selectedSession.correctedDurationMinutes
                        ? "Parent Corrected Duration:"
                        : "Effective Duration:"}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatDurationHuman(selectedSession.calculatedDuration)}
                    </span>
                  </div>

                  {(selectedSession.correctedDurationMinutes ||
                    (selectedSession.recordedDuration &&
                      selectedSession.calculatedDuration !== selectedSession.recordedDuration)) && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Original Logged Duration:</span>
                      <span className="line-through">
                        {formatDurationHuman(selectedSession.recordedDuration)}
                      </span>
                    </div>
                  )}

                  {selectedSession.durationCorrectionReason && (
                    <div className="text-amber-800 pt-1">
                      <span className="font-semibold">Adjustment Reason:</span> {selectedSession.durationCorrectionReason}
                    </div>
                  )}

                  {selectedSession.durationCorrectionNotes && (
                    <div className="text-amber-700 italic">
                      <span className="not-italic font-semibold">Parent Notes:</span> &ldquo;{selectedSession.durationCorrectionNotes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Tuition Amount & Finalized Earnings Info */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-900">
                    Finalized Tuition Amount
                  </span>
                  <span className="text-lg font-bold text-indigo-700">
                    {selectedSession.finalizedAmount != null
                      ? formatCurrency(selectedSession.finalizedAmount)
                      : "—"}
                  </span>
                </div>

                {selectedSession.matchingCompleted ? (
                  <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                    Tuition finalized and verified via parent approval on{" "}
                    {formatSessionDate(selectedSession.matchingCompleted.approvedAt)}.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tuition earnings are finalized upon parent verification and approval.
                  </p>
                )}

                {selectedSession.hourlyRate != null && (
                  <div className="text-xs text-indigo-800 font-medium">
                    Agreed Rate: {formatCurrency(selectedSession.hourlyRate)}/hr
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-indigo-100/80">
                  <Info size={13} className="shrink-0 text-indigo-600" />
                  <span>
                    Payment gateway is not yet integrated. Amounts reflect approved earnings, not received payouts.
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

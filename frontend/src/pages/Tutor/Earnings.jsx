import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wallet,
  Calendar,
  CheckCircle2,
  Users,
  RefreshCw,
  AlertCircle,
  Info,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import {
  getCompletedTuitionsAPI,
  getStudentDetailsAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
} from "../../API/api.js";
import {
  parseTimestamp,
  formatSessionDate as formatDateInKolkata,
} from "../../utils/dateTimeUtils.js";

/**
 * Format a number as Indian Rupees (e.g. ₹1,250.00).
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
 * Format verified duration into human readable string (e.g. 1 hr 30 min).
 */
function formatDuration(hoursVal, actualStart, actualEnd) {
  if (hoursVal != null && !isNaN(hoursVal) && Number(hoursVal) > 0) {
    const totalMinutes = Math.round(Number(hoursVal) * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
  }
  if (actualStart && actualEnd) {
    const s = parseTimestamp(actualStart);
    const e = parseTimestamp(actualEnd);
    if (s && e && e > s) {
      const totalMinutes = Math.round((e - s) / 60000);
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hrs === 0) return `${mins} min`;
      if (mins === 0) return `${hrs} hr`;
      return `${hrs} hr ${mins} min`;
    }
  }
  return "--";
}

/**
 * Check if a date falls in the current calendar month in Asia/Kolkata.
 */
function isDateInCurrentMonthKolkata(dateVal) {
  if (!dateVal) return false;
  const ms = parseTimestamp(dateVal);
  const d = ms ? new Date(ms) : new Date(dateVal);
  if (isNaN(d.getTime())) {
    if (typeof dateVal === "string" && /^\d{4}-\d{2}/.test(dateVal)) {
      const nowYM = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
      }).format(new Date());
      return dateVal.startsWith(nowYM);
    }
    return false;
  }
  const sessionYM = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(d);
  const nowYM = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return sessionYM === nowYM;
}

/**
 * Check if a date corresponds to today in Asia/Kolkata.
 */
function isDateTodayKolkata(dateVal) {
  if (!dateVal) return false;
  const ms = parseTimestamp(dateVal);
  const d = ms ? new Date(ms) : new Date(dateVal);
  if (isNaN(d.getTime())) {
    if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      const nowYMD = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(new Date());
      return dateVal.startsWith(nowYMD);
    }
    return false;
  }
  const sessionYMD = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(d);
  const nowYMD = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  return sessionYMD === nowYMD;
}

export default function Earnings() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [endpointNotice, setEndpointNotice] = useState("");

  // Filters & View State
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "this-month" | "today"
  const [selectedStudentId, setSelectedStudentId] = useState("all"); // "all" | childId
  const [viewMode, setViewMode] = useState("records"); // "records" | "students"
  const [expandedStudents, setExpandedStudents] = useState({});

  const toggleStudentExpanded = (studentId) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setEndpointNotice("");

      const response = await getCompletedTuitionsAPI();
      console.log("Hey response", response);
      const responseText = await response.text();
      let result = {};

      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
          console.log("Hey result", result)
        } catch (e) {
          console.error("Failed to parse completed tuitions JSON:", e);
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          setEndpointNotice(
            "The backend endpoint GET /api/tutor/completed-tuitions is not yet implemented on the server. Please implement this endpoint to retrieve finalized completed tuition records."
          );
          setRecords([]);
          return;
        }
        throw new Error(result.message || "Failed to load completed tuitions");
      }
      console.log("dsta", result.data);
      const rawRecords = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      // 1. Resolve student details for unique childIds
      const uniqueChildIds = [
        ...new Set(rawRecords.map((r) => r.childId).filter(Boolean)),
      ];
      console.log("Hey rawRecords", rawRecords);
      console.log("Hey uniqueChildIds", uniqueChildIds);
      const studentsMap = new Map();

      await Promise.all(
        uniqueChildIds.map(async (childId) => {
          try {
            const sRes = await getStudentDetailsAPI(childId);
            console.log("Hey sres", sRes)
            if (sRes.ok) {
              const sData = await sRes.json();
              console.log("Hey sres", sData)
              let studentObj = sData.data ?? sData;

              // Resolve subjects if present
              if (
                studentObj &&
                Array.isArray(studentObj.subjectIds) &&
                studentObj.subjectIds.length > 0
              ) {
                try {
                  const subRes = await getSubjectsByIdsAPI(studentObj.subjectIds);
                  if (subRes.ok) {
                    const subData = await subRes.json();
                    if (Array.isArray(subData)) {
                      studentObj = {
                        ...studentObj,
                        subjects: subData.map((s) => s.name ?? s.subjectName),
                      };
                    }
                  }
                } catch (e) {
                  console.log("Catch block", e)
                  // ignore
                }
              }

              // Resolve board if present
              if (studentObj && studentObj.board) {
                try {
                  const bRes = await getBoardByIdAPI(studentObj.board);
                  if (bRes.ok) {
                    const bData = await bRes.json();
                    studentObj = {
                      ...studentObj,
                      board: bData.name ?? bData.boardName ?? studentObj.board,
                    };
                  }
                } catch {
                  // ignore
                }
              }

              studentsMap.set(childId, studentObj);
            }
          } catch (err) {
            console.error("Error fetching student details for childId:", childId, err);
          }
        })
      );

      // 2. Enrich records
      const enriched = rawRecords.map((item) => {
        const student = studentsMap.get(item.childId) || null;
        const studentName = student?.name || "Student";
        const earnedAmount = Number(item.earnedAmount) || 0;
        const hourlyRate = Number(item.hourlyRate) || 0;
        const verifiedDurationHours =
          item.verifiedDurationHours != null
            ? Number(item.verifiedDurationHours)
            : null;

        const effectiveDate = item.sessionDate || item.actualStart || item.approvedAt;

        return {
          ...item,
          id: item.id || item._id,
          student,
          studentName,
          earnedAmount,
          hourlyRate,
          verifiedDurationHours,
          effectiveDate,
        };
      });

      // Sort by effective date descending (most recent first)
      enriched.sort((a, b) => {
        const dateA = a.effectiveDate || "";
        const dateB = b.effectiveDate || "";
        return String(dateB).localeCompare(String(dateA));
      });

      setRecords(enriched);
    } catch (err) {
      console.error("Error fetching completed tuitions:", err);
      setError(err.message || "Failed to load completed tuitions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  // Overall Unfiltered Metrics
  const totalEarnedAllTime = useMemo(() => {
    return records.reduce((sum, r) => sum + (r.earnedAmount || 0), 0);
  }, [records]);

  const thisMonthEarnedAllTime = useMemo(() => {
    return records
      .filter((r) => isDateInCurrentMonthKolkata(r.effectiveDate))
      .reduce((sum, r) => sum + (r.earnedAmount || 0), 0);
  }, [records]);

  const totalApprovedSessionsCount = records.length;

  // Filtered Records based on user selection
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Date filter
      if (dateFilter === "this-month" && !isDateInCurrentMonthKolkata(r.effectiveDate)) {
        return false;
      }
      if (dateFilter === "today" && !isDateTodayKolkata(r.effectiveDate)) {
        return false;
      }
      // Student filter
      if (selectedStudentId !== "all" && r.childId !== selectedStudentId) {
        return false;
      }
      return true;
    });
  }, [records, dateFilter, selectedStudentId]);

  // Filtered Metrics (consistent with the active filter selection)
  const filteredTotalEarned = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.earnedAmount || 0), 0);
  }, [filteredRecords]);

  const filteredApprovedCount = filteredRecords.length;

  // Unique students in records for dropdown
  const availableStudents = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      if (r.childId && !map.has(r.childId)) {
        map.set(r.childId, r.studentName || "Student");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  // Grouped by Student
  const studentGroups = useMemo(() => {
    const map = new Map();
    filteredRecords.forEach((r) => {
      const key = r.childId || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          childId: key,
          studentName: r.studentName,
          student: r.student,
          totalEarned: 0,
          totalHours: 0,
          sessionCount: 0,
          sessions: [],
        });
      }
      const group = map.get(key);
      group.totalEarned += r.earnedAmount || 0;
      group.totalHours += r.verifiedDurationHours || 0;
      group.sessionCount += 1;
      group.sessions.push(r);
    });
    return Array.from(map.values()).sort((a, b) => b.totalEarned - a.totalEarned);
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tutor Earnings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your verified tuition earnings, finalized session hours, and per-student compensation.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchEarnings}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition self-start sm:self-auto disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Backend Endpoint Notice Banner (when 404) */}
      {endpointNotice && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900 shadow-xs">
          <Info size={19} className="mt-0.5 shrink-0 text-blue-600" />
          <div className="flex-1">
            <p className="font-semibold text-blue-950">Backend Integration Contract</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              {endpointNotice}
            </p>
            <div className="mt-2.5 rounded-xl border border-blue-200/80 bg-white/80 p-3 font-mono text-[11px] text-blue-900 space-y-1">
              <p><strong>Route:</strong> GET /api/tutor/completed-tuitions</p>
              <p><strong>Headers:</strong> Authorization: Bearer &lt;JWT&gt;</p>
              <p><strong>Expected Response:</strong> &#123; &quot;message&quot;: &quot;Completed tuition records fetched successfully&quot;, &quot;data&quot;: [ ...completedTuitions ] &#125;</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner with Retry */}
      {!loading && error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchEarnings}
            className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Earned Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Earned
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/70">
              <Wallet size={20} strokeWidth={2} />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {formatINR(totalEarnedAllTime)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles size={13} className="text-indigo-500" />
            <span>All-time finalized tuition earnings</span>
          </div>
        </div>

        {/* This Month Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              This Month
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/70">
              <Calendar size={20} strokeWidth={2} />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {formatINR(thisMonthEarnedAllTime)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Approved in current calendar month</span>
          </div>
        </div>

        {/* Approved Sessions Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Approved Sessions
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/70">
              <CheckCircle2 size={20} strokeWidth={2} />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {totalApprovedSessionsCount}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Finalized &amp; verified by parents</span>
          </div>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Date Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Date:
            </span>
            <button
              type="button"
              onClick={() => setDateFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${dateFilter === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("this-month")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${dateFilter === "this-month"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("today")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${dateFilter === "today"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
            >
              Today
            </button>
          </div>

          {/* Right: Student Selector & View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Student Dropdown */}
            {availableStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Student:
                </span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="all">All Students ({availableStudents.length})</option>
                  {availableStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode("records")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${viewMode === "records"
                  ? "bg-white text-blue-600 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Detailed Records ({filteredRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("students")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${viewMode === "students"
                  ? "bg-white text-blue-600 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                By Student ({studentGroups.length})
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Filter Summary Indicator */}
        {(dateFilter !== "all" || selectedStudentId !== "all") && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing:{" "}
              <strong className="text-slate-900">
                {dateFilter === "this-month"
                  ? "This Month"
                  : dateFilter === "today"
                    ? "Today"
                    : "All Time"}
              </strong>
              {selectedStudentId !== "all" && (
                <>
                  {" "}
                  for{" "}
                  <strong className="text-slate-900">
                    {availableStudents.find((s) => s.id === selectedStudentId)?.name ||
                      "Selected Student"}
                  </strong>
                </>
              )}
            </span>
            <span>
              Filtered Earnings:{" "}
              <strong className="font-mono text-slate-900">
                {formatINR(filteredTotalEarned)}
              </strong>{" "}
              ({filteredApprovedCount} {filteredApprovedCount === 1 ? "session" : "sessions"})
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              Loading completed tuition earnings...
            </p>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
            <Wallet size={26} strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {records.length === 0
              ? "No finalized earnings yet"
              : "No records match the selected filter"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {records.length === 0
              ? "Once tuition sessions are verified and approved by parents, your verified earnings will appear here."
              : "Try changing your date or student filter to view other completed sessions."}
          </p>
          {records.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDateFilter("all");
                setSelectedStudentId("all");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === "records" ? (
        /* DETAILED RECORDS VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((record) => {
              const isToday = isDateTodayKolkata(record.effectiveDate);

              return (
                <article
                  key={record.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">
                          {record.studentName}
                        </h3>
                        {record.student?.grade && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {record.student.grade}
                            {record.student.board ? ` · ${record.student.board}` : ""}
                          </span>
                        )}
                        {isToday && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          Session Date: {formatDateInKolkata(record.effectiveDate)}
                        </span>
                        {record.hourlyRate > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                            Rate: ₹{record.hourlyRate}/hr
                          </span>
                        )}
                      </div>

                      {record.student?.subjects && record.student.subjects.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <BookOpen size={13} className="text-slate-400" />
                          {record.student.subjects.map((sub, i) => (
                            <span
                              key={i}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs self-start sm:self-auto">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Approved
                      </span>
                      <p className="text-lg font-bold text-slate-900 font-mono">
                        {formatINR(record.earnedAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Duration & Details Row */}
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      <span>
                        Verified Duration:{" "}
                        <strong className="font-mono text-slate-900">
                          {formatDuration(
                            record.verifiedDurationHours,
                            record.actualStart,
                            record.actualEnd
                          )}
                        </strong>
                      </span>
                    </div>

                    {record.approvedAt && (
                      <span className="text-[11px] text-slate-400">
                        Approved on {formatDateInKolkata(record.approvedAt)}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        /* BY STUDENT VIEW */
        <div className="grid grid-cols-1 gap-4">
          {studentGroups.map((group) => {
            const isExpanded = expandedStudents[group.childId];

            return (
              <div
                key={group.childId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/70">
                      <GraduationCap size={20} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {group.studentName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {group.sessionCount} {group.sessionCount === 1 ? "Session" : "Sessions"} ·{" "}
                        {formatDuration(group.totalHours)} total
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                        Total Earned
                      </span>
                      <span className="text-lg font-bold text-slate-900 font-mono">
                        {formatINR(group.totalEarned)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStudentExpanded(group.childId)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition"
                      aria-label="Toggle sessions"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Session List */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Completed Sessions ({group.sessions.length})
                    </p>
                    <div className="space-y-2">
                      {group.sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-slate-700">
                              {formatDateInKolkata(session.effectiveDate)}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600">
                              {formatDuration(
                                session.verifiedDurationHours,
                                session.actualStart,
                                session.actualEnd
                              )}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 font-mono">
                            {formatINR(session.earnedAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

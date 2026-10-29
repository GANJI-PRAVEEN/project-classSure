import { useState, useEffect } from "react";
import {
  X,
  UserRound,
  GraduationCap,
  BookOpen,
  Clock,
  Calendar,
  MapPin,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Compass,
  CreditCard,
  Building2,
} from "lucide-react";
import {
  formatScheduledTimeRange,
  formatScheduledTime,
  formatSessionDate,
  formatDurationHuman,
  formatCurrency,
} from "../../utils/dateTimeUtils.js";
import {
  calculateSessionEarnings,
  getParentDetailsAPI,
} from "../../API/api.js";

const DAYS_OF_WEEK = [
  { full: "MONDAY", short: "Mon" },
  { full: "TUESDAY", short: "Tue" },
  { full: "WEDNESDAY", short: "Wed" },
  { full: "THURSDAY", short: "Thu" },
  { full: "FRIDAY", short: "Fri" },
  { full: "SATURDAY", short: "Sat" },
  { full: "SUNDAY", short: "Sun" },
];

/**
 * Calculates duration in minutes from schedule times.
 */
function getScheduleDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const parse = (t) => {
    if (typeof t === "string") {
      const clean = t.includes("T") ? t.split("T")[1] : t;
      const parts = clean.split(":");
      if (parts.length >= 2) {
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
    }
    if (Array.isArray(t)) {
      if (t.length >= 5) return t[3] * 60 + t[4];
      if (t.length >= 2) return t[0] * 60 + t[1];
    }
    return null;
  };
  const startMins = parse(startTime);
  const endMins = parse(endTime);
  if (startMins != null && endMins != null && endMins > startMins) {
    return endMins - startMins;
  }
  return null;
}

export default function StudentDetailModal({ student, isOpen, onClose }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [parentDetails, setParentDetails] = useState(student?.parent || null);
  const [loadingParent, setLoadingParent] = useState(false);

  // Sync / fetch parent details if needed
  useEffect(() => {
    if (!isOpen || !student) return;

    if (student.parent) {
      setParentDetails(student.parent);
      return;
    }

    if (student.parentId) {
      setLoadingParent(true);
      getParentDetailsAPI(student.parentId)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setParentDetails(data.data ?? data);
          }
        })
        .catch((err) => {
          console.warn("Failed to load parent details for student:", err);
        })
        .finally(() => {
          setLoadingParent(false);
        });
    }
  }, [isOpen, student]);

  // Handle Escape key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const schedule = student.schedule || {};
  const parent = parentDetails || student.parent;

  // Normalized status
  const rawStatus = schedule?.status || student?.status || "UNKNOWN";
  const normalizedStatus = String(rawStatus).toUpperCase();
  const isAccepted =
    normalizedStatus === "ACCEPTED" ||
    normalizedStatus === "ACTIVE" ||
    normalizedStatus === "APPROVED";
  const isPending = normalizedStatus === "PENDING";
  const isRejected = normalizedStatus === "REJECTED";

  const statusLabel = isAccepted
    ? normalizedStatus === "ACTIVE"
      ? "Active Tuition"
      : "Accepted"
    : isPending
    ? "Pending Confirmation"
    : isRejected
    ? "Rejected"
    : rawStatus;

  // Schedule Days
  const scheduledDays = Array.isArray(schedule?.daysOfWeek)
    ? schedule.daysOfWeek.map((d) => String(d).toUpperCase())
    : [];

  // Duration & Pricing
  const durationMinutes = getScheduleDurationMinutes(
    schedule?.startTime,
    schedule?.endTime
  );
  const hourlyRate = schedule?.hourlyRate ?? student?.hourlyRate ?? null;
  const estimatedPerClassFee =
    hourlyRate && durationMinutes
      ? calculateSessionEarnings(hourlyRate, durationMinutes)
      : null;

  // Time Range display
  const formattedTimeRange =
    schedule?.startTime && schedule?.endTime
      ? formatScheduledTimeRange(schedule.startTime, schedule.endTime)
      : null;

  // Subject list
  const subjectList = Array.isArray(student.subjects)
    ? student.subjects
    : typeof student.subjects === "string" && student.subjects.trim() !== ""
    ? [student.subjects]
    : [];

  // Location / Google Maps URL
  const parentLoc = parent?.parentLocation;
  const hasCoordinates =
    parentLoc?.latitude != null && parentLoc?.longitude != null;
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${parentLoc.latitude},${parentLoc.longitude}`
    : null;

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="student-modal-title"
    >
      <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] transition-all">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white shrink-0">
          {/* Subtle background decoration */}
          <div className="pointer-events-none absolute -right-6 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 rounded-full bg-blue-400/20 blur-xl" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur-md border border-white/25 shadow-inner">
                {student.name?.charAt(0)?.toUpperCase() || "S"}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="student-modal-title"
                    className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate"
                  >
                    {student.name || "Student Details"}
                  </h2>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-blue-100">
                  <span className="font-medium">
                    {student.grade || "Grade not specified"}
                  </span>
                  {student.board && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold backdrop-blur-xs">
                        <Building2 size={11} />
                        {student.board}
                      </span>
                    </>
                  )}
                  {student.educationCategory && (
                    <>
                      <span>•</span>
                      <span className="text-blue-200">
                        {student.educationCategory}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs ${
                  isAccepted
                    ? "bg-emerald-500/20 text-emerald-100 border border-emerald-400/40"
                    : isPending
                    ? "bg-amber-500/20 text-amber-100 border border-amber-400/40"
                    : isRejected
                    ? "bg-rose-500/20 text-rose-100 border border-rose-400/40"
                    : "bg-white/20 text-white border border-white/30"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isAccepted
                      ? "bg-emerald-400 animate-pulse"
                      : isPending
                      ? "bg-amber-400"
                      : isRejected
                      ? "bg-rose-400"
                      : "bg-slate-300"
                  }`}
                />
                {statusLabel}
              </span>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Hourly Rate
              </p>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-white">
                {hourlyRate != null && hourlyRate > 0
                  ? `₹${hourlyRate}/hr`
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Subjects
              </p>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-white">
                {subjectList.length > 0
                  ? `${subjectList.length} Assigned`
                  : "None"}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Weekly Days
              </p>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-white">
                {scheduledDays.length > 0
                  ? `${scheduledDays.length} Days/Wk`
                  : "None"}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Class Duration
              </p>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-white">
                {durationMinutes
                  ? `${durationMinutes} mins`
                  : formattedTimeRange || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-800">
          {/* Section 1: Academic Profile */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <GraduationCap size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Academic Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Grade / Standard</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {student.grade || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Educational Board</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {student.board || "Not specified"}
                </p>
              </div>

              {student.educationCategory && (
                <div>
                  <p className="text-slate-400 font-medium">Education Stream</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {student.educationCategory}
                  </p>
                </div>
              )}

              {student.createdAt && (
                <div>
                  <p className="text-slate-400 font-medium">Enrolled Since</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatSessionDate(student.createdAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Subjects Tag List */}
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Enrolled Subjects
              </p>
              <div className="flex flex-wrap gap-2">
                {subjectList.length > 0 ? (
                  subjectList.map((subj, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/70 bg-gradient-to-r from-blue-50 to-indigo-50/50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-2xs"
                    >
                      <BookOpen size={13} className="text-blue-500" />
                      {subj}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-slate-400">
                    No subjects assigned yet.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Tuition Schedule & Timing */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Clock size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Tuition Schedule & Timing
              </h3>
            </div>

            {/* Weekly Days Strip */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Scheduled Days of the Week
              </p>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                {DAYS_OF_WEEK.map((day) => {
                  const isActive = scheduledDays.includes(day.full);
                  return (
                    <div
                      key={day.full}
                      className={`rounded-xl py-2 px-1 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-200"
                          : "bg-slate-50 text-slate-400 border border-slate-100"
                      }`}
                    >
                      <span>{day.short}</span>
                      <div className="mt-0.5 flex justify-center">
                        {isActive ? (
                          <CheckCircle2 size={11} className="text-white" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-slate-200 inline-block" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
              <div>
                <p className="text-slate-400 font-medium">Session Hours</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {formattedTimeRange || "Schedule timing not assigned"}
                </p>
                {durationMinutes && (
                  <p className="mt-0.5 text-xs text-indigo-600 font-medium">
                    Duration: {formatDurationHuman(durationMinutes)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-slate-400 font-medium">Compensation & Fee</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {hourlyRate != null && hourlyRate > 0
                    ? `₹${hourlyRate}/hour`
                    : "Rate not set"}
                </p>
                {estimatedPerClassFee != null && (
                  <p className="mt-0.5 text-xs text-emerald-700 font-medium">
                    Est. Per Session: ₹{estimatedPerClassFee.toFixed(2)}
                  </p>
                )}
              </div>

              {schedule?.effectiveFrom && (
                <div>
                  <p className="text-slate-400 font-medium">Effective Period</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">
                    From {formatSessionDate(schedule.effectiveFrom)}
                    {schedule.effectiveTo
                      ? ` to ${formatSessionDate(schedule.effectiveTo)}`
                      : " (Ongoing)"}
                  </p>
                </div>
              )}

              <div>
                <p className="text-slate-400 font-medium">Tuition Status</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {statusLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Parent & Contact Details */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <UserRound size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Parent & Location Details
              </h3>
            </div>

            {loadingParent ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                <span>Loading parent information...</span>
              </div>
            ) : parent ? (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 font-medium">Parent Name</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {parent.fullName || parent.name || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-medium">Parent Email</p>
                    {parent.email ? (
                      <div className="mt-0.5 flex items-center gap-2">
                        <a
                          href={`mailto:${parent.email}`}
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 truncate"
                        >
                          {parent.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(parent.email)}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                          title="Copy email"
                        >
                          {copiedEmail ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-sm font-semibold text-slate-500">
                        Email not available
                      </p>
                    )}
                  </div>
                </div>

                {/* Residential Address & Google Maps link */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin
                        size={17}
                        className="mt-0.5 text-rose-500 shrink-0"
                      />
                      <div>
                        <p className="text-slate-400 font-medium">
                          Tuition Residence / Address
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">
                          {parentLoc?.address ||
                            "Physical address not provided by parent"}
                          {parentLoc?.pincode ? ` — ${parentLoc.pincode}` : ""}
                        </p>
                      </div>
                    </div>

                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                      >
                        <Compass size={14} />
                        <span>Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs italic text-slate-400 py-2">
                Parent details not yet linked to this student profile.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 p-4 sm:px-6 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Student ID: <span className="font-mono text-slate-700">{student.id || student._id}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {parent?.email && (
              <a
                href={`mailto:${parent.email}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Mail size={14} className="text-slate-500" />
                <span>Email Parent</span>
              </a>
            )}

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              >
                <MapPin size={14} className="text-indigo-600" />
                <span>Location</span>
                <ExternalLink size={12} />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

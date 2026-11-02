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
  Sparkles,
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
    ? "Pending"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="student-modal-title"
    >
      <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] sm:max-h-[92vh] transition-all">
        {/* Header - Optimized for Mobile & Desktop */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-4 sm:p-6 text-white shrink-0">
          {/* Subtle background decoration */}
          <div className="pointer-events-none absolute -right-6 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 right-24 h-28 w-28 rounded-full bg-blue-400/20 blur-xl" />

          {/* Top Bar: Close Button & Status Pill */}
          <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs ${
                isAccepted
                  ? "bg-emerald-500/25 text-emerald-100 border border-emerald-400/40"
                  : isPending
                  ? "bg-amber-500/25 text-amber-100 border border-amber-400/40"
                  : isRejected
                  ? "bg-rose-500/25 text-rose-100 border border-rose-400/40"
                  : "bg-white/20 text-white border border-white/30"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isAccepted
                    ? "bg-emerald-300 animate-pulse"
                    : isPending
                    ? "bg-amber-300"
                    : isRejected
                    ? "bg-rose-300"
                    : "bg-slate-300"
                }`}
              />
              <span>{statusLabel}</span>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors active:scale-95"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Student Header Information */}
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl sm:text-2xl font-black backdrop-blur-md border border-white/25 shadow-inner">
              {student.name?.charAt(0)?.toUpperCase() || "S"}
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="student-modal-title"
                className="text-lg sm:text-2xl font-extrabold tracking-tight text-white truncate leading-tight"
              >
                {student.name || "Student Details"}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-blue-100">
                <span className="font-semibold bg-white/15 px-2 py-0.5 rounded-md backdrop-blur-xs">
                  {student.grade || "Grade N/A"}
                </span>
                {student.board && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 font-semibold backdrop-blur-xs">
                    <Building2 size={11} />
                    {student.board}
                  </span>
                )}
                {student.educationCategory && (
                  <span className="hidden sm:inline-block text-blue-200">
                    • {student.educationCategory}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip (2x2 on Mobile, 4 in row on Desktop) */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-10">
            <div className="rounded-xl bg-white/10 p-2 sm:p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Hourly Rate
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-white truncate">
                {hourlyRate != null && hourlyRate > 0 ? `₹${hourlyRate}/hr` : "—"}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-2 sm:p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Class Duration
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-white truncate">
                {durationMinutes ? `${durationMinutes} mins` : formattedTimeRange || "—"}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-2 sm:p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Weekly Load
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-white truncate">
                {scheduledDays.length > 0 ? `${scheduledDays.length} Days/Wk` : "None"}
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-2 sm:p-2.5 backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Subjects
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-white truncate">
                {subjectList.length > 0 ? `${subjectList.length} Assigned` : "None"}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body - Clean Mobile Typography & Cards */}
        <div className="overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 text-slate-800">
          {/* Section 1: Academic Profile */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <GraduationCap size={16} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                Academic Information
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium text-[11px]">Grade / Class</p>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                  {student.grade || "Not specified"}
                </p>
              </div>

              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium text-[11px]">Board</p>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                  {student.board || "Not specified"}
                </p>
              </div>

              {student.educationCategory && (
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                  <p className="text-slate-400 font-medium text-[11px]">Education Stream</p>
                  <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                    {student.educationCategory}
                  </p>
                </div>
              )}

              {student.createdAt && (
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                  <p className="text-slate-400 font-medium text-[11px]">Enrolled Since</p>
                  <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                    {formatSessionDate(student.createdAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Subjects Tag List */}
            <div className="mt-3.5 pt-3 border-t border-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Enrolled Subjects
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {subjectList.length > 0 ? (
                  subjectList.map((subj, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-2xs"
                    >
                      <BookOpen size={12} className="text-blue-500 shrink-0" />
                      <span>{subj}</span>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Clock size={16} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                Tuition Schedule & Timing
              </h3>
            </div>

            {/* Scheduled Days of Week - Mobile Responsive Wrap */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Scheduled Days
              </p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS_OF_WEEK.map((day) => {
                  const isActive = scheduledDays.includes(day.full);
                  return (
                    <div
                      key={day.full}
                      className={`rounded-lg py-1.5 px-0.5 text-[11px] font-bold transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100/70 text-slate-400"
                      }`}
                    >
                      <span>{day.short}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-3 border-t border-slate-100">
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium text-[11px]">Class Timing</p>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                  {formattedTimeRange || "Schedule timing not assigned"}
                </p>
                {durationMinutes && (
                  <p className="mt-0.5 text-[11px] text-indigo-600 font-semibold">
                    Duration: {formatDurationHuman(durationMinutes)}
                  </p>
                )}
              </div>

              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium text-[11px]">Tuition Fee</p>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                  {hourlyRate != null && hourlyRate > 0 ? `₹${hourlyRate}/hour` : "Rate not set"}
                </p>
                {estimatedPerClassFee != null && (
                  <p className="mt-0.5 text-[11px] text-emerald-700 font-semibold">
                    Est. Per Class: ₹{estimatedPerClassFee.toFixed(2)}
                  </p>
                )}
              </div>

              {schedule?.effectiveFrom && (
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 col-span-1 sm:col-span-2">
                  <p className="text-slate-400 font-medium text-[11px]">Effective Schedule Period</p>
                  <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800">
                    From {formatSessionDate(schedule.effectiveFrom)}
                    {schedule.effectiveTo
                      ? ` to ${formatSessionDate(schedule.effectiveTo)}`
                      : " (Ongoing)"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Parent & Contact Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <UserRound size={16} />
              </div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                Parent & Location Details
              </h3>
            </div>

            {loadingParent ? (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                <span>Loading parent contact details...</span>
              </div>
            ) : parent ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-medium text-[11px]">Parent Name</p>
                    <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                      {parent.fullName || parent.name || "Not specified"}
                    </p>
                  </div>

                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-medium text-[11px]">Email Address</p>
                    {parent.email ? (
                      <div className="mt-0.5 flex items-center justify-between gap-1.5">
                        <a
                          href={`mailto:${parent.email}`}
                          className="text-xs sm:text-sm font-bold text-indigo-600 hover:underline truncate"
                        >
                          {parent.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(parent.email)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition shrink-0"
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
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        Email not provided
                      </p>
                    )}
                  </div>
                </div>

                {/* Residential Address & Google Maps link */}
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin size={16} className="mt-0.5 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-400 font-medium text-[11px]">Tuition Residence</p>
                        <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-800 break-words leading-relaxed">
                          {parentLoc?.address || "Physical address not specified by parent"}
                          {parentLoc?.pincode ? ` — ${parentLoc.pincode}` : ""}
                        </p>
                      </div>
                    </div>

                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                      >
                        <Compass size={13} />
                        <span>Maps</span>
                        <ExternalLink size={11} />
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

        {/* Footer Actions - Stack on Mobile, Flex on Desktop */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/90 p-3 sm:px-6 shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block truncate">
            ID: <span className="font-mono text-slate-600">{student.id || student._id}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {parent?.email && (
              <a
                href={`mailto:${parent.email}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Mail size={14} className="text-slate-500" />
                <span>Email</span>
              </a>
            )}

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              >
                <MapPin size={14} className="text-indigo-600" />
                <span>Maps</span>
                <ExternalLink size={12} />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  CalendarClock,
  Clock,
  AlertCircle,
  X,
  Info,
  Calendar,
  User,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import {
  formatScheduledTime,
  formatScheduledTimeRange,
  formatSessionDate,
  extractSessionDateStr,
  getTodayKolkataDateStr,
} from "../../utils/dateTimeUtils.js";
import { rescheduleSessionAPI } from "../../API/api.js";

/**
 * RescheduleModal Component
 *
 * Allows a tutor to reschedule a tuition session for one specific day only.
 * The recurring schedule arrangement is completely untouched.
 *
 * Requirements:
 * - Displays student name, original session date, original start/end times.
 * - Allows picking new start time and new end time (required, start < end).
 * - Original session date is fixed and cannot be changed.
 * - Optional reason for rescheduling.
 * - Enforces UPCOMING status eligibility.
 * - Submits payload to the backend session endpoint.
 * - Displays validation and API error messages without fake mock success.
 */
export default function RescheduleModal({
  session,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive original session information
  const studentName =
    session?.student?.name ||
    session?.studentName ||
    session?.childName ||
    "Student";

  const gradeAndBoard = [
    session?.student?.grade,
    session?.student?.board,
  ]
    .filter(Boolean)
    .join(" · ");

  const subjectsDisplay = Array.isArray(session?.subjects)
    ? session.subjects.join(", ")
    : typeof session?.subjects === "string"
    ? session.subjects
    : "";

  const rawSessionDate =
    session?.sessionDate || session?.scheduleStart || session?.date;

  const sessionDateStr =
    extractSessionDateStr(rawSessionDate) || getTodayKolkataDateStr();

  const formattedDate = formatSessionDate(rawSessionDate);

  const originalStartFormatted = formatScheduledTime(session?.scheduleStart);
  const originalEndFormatted = formatScheduledTime(session?.scheduleEnd);
  const originalTimeRange = formatScheduledTimeRange(
    session?.scheduleStart,
    session?.scheduleEnd
  );

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Form submission handler
  async function handleSubmit(e) {
    e.preventDefault();
    setValidationError("");
    setApiError("");

    // 1. Session status eligibility check
    const currentStatus = session?.sessionStatus || "UPCOMING";
    if (currentStatus !== "UPCOMING") {
      setValidationError(
        `This session is no longer eligible for rescheduling (Current status: ${currentStatus}). Only UPCOMING sessions can be rescheduled.`
      );
      return;
    }

    // 2. Required fields validation
    if (!newStartTime || !newStartTime.trim()) {
      setValidationError("Please select a new start time.");
      return;
    }
    if (!newEndTime || !newEndTime.trim()) {
      setValidationError("Please select a new end time.");
      return;
    }

    // 3. Time comparison (new start time must be before new end time)
    const [startH, startM] = newStartTime.split(":").map(Number);
    const [endH, endM] = newEndTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (isNaN(startMinutes) || isNaN(endMinutes)) {
      setValidationError("Invalid time format entered.");
      return;
    }

    if (startMinutes >= endMinutes) {
      setValidationError(
        "New start time must be before new end time."
      );
      return;
    }

    // 4. Construct one-day reschedule payload
    // Respects Asia/Kolkata local schedule times (no UTC offset shifting)
    const newScheduleStart = `${sessionDateStr}T${newStartTime}:00`;
    const newScheduleEnd = `${sessionDateStr}T${newEndTime}:00`;

    const payload = {
      sessionId: session.id,
      sessionDate: sessionDateStr,
      newStartTime,
      newEndTime,
      startTime: `${newStartTime}:00`,
      endTime: `${newEndTime}:00`,
      scheduleStart: newScheduleStart,
      scheduleEnd: newScheduleEnd,
      reason: reason.trim() || undefined,
    };

    setIsSubmitting(true);

    try {
      const response = await rescheduleSessionAPI(session.id, payload);

      let responseData = null;
      try {
        const text = await response.text();
        if (text && text.trim()) {
          responseData = JSON.parse(text);
        }
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        let errorMsg =
          responseData?.message ||
          responseData?.error ||
          (response.status === 404
            ? `Backend endpoint POST /api/tutor/sessions/${session.id}/reschedule returned 404 (Not Found). Backend implementation is pending.`
            : `Server returned ${response.status}: ${response.statusText}`);
        setApiError(errorMsg);
        return;
      }

      // Backend confirmed success
      if (onSuccess) {
        onSuccess(responseData?.data || responseData || payload);
      }
      onClose();
    } catch (err) {
      setApiError(
        err.message ||
          "Network request failed while connecting to the server. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  // Compute live preview of newly picked times
  const previewStart = newStartTime ? formatScheduledTime(newStartTime) : "";
  const previewEnd = newEndTime ? formatScheduledTime(newEndTime) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-2xs">
              <CalendarClock size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Reschedule Session
              </h3>
              <p className="text-xs text-slate-500">
                Change tuition time for one specific day only
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Session Details Card (Read-only / Fixed) */}
        <div className="my-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User size={16} className="text-indigo-600" />
              <span className="text-sm font-semibold text-slate-900">
                {studentName}
              </span>
            </div>
            {gradeAndBoard && (
              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/60 shadow-2xs">
                {gradeAndBoard}
              </span>
            )}
          </div>

          {subjectsDisplay && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <BookOpen size={14} className="text-slate-400" />
              <span>{subjectsDisplay}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">
                Session Date (Fixed)
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Calendar size={14} className="text-slate-500" />
                <span>{formattedDate}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5 font-medium">
                Original Scheduled Time
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Clock size={14} className="text-slate-500" />
                <span>
                  {originalTimeRange ||
                    `${originalStartFormatted} – ${originalEndFormatted}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* One-day Notice Banner */}
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-sky-200/80 bg-sky-50/80 p-3 text-xs text-sky-800">
          <Info size={16} className="shrink-0 text-sky-600 mt-0.5" />
          <p className="leading-relaxed">
            This change applies <span className="font-semibold">only</span> to this single day's session ({formattedDate}). The recurring weekly schedule remains unchanged.
          </p>
        </div>

        {/* Reschedule Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* New Start Time */}
            <div>
              <label
                htmlFor="newStartTime"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                New Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                id="newStartTime"
                type="time"
                required
                disabled={isSubmitting}
                value={newStartTime}
                onChange={(e) => {
                  setNewStartTime(e.target.value);
                  setValidationError("");
                  setApiError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-2xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
              {previewStart && (
                <p className="mt-1 text-[11px] text-indigo-600 font-medium">
                  {previewStart}
                </p>
              )}
            </div>

            {/* New End Time */}
            <div>
              <label
                htmlFor="newEndTime"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                New End Time <span className="text-rose-500">*</span>
              </label>
              <input
                id="newEndTime"
                type="time"
                required
                disabled={isSubmitting}
                value={newEndTime}
                onChange={(e) => {
                  setNewEndTime(e.target.value);
                  setValidationError("");
                  setApiError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-2xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
              {previewEnd && (
                <p className="mt-1 text-[11px] text-indigo-600 font-medium">
                  {previewEnd}
                </p>
              )}
            </div>
          </div>

          {/* Time Preview comparison when both selected */}
          {previewStart && previewEnd && (
            <div className="flex items-center justify-between rounded-lg bg-indigo-50/60 px-3 py-2 border border-indigo-100 text-xs">
              <span className="text-slate-500 font-medium">New Slot Preview:</span>
              <span className="font-semibold text-indigo-700 flex items-center gap-1.5">
                {previewStart} <ArrowRight size={12} /> {previewEnd}
              </span>
            </div>
          )}

          {/* Optional Reason */}
          <div>
            <label
              htmlFor="rescheduleReason"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Reason for Rescheduling{" "}
              <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="rescheduleReason"
              rows={2}
              disabled={isSubmitting}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rescheduled by mutual agreement with student..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-2xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            />
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* API Error Banner */}
          {apiError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Reschedule Request Failed</p>
                <p className="leading-relaxed">{apiError}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <CalendarClock size={16} />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

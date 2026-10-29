
import { useState, useEffect } from "react";
import {
  Clock3,
  MapPin,
  UserRound,
  BookOpen,
  Play,
  Square,
  CalendarClock,
  ExternalLink,
  Timer,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { parseTimestamp, formatScheduledTimeRange } from "../../utils/dateTimeUtils.js";

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

function TuitionCard({
  session,
  schedule,
  student,
  parent,
  subjects,
  isStarting = false,
  isEnding = false,
  onStartTimer,
  onEndSession,
  onReschedule,
}) {
  const sessionData = session || schedule || {};
  const status = sessionData?.sessionStatus || "UPCOMING";
  const isProgress = status === "IN_PROGRESS";
  const isUpcoming = status === "UPCOMING";
  const isAwaitingVerification = status === "AWAITING_VERIFICATION";
  const isApproved = status === "APPROVED";
  const isDisputed = status === "DISPUTED";

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Only run interval when session is actively in progress
    if (!isProgress) return;

    setNow(Date.now());

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isProgress, sessionData?.actualStart]);

  const startMs = parseTimestamp(sessionData?.actualStart);
  const endMs = parseTimestamp(sessionData?.actualEnd);

  // Original duration logged by tutor (from actual timestamps or durationMinutes)
  let recordedElapsedMs = 0;
  if (startMs && endMs) {
    recordedElapsedMs = Math.max(0, endMs - startMs);
  } else if (sessionData?.durationMinutes != null && sessionData.durationMinutes > 0) {
    recordedElapsedMs = Number(sessionData.durationMinutes) * 60 * 1000;
  }

  // Duration verified by CompletedTuitions record (if approved by parent)
  const verifiedDurationMinutes =
    sessionData?.matchingCompleted?.verifiedDurationHours != null &&
    Number(sessionData.matchingCompleted.verifiedDurationHours) > 0
      ? Math.round(Number(sessionData.matchingCompleted.verifiedDurationHours) * 60)
      : sessionData?.verifiedDurationHours != null &&
        Number(sessionData.verifiedDurationHours) > 0
      ? Math.round(Number(sessionData.verifiedDurationHours) * 60)
      : null;

  // Duration corrected by parent
  const correctedDurationMinutes =
    sessionData?.correctedDurationMinutes != null &&
    Number(sessionData.correctedDurationMinutes) > 0
      ? Number(sessionData.correctedDurationMinutes)
      : null;

  // Has the parent submitted a duration correction or was verified differently
  const hasParentCorrection =
    !isProgress &&
    (correctedDurationMinutes != null ||
      (verifiedDurationMinutes != null &&
        recordedElapsedMs > 0 &&
        Math.abs(verifiedDurationMinutes * 60 * 1000 - recordedElapsedMs) >= 60000));

  // Determine effective duration following precedence:
  // 1. Verified duration from CompletedTuitions
  // 2. Corrected duration from Parent
  // 3. Tutor recorded duration
  let effectiveMinutes = null;
  if (!isProgress) {
    if (verifiedDurationMinutes != null) {
      effectiveMinutes = verifiedDurationMinutes;
    } else if (correctedDurationMinutes != null) {
      effectiveMinutes = correctedDurationMinutes;
    } else if (recordedElapsedMs > 0) {
      effectiveMinutes = Math.round(recordedElapsedMs / 60000);
    } else if (sessionData?.durationMinutes != null && sessionData.durationMinutes > 0) {
      effectiveMinutes = Number(sessionData.durationMinutes);
    }
  }

  // When in progress, calculate live from now - startMs.
  // When ended, use effective duration (or recorded elapsed)
  let elapsedMs = 0;
  if (isProgress) {
    elapsedMs = startMs ? Math.max(0, now - startMs) : 0;
  } else if (effectiveMinutes != null) {
    elapsedMs = effectiveMinutes * 60 * 1000;
  } else if (recordedElapsedMs > 0) {
    elapsedMs = recordedElapsedMs;
  }

  const formattedTimer = formatElapsedTime(elapsedMs);
  const formattedRecorded = formatElapsedTime(recordedElapsedMs);

  const mapUrl =
    parent?.parentLocation?.latitude != null &&
    parent?.parentLocation?.longitude != null
      ? `https://www.google.com/maps?q=${parent.parentLocation.latitude},${parent.parentLocation.longitude}`
      : null;

  const subjectList =
    Array.isArray(subjects) && subjects.length > 0
      ? subjects
      : Array.isArray(student?.subjects) && student.subjects.length > 0
      ? student.subjects
      : [];

  const subjectsDisplay =
    subjectList.length > 0
      ? subjectList.join(", ")
      : typeof subjects === "string" && subjects.trim() !== ""
      ? subjects
      : typeof student?.subjects === "string" && student.subjects.trim() !== ""
      ? student.subjects
      : "No subjects assigned";

  return (
    <article
      className={`rounded-2xl border p-5 transition-all shadow-xs ${
        isProgress
          ? "border-emerald-200 bg-white ring-1 ring-emerald-100"
          : isAwaitingVerification
          ? "border-amber-200/80 bg-white"
          : "border-slate-200 bg-white hover:border-indigo-200"
      }`}
    >
      {/* Student name and status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {student?.name || "Student"}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {student?.grade || "Grade not available"}
            {student?.board ? ` · ${student.board}` : ""}
          </p>
        </div>

        {isProgress ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        ) : isUpcoming ? (
          <span className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Upcoming
          </span>
        ) : isAwaitingVerification ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {hasParentCorrection ? "Correction Pending Approval" : "Awaiting Verification"}
          </span>
        ) : isApproved ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-xs">
            <CheckCircle2 size={13} className="text-emerald-600" />
            {hasParentCorrection ? "Approved (Adjusted)" : "Approved"}
          </span>
        ) : isDisputed ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 shadow-xs">
            <AlertCircle size={13} className="text-rose-600" />
            Disputed
          </span>
        ) : status === "MISSED" ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
            Missed
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {status}
          </span>
        )}
      </div>

      <div className="my-4 border-t border-slate-100" />

      {/* Prominent Live Elapsed Timer for Active Sessions */}
      {isProgress && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Timer size={20} className="animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                  Elapsed Time
                </p>
                <p className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                  {formattedTimer}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-emerald-700 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live
            </div>
          </div>
        </div>
      )}

      {/* Recorded / Corrected Duration Summary for Ended / Awaiting Verification / Approved / Disputed Sessions */}
      {!isProgress && (startMs || recordedElapsedMs > 0 || hasParentCorrection || isAwaitingVerification || isApproved || isDisputed) && (
        <div
          className={`mb-4 rounded-xl border p-4 transition-all ${
            hasParentCorrection
              ? "border-amber-300 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/70 shadow-xs"
              : isApproved
              ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 to-teal-50/30"
              : "border-amber-200/70 bg-gradient-to-r from-amber-50/60 to-yellow-50/30"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs ${
                  hasParentCorrection
                    ? "bg-amber-600"
                    : isApproved
                    ? "bg-emerald-600"
                    : "bg-amber-600"
                }`}
              >
                <Clock3 size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  {hasParentCorrection
                    ? isApproved
                      ? "Final Verified Duration"
                      : "Parent Corrected Duration"
                    : isApproved
                    ? "Verified Duration"
                    : "Total Session Time"}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                    {formattedTimer}
                  </p>
                  {effectiveMinutes != null && (
                    <span className="text-xs font-medium text-slate-500">
                      ({effectiveMinutes} min{effectiveMinutes !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-2xs ${
                hasParentCorrection
                  ? "border-amber-300 bg-amber-100 text-amber-900"
                  : isApproved
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-white/90 text-amber-800"
              }`}
            >
              {hasParentCorrection
                ? isApproved
                  ? "Approved (Adjusted)"
                  : "Parent Adjusted"
                : isApproved
                ? "Verified"
                : "Submitted"}
            </span>
          </div>

          {/* Breakdown when duration has been adjusted by parent */}
          {hasParentCorrection && (
            <div className="mt-3 pt-2.5 border-t border-amber-200/80 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="text-slate-500">Original recorded:</span>
                <span className="font-mono font-medium line-through text-slate-400">
                  {formattedRecorded} ({Math.round(recordedElapsedMs / 60000)} mins)
                </span>
                <span className="text-amber-600 font-bold">→</span>
                <span className="font-semibold text-amber-950 font-mono">
                  Corrected: {formattedTimer} ({effectiveMinutes} mins)
                </span>
              </div>

              {sessionData.durationCorrectionReason && (
                <div className="flex items-start gap-1.5 text-amber-900">
                  <span className="font-semibold shrink-0">Adjustment Reason:</span>
                  <span>{sessionData.durationCorrectionReason}</span>
                </div>
              )}

              {sessionData.durationCorrectionNotes && (
                <div className="flex items-start gap-1.5 text-amber-800 italic">
                  <span className="not-italic font-semibold shrink-0">Parent Notes:</span>
                  <span>&ldquo;{sessionData.durationCorrectionNotes}&rdquo;</span>
                </div>
              )}

              {sessionData.matchingCompleted?.earnedAmount != null && (
                <div className="pt-1 text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    Final Earned Amount: ₹{Number(sessionData.matchingCompleted.earnedAmount).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* If approved without parent correction, but earnedAmount is available */}
          {!hasParentCorrection && isApproved && sessionData.matchingCompleted?.earnedAmount != null && (
            <div className="mt-2.5 pt-2 border-t border-emerald-200/70 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>
                Final Earned Amount: ₹{Number(sessionData.matchingCompleted.earnedAmount).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tuition details */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <BookOpen size={18} className="mt-0.5 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Subjects</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {subjectsDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserRound size={18} className="mt-0.5 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Parent name</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {parent?.fullName || "Not available"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock3 size={18} className="mt-0.5 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Session time</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatScheduledTimeRange(
                sessionData.startTime || sessionData.scheduleStart,
                sessionData.endTime || sessionData.scheduleEnd
              )}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin size={18} className="mt-0.5 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Location</p>

            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Open in Google Maps
                <ExternalLink size={14} />
              </a>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Location unavailable
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
        {isUpcoming && (
          <>
            <button
              type="button"
              disabled={isStarting}
              onClick={() => onStartTimer(sessionData)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {isStarting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Starting Timer...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Start Timer</span>
                </>
              )}
            </button>

            {onReschedule && (
              <button
                type="button"
                onClick={() => onReschedule(sessionData)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
              >
                <CalendarClock size={16} className="text-slate-500" />
                <span>Reschedule</span>
              </button>
            )}
          </>
        )}

        {isProgress && (
          <button
            type="button"
            disabled={isEnding}
            onClick={() => onEndSession(sessionData)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 hover:border-rose-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
          >
            {isEnding ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                <span>Ending Session...</span>
              </>
            ) : (
              <>
                <Square size={14} className="fill-rose-600 text-rose-600" />
                <span>End Session</span>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

export default TuitionCard;

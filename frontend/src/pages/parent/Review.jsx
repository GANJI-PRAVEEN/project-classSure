import { useState, useEffect, useMemo } from "react";
import {
    ClipboardCheck,
    CheckCircle2,
    Clock,
    AlertTriangle,
    AlertCircle,
    RefreshCw,
    User,
    GraduationCap,
    Calendar,
    BookOpen,
    ArrowRight,
    Info,
    Check,
    X,
    History,
    SlidersHorizontal,
} from "lucide-react";
import {
    getPendingReviewSessionsAPI,
    getReviewHistoryAPI,
    getParentHistoryAPI,
    approveSessionAPI,
    correctSessionDurationAPI,
    disputeSessionAPI,
    getAllChildrensAPI,
    getSubjectsByIdsAPI,
    getTutorByIdAPI,
    getBoardByIdAPI,
    calculateSessionEarnings,
} from "../../API/api.js";

import {
    parseTimestamp,
    formatTime12h as formatTimeInKolkata,
    formatSessionDate as formatDateInKolkata,
    calculateDurationMinutes,
    formatDurationHuman,
} from "../../utils/dateTimeUtils.js";

/**
 * Check if a date string or timestamp corresponds to today in Asia/Kolkata timezone.
 */
function isSessionToday(val) {
    if (!val) return false;
    const ms = parseTimestamp(val);
    const dateObj = ms ? new Date(ms) : new Date(val);
    if (!isNaN(dateObj.getTime())) {
        const dStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(dateObj);
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        return dStr === todayStr;
    }
    if (typeof val === "string") {
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        return val.startsWith(todayStr);
    }
    return false;
}

const STORAGE_KEY = "classsure_parent_review_history";

function getCachedHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveCachedHistory(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        // ignore
    }
}

export default function Review() {
    const [activeTab, setActiveTab] = useState("pending"); // "pending" | "history"
    const [pendingSessions, setPendingSessions] = useState([]);
    const [historySessions, setHistorySessions] = useState(() => getCachedHistory());
    const [historyFilter, setHistoryFilter] = useState("all"); // "all" | "today"
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [noticeMessage, setNoticeMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Action Modals State
    const [approvingSession, setApprovingSession] = useState(null);
    const [correctingSession, setCorrectingSession] = useState(null);
    const [disputingSession, setDisputingSession] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Correction Form State
    const [correctedHours, setCorrectedHours] = useState(1);
    const [correctedMinutes, setCorrectedMinutes] = useState(0);
    const [correctionReason, setCorrectionReason] = useState("Tutor arrived late");
    const [correctionNotes, setCorrectionNotes] = useState("");
    const [correctionError, setCorrectionError] = useState("");

    // Dispute Form State
    const [disputeReason, setDisputeReason] = useState("Tutor was absent / Class did not occur");
    const [disputeExplanation, setDisputeExplanation] = useState("");
    const [disputeError, setDisputeError] = useState("");

    // Enrich helper
    function enrichSessionList(rawList, childrenMap, tutorsMap, subjectsMap, completedTuitionsMap = new Map()) {
        return rawList.map((session) => {
            const sessionId = String(session.id || session._id || "");
            const student = childrenMap.get(session.childId) || null;
            const tutor = tutorsMap.get(session.tutorId) || null;

            const subjectNames = student?.subjectIds
                ? student.subjectIds.map((id) => subjectsMap.get(id) || id)
                : [];

            const scheduledMinutes = calculateDurationMinutes(
                session.scheduleStart,
                session.scheduleEnd
            );

            const matchingCompleted = completedTuitionsMap.get(sessionId) || null;

            // Duration resolution precedence:
            // 1. matchingCompleted.verifiedDurationHours (finalized backend duration)
            // 2. session.correctedDurationMinutes (parent proposed / saved correction)
            // 3. session.durationMinutes || calculateDurationMinutes(actualStart, actualEnd)
            let effectiveMinutes = null;
            if (matchingCompleted?.verifiedDurationHours) {
                effectiveMinutes = Math.round(matchingCompleted.verifiedDurationHours * 60);
            } else if (session.correctedDurationMinutes != null && session.correctedDurationMinutes > 0) {
                effectiveMinutes = Number(session.correctedDurationMinutes);
            } else if (session.actualStart && session.actualEnd) {
                effectiveMinutes = calculateDurationMinutes(session.actualStart, session.actualEnd);
            } else if (session.durationMinutes != null && session.durationMinutes > 0) {
                effectiveMinutes = Number(session.durationMinutes);
            }

            const recordedMinutes = session.durationMinutes != null && session.durationMinutes > 0
                ? session.durationMinutes
                : calculateDurationMinutes(session.actualStart, session.actualEnd);

            const hourlyRate = session.hourlyRate ?? matchingCompleted?.hourlyRate ?? 0;

            // Finalized amount directly from backend CompletedTuitions (source of truth)
            let finalizedAmount = null;
            if (matchingCompleted && matchingCompleted.earnedAmount != null) {
                finalizedAmount = Number(matchingCompleted.earnedAmount);
            }

            // Payable amount for display: use backend finalizedAmount if available; otherwise estimated fee preview
            const payableAmount = finalizedAmount != null
                ? finalizedAmount
                : calculateSessionEarnings(hourlyRate, effectiveMinutes || recordedMinutes || 0);

            return {
                ...session,
                id: sessionId,
                student,
                tutor,
                subjects: subjectNames,
                scheduledMinutes,
                recordedMinutes,
                effectiveMinutes: effectiveMinutes || recordedMinutes || 0,
                hourlyRate,
                matchingCompleted,
                finalizedAmount,
                payableAmount,
            };
        });
    }

    // Fetch and enrich pending review sessions and review history
    async function fetchSessions() {
        try {
            setLoading(true);
            setError("");
            setNoticeMessage("");

            // 1. Fetch pending sessions, history sessions, & completed tuitions in parallel
            let rawPending = [];
            let rawHistory = [];
            let rawCompleted = [];

            try {
                const pRes = await getPendingReviewSessionsAPI();
                if (pRes && pRes.ok) {
                    const pTxt = await pRes.text();
                    if (pTxt && pTxt.trim()) {
                        const pData = JSON.parse(pTxt);
                        rawPending = Array.isArray(pData.data)
                            ? pData.data
                            : Array.isArray(pData)
                                ? pData
                                : [];
                    }
                } else if (pRes && pRes.status === 404) {
                    setNoticeMessage(
                        "The backend review endpoint (GET /review/pending-sessions) is not yet implemented on the server."
                    );
                }
            } catch (err) {
                console.error("Error loading pending sessions:", err);
            }

            try {
                const hRes = await getReviewHistoryAPI();
                if (hRes && hRes.ok) {
                    const hTxt = await hRes.text();
                    if (hTxt && hTxt.trim()) {
                        const hData = JSON.parse(hTxt);
                        rawHistory = Array.isArray(hData.data)
                            ? hData.data
                            : Array.isArray(hData)
                                ? hData
                                : [];
                    }
                }
            } catch (err) {
                console.error("Error loading history sessions:", err);
            }

            try {
                const phRes = await getParentHistoryAPI();
                if (phRes && phRes.ok) {
                    const phData = await phRes.json();
                    if (Array.isArray(phData.completedTuitions)) {
                        rawCompleted = phData.completedTuitions;
                    }
                }
            } catch (err) {
                console.error("Error loading completed tuitions:", err);
            }

            // Index completed tuitions by sessionId
            const completedTuitionsMap = new Map();
            rawCompleted.forEach((ct) => {
                if (ct.sessionId) {
                    completedTuitionsMap.set(String(ct.sessionId), ct);
                }
            });

            // Merge rawHistory with cached history (to retain sessions approved in current browser session)
            const cached = getCachedHistory();
            const historyMap = new Map();
            cached.forEach((item) => {
                const id = item.id || item._id;
                if (id) historyMap.set(id, item);
            });
            rawHistory.forEach((item) => {
                const id = item.id || item._id;
                if (id) historyMap.set(id, item);
            });
            const mergedHistoryRaw = Array.from(historyMap.values());

            // 2. Fetch parent's children to map student names & grades
            const childrenMap = new Map();
            try {
                const cRes = await getAllChildrensAPI();
                if (cRes.ok) {
                    const cData = await cRes.json();
                    if (Array.isArray(cData)) {
                        cData.forEach((c) => childrenMap.set(c.id, c));
                    }
                }
            } catch (err) {
                console.error("Error fetching children list:", err);
            }

            // 3. Resolve subjects
            const allSubjectIds = [
                ...new Set(
                    Array.from(childrenMap.values())
                        .flatMap((c) => c.subjectIds || [])
                        .filter(Boolean)
                ),
            ];
            const subjectsMap = new Map();
            if (allSubjectIds.length > 0) {
                try {
                    const subRes = await getSubjectsByIdsAPI(allSubjectIds);
                    if (subRes.ok) {
                        const subData = await subRes.json();
                        if (Array.isArray(subData)) {
                            subData.forEach((s) => subjectsMap.set(s.id, s.name || s.subjectName));
                        }
                    }
                } catch (err) {
                    console.error("Error resolving subjects:", err);
                }
            }

            // 4. Resolve tutors for all sessions
            const tutorsMap = new Map();
            const allSessionsCombined = [...rawPending, ...mergedHistoryRaw];
            const uniqueTutorIds = [
                ...new Set(allSessionsCombined.map((s) => s.tutorId).filter(Boolean)),
            ];
            await Promise.all(
                uniqueTutorIds.map(async (tutorId) => {
                    try {
                        const tRes = await getTutorByIdAPI(tutorId);
                        if (tRes && tRes.ok) {
                            const tData = await tRes.json();
                            tutorsMap.set(tutorId, tData);
                        }
                    } catch (err) {
                        console.error("Error resolving tutor:", err);
                    }
                })
            );

            // 5. Enrich both pending and history sessions
            const enrichedPending = enrichSessionList(rawPending, childrenMap, tutorsMap, subjectsMap, completedTuitionsMap);
            const enrichedHistory = enrichSessionList(mergedHistoryRaw, childrenMap, tutorsMap, subjectsMap, completedTuitionsMap);

            // Sort by session date descending
            const sortByDate = (a, b) => {
                const dateA = a.sessionDate || a.scheduleStart || "";
                const dateB = b.sessionDate || b.scheduleStart || "";
                return String(dateB).localeCompare(String(dateA));
            };
            enrichedPending.sort(sortByDate);
            enrichedHistory.sort(sortByDate);

            setPendingSessions(enrichedPending);
            setHistorySessions(enrichedHistory);
            saveCachedHistory(enrichedHistory);
        } catch (err) {
            console.error("Error in fetchSessions:", err);
            setError(err.message || "Failed to load review sessions. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSessions();
    }, []);

    // Filter today's approved history
    const todayApprovedHistory = useMemo(() => {
        return historySessions.filter(
            (s) =>
                s.sessionStatus === "APPROVED" &&
                (isSessionToday(s.sessionDate) ||
                    isSessionToday(s.actualEnd) ||
                    isSessionToday(s.approvedAt))
        );
    }, [historySessions]);

    // History to display based on active sub-filter
    const displayedHistory = useMemo(() => {
        if (historyFilter === "today") {
            return todayApprovedHistory;
        }
        return historySessions;
    }, [historyFilter, todayApprovedHistory, historySessions]);

    // Handler: Approve Session
    async function handleConfirmApprove() {
        if (!approvingSession || actionLoading) return;
        try {
            setActionLoading(true);
            setError("");

            const response = await approveSessionAPI(approvingSession.id);
            if (response.status === 401) {
                throw new Error("Authentication session has expired. Please log in again.");
            }

            const responseText = await response.text();
            let result = {};
            if (responseText && responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    // ignore
                }
            }

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(
                        "Backend endpoint POST /api/parent/review/sessions/:sessionId/approve is not yet implemented on the server."
                    );
                }
                throw new Error(result.message || "Failed to approve session");
            }

            const studentName = approvingSession.student?.name || "Student";
            setApprovingSession(null);

            setSuccessMessage(
                `Session for ${studentName} was approved successfully and recorded in Review History.`
            );

            // Refresh sessions and completed tuitions from backend (source of truth)
            await fetchSessions();
        } catch (err) {
            console.error("Error approving session:", err);
            setError(err.message || "Failed to approve session");
        } finally {
            setActionLoading(false);
        }
    }

    // Handler: Open Correct Duration Modal
    function handleOpenCorrect(session) {
        const totalMinutes = session.correctedDurationMinutes || session.effectiveMinutes || session.recordedMinutes || 60;
        setCorrectedHours(Math.floor(totalMinutes / 60));
        setCorrectedMinutes(totalMinutes % 60);
        setCorrectionReason(session.durationCorrectionReason || "Tutor arrived late");
        setCorrectionNotes(session.durationCorrectionNotes || "");
        setCorrectionError("");
        setCorrectingSession(session);
    }

    // Handler: Submit Correct Duration
    async function handleSubmitCorrection() {
        if (!correctingSession || actionLoading) return;
        const totalCorrectedMinutes = Number(correctedHours) * 60 + Number(correctedMinutes);

        if (totalCorrectedMinutes <= 0 || isNaN(totalCorrectedMinutes)) {
            setCorrectionError("Corrected duration must be greater than 0 minutes.");
            return;
        }

        if (!correctionReason.trim()) {
            setCorrectionError("Please select a reason for the duration correction.");
            return;
        }

        try {
            setActionLoading(true);
            setCorrectionError("");
            setError("");

            const payload = {
                correctedMinutes: totalCorrectedMinutes,
                reason: correctionReason,
                notes: correctionNotes.trim(),
            };

            const response = await correctSessionDurationAPI(correctingSession.id, payload);
            if (response.status === 401) {
                throw new Error("Authentication session has expired. Please log in again.");
            }

            const responseText = await response.text();
            let result = {};
            if (responseText && responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    // ignore
                }
            }

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(
                        "Backend endpoint POST /api/parent/review/sessions/:sessionId/correct-duration is not yet implemented on the server."
                    );
                }
                throw new Error(result.message || "Failed to submit duration correction");
            }

            // Close correction modal
            setCorrectingSession(null);

            setSuccessMessage(
                `Corrected duration of ${formatDurationHuman(
                    totalCorrectedMinutes
                )} submitted successfully.`
            );

            // Refresh sessions from backend (source of truth)
            await fetchSessions();
        } catch (err) {
            console.error("Error submitting correction:", err);
            setCorrectionError(err.message || "Failed to submit duration correction");
        } finally {
            setActionLoading(false);
        }
    }

    // Handler: Open Dispute Modal
    function handleOpenDispute(session) {
        setDisputeReason("Tutor was absent / Class did not occur");
        setDisputeExplanation("");
        setDisputeError("");
        setDisputingSession(session);
    }

    // Handler: Submit Dispute
    async function
        handleSubmitDispute() {
        if (!disputingSession) return;

        if (!disputeReason.trim()) {
            setDisputeError("Please select a reason for disputing this session.");
            return;
        }

        if (!disputeExplanation.trim() || disputeExplanation.trim().length < 5) {
            setDisputeError("Please provide an explanation (at least 5 characters).");
            return;
        }

        try {
            setActionLoading(true);
            setDisputeError("");

            const payload = {
                reason: disputeReason,
                explanation: disputeExplanation.trim(),
            };

            const response = await disputeSessionAPI(disputingSession.id, payload);
            const responseText = await response.text();
            let result = {};
            if (responseText && responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    // ignore
                }
            }

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(
                        "Backend endpoint POST /review/sessions/:sessionId/dispute is not yet implemented on the server."
                    );
                }
                throw new Error(result.message || "Failed to submit dispute");
            }

            const disputedSession = {
                ...disputingSession,
                sessionStatus: "DISPUTED",
                disputedAt: new Date().toISOString(),
                disputeReason,
                disputeExplanation: disputeExplanation.trim(),
            };

            // Remove from pending and move to history
            setPendingSessions((prev) => prev.filter((s) => s.id !== disputingSession.id));
            setHistorySessions((prev) => [
                disputedSession,
                ...prev.filter((s) => s.id !== disputingSession.id),
            ]);

            // Save to local cache
            const updatedCache = [
                disputedSession,
                ...getCachedHistory().filter((s) => s.id !== disputingSession.id),
            ];
            saveCachedHistory(updatedCache);

            setSuccessMessage(
                `Session dispute submitted. The session has been moved to Review History as Disputed.`
            );

            setDisputingSession(null);
        } catch (err) {
            console.error("Error submitting dispute:", err);
            setError(err.message || "Failed to submit dispute");
            setDisputingSession(null);
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Session Review & Verification
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Verify completed tuition sessions and confirm whether the tutor&apos;s recorded duration is accurate.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => setActiveTab("pending")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === "pending"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                >
                    <ClipboardCheck size={18} />
                    <span>Pending Verification</span>
                    {pendingSessions.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            {pendingSessions.length}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === "history"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                >
                    <History size={18} />
                    <span>Review History</span>
                    {historySessions.length > 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {historySessions.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Alert Banners */}
            {successMessage && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                        <span>{successMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSuccessMessage("")}
                        className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 transition"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {error && (
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle size={18} className="shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="rounded-lg p-1 text-rose-700 hover:bg-rose-100 transition"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {noticeMessage && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900 shadow-xs">
                    <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
                    <div className="flex-1">
                        <p className="font-semibold">Backend Endpoint Notice</p>
                        <p className="mt-0.5 text-xs text-blue-700 leading-relaxed">
                            {noticeMessage}
                        </p>
                        <p className="mt-2 text-[11px] text-blue-600 font-mono">
                            Expected route: GET /review/pending-sessions or /api/parent/review/pending-sessions
                        </p>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                        <p className="mt-3 text-sm font-medium text-slate-500">
                            Loading sessions for review...
                        </p>
                    </div>
                </div>
            ) : activeTab === "pending" ? (
                /* PENDING REVIEWS TAB */
                pendingSessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center shadow-xs">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                            <CheckCircle2 size={28} strokeWidth={1.8} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                            All caught up!
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                            You have no tuition sessions awaiting verification. New completed sessions will appear here as your tutors finish classes.
                        </p>
                        <button
                            type="button"
                            onClick={fetchSessions}
                            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                            <RefreshCw size={13} />
                            Check for Updates
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {pendingSessions.length} {pendingSessions.length === 1 ? "Session" : "Sessions"} Awaiting Your Verification
                            </p>
                            <button
                                type="button"
                                onClick={fetchSessions}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                            >
                                <RefreshCw size={12} />
                                Refresh
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                            {pendingSessions.map((session) => {
                                const diff = (session.effectiveMinutes || session.recordedMinutes || 0) - (session.scheduledMinutes || 0);

                                return (
                                    <article
                                        key={session.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition hover:border-slate-300"
                                    >
                                        {/* Header: Student, Tutor, Date, Status */}
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-bold text-slate-900">
                                                        {session.student?.name || "Student"}
                                                    </h3>
                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                        {session.student?.grade || "Grade not set"}
                                                        {session.student?.board ? ` · ${session.student.board}` : ""}
                                                    </span>
                                                    {session.correctedDurationMinutes != null && session.correctedDurationMinutes > 0 && (
                                                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                                                            Duration Correction Proposed
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                                        <User size={14} className="text-slate-400" />
                                                        Tutor: {session.tutor?.fullName || session.tutor?.name || "Assigned Tutor"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        Date: {formatDateInKolkata(session.sessionDate || session.scheduleStart)}
                                                    </span>
                                                    {session.hourlyRate > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                                                            Rate: ₹{session.hourlyRate}/hr
                                                        </span>
                                                    )}
                                                </div>

                                                {session.subjects && session.subjects.length > 0 && (
                                                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                                                        <BookOpen size={13} className="text-slate-400" />
                                                        {session.subjects.map((sub, i) => (
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

                                            <span className="self-start inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-2xs">
                                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                                Awaiting Verification
                                            </span>
                                        </div>

                                        <div className="my-5 border-t border-slate-100" />

                                        {/* Side-by-Side Comparison: Scheduled vs Actual vs Corrected */}
                                        <div className={`grid grid-cols-1 ${session.correctedDurationMinutes ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
                                            {/* Scheduled Box */}
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                    Scheduled Tuition
                                                </p>
                                                <div className="mt-2 flex items-baseline justify-between">
                                                    <p className="text-xl font-bold text-slate-800">
                                                        {formatDurationHuman(session.scheduledMinutes)}
                                                    </p>
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {formatTimeInKolkata(session.scheduleStart)} – {formatTimeInKolkata(session.scheduleEnd)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actual Recorded Box */}
                                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                                                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                                                    Tutor Recorded Duration
                                                </p>
                                                <div className="mt-2 flex items-baseline justify-between">
                                                    <p className={`text-xl font-bold font-mono ${session.correctedDurationMinutes ? "text-slate-400 line-through" : "text-indigo-950"}`}>
                                                        {formatDurationHuman(session.recordedMinutes)}
                                                    </p>
                                                    <span className="text-xs text-indigo-700 font-medium">
                                                        {formatTimeInKolkata(session.actualStart)} – {formatTimeInKolkata(session.actualEnd)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Corrected Duration Box (if correction submitted) */}
                                            {session.correctedDurationMinutes != null && session.correctedDurationMinutes > 0 && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                                                            Proposed Corrected Duration
                                                        </p>
                                                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                            Corrected
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex items-baseline justify-between">
                                                        <p className="text-xl font-bold text-amber-950 font-mono">
                                                            {formatDurationHuman(session.effectiveMinutes)}
                                                        </p>
                                                        <span className="text-xs text-amber-800 font-medium truncate max-w-[140px]" title={session.durationCorrectionReason}>
                                                            {session.durationCorrectionReason || "Adjusted"}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Duration Comparison Insight & Calculated Amount */}
                                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {diff === 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                                        <CheckCircle2 size={15} />
                                                        Duration matches scheduled time exactly
                                                    </span>
                                                ) : diff > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                                                        <Info size={15} />
                                                        +{formatDurationHuman(diff)} longer than scheduled class
                                                        {session.correctedDurationMinutes ? " (using corrected duration)" : ""}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                                        <AlertTriangle size={15} />
                                                        -{formatDurationHuman(Math.abs(diff))} shorter than scheduled class
                                                        {session.correctedDurationMinutes ? " (using corrected duration)" : ""}
                                                    </span>
                                                )}
                                            </div>

                                            {session.payableAmount > 0 && (
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-500">
                                                        {session.finalizedAmount != null ? "Verified Fee: " : "Estimated Fee: "}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-900">
                                                        ₹{session.payableAmount.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="mt-5 flex flex-col sm:flex-row items-center gap-2.5 border-t border-slate-100 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setApprovingSession(session)}
                                                className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                                            >
                                                <Check size={16} />
                                                <span>{session.correctedDurationMinutes ? "Approve Corrected Duration" : "Approve Session"}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenCorrect(session)}
                                                className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                                            >
                                                <SlidersHorizontal size={15} />
                                                <span>{session.correctedDurationMinutes ? "Edit Correction" : "Correct Duration"}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenDispute(session)}
                                                className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition"
                                            >
                                                <AlertTriangle size={15} />
                                                <span>Dispute Session</span>
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                )
            ) : (
                /* REVIEW HISTORY TAB */
                <div className="space-y-5">
                    {/* Filter bar: All History vs Today's Approved */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("all")}
                                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${historyFilter === "all"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                                    }`}
                            >
                                All History ({historySessions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setHistoryFilter("today")}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${historyFilter === "today"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-200/60"
                                    }`}
                            >
                                <CheckCircle2 size={13} />
                                Today&apos;s Approved ({todayApprovedHistory.length})
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={fetchSessions}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition self-start sm:self-auto"
                        >
                            <RefreshCw size={12} />
                            Refresh History
                        </button>
                    </div>

                    {displayedHistory.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center shadow-xs">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
                                <History size={26} strokeWidth={1.8} />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">
                                {historyFilter === "today"
                                    ? "No tuitions approved today yet"
                                    : "No review history yet"}
                            </h3>
                            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                                {historyFilter === "today"
                                    ? "Tuition sessions that you approve today will appear here in real time."
                                    : "Sessions that you approve or dispute will be logged here for permanent record-keeping."}
                            </p>
                            {historyFilter === "today" && historySessions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setHistoryFilter("all")}
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                                >
                                    View All History ({historySessions.length})
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {displayedHistory.map((session) => {
                                const diff = (session.recordedMinutes || 0) - (session.scheduledMinutes || 0);
                                const isToday = isSessionToday(session.sessionDate || session.scheduleStart || session.actualStart || session.approvedAt);

                                return (
                                    <article
                                        key={session.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
                                    >
                                        {/* Header: Student, Tutor, Date, Status */}
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-bold text-slate-900">
                                                        {session.student?.name || "Student"}
                                                    </h3>
                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                        {session.student?.grade || "Grade not set"}
                                                        {session.student?.board ? ` · ${session.student.board}` : ""}
                                                    </span>
                                                    {isToday && (
                                                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                                            Approved Today
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                                        <User size={14} className="text-slate-400" />
                                                        Tutor: {session.tutor?.fullName || session.tutor?.name || "Assigned Tutor"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        Date: {formatDateInKolkata(session.sessionDate || session.scheduleStart)}
                                                    </span>
                                                    {session.hourlyRate > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                                                            Rate: ₹{session.hourlyRate}/hr
                                                        </span>
                                                    )}
                                                </div>

                                                {session.subjects && session.subjects.length > 0 && (
                                                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                                        <BookOpen size={13} className="text-slate-400" />
                                                        {session.subjects.map((sub, i) => (
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

                                            {session.sessionStatus === "APPROVED" ? (
                                                <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs">
                                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                                    Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 shadow-2xs">
                                                    <AlertTriangle size={14} className="text-rose-600" />
                                                    Disputed
                                                </span>
                                            )}
                                        </div>

                                        {/* Duration Comparison side-by-side */}
                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Scheduled Session</span>
                                                <p className="mt-0.5 text-base font-bold text-slate-800 font-mono">
                                                    {formatDurationHuman(session.scheduledMinutes)}
                                                </p>
                                                <span className="text-xs text-slate-500">
                                                    {formatTimeInKolkata(session.scheduleStart)} – {formatTimeInKolkata(session.scheduleEnd)}
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
                                                        {session.matchingCompleted ? "Verified Duration" : "Recorded / Corrected Duration"}
                                                    </span>
                                                    {session.correctedDurationMinutes != null && session.correctedDurationMinutes > 0 && (
                                                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800">
                                                            Corrected
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 text-base font-bold text-emerald-950 font-mono">
                                                    {formatDurationHuman(session.effectiveMinutes || session.recordedMinutes)}
                                                </p>
                                                <span className="text-xs text-emerald-700 font-medium">
                                                    {formatTimeInKolkata(session.actualStart)} – {formatTimeInKolkata(session.actualEnd)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer: Fee breakdown & diff summary */}
                                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                                            <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                                                {diff === 0 ? (
                                                    <span className="text-emerald-700 font-medium">Matched scheduled duration exactly</span>
                                                ) : diff > 0 ? (
                                                    <span className="text-blue-700 font-medium">+{formatDurationHuman(diff)} longer than scheduled class</span>
                                                ) : (
                                                    <span className="text-amber-700 font-medium">-{formatDurationHuman(Math.abs(diff))} shorter than scheduled class</span>
                                                )}
                                                {session.durationCorrectionReason && (
                                                    <span className="text-amber-800 font-medium">· Correction: &quot;{session.durationCorrectionReason}&quot;</span>
                                                )}
                                                {session.durationCorrectionNotes && (
                                                    <span className="text-slate-400">({session.durationCorrectionNotes})</span>
                                                )}
                                                {session.disputeReason && (
                                                    <span className="text-rose-600 font-medium">· Dispute reason: {session.disputeReason}</span>
                                                )}
                                            </div>

                                            {session.finalizedAmount != null ? (
                                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                                    <span className="text-slate-500">Verified Earnings:</span>
                                                    <span className="text-sm font-bold text-emerald-700 font-mono">
                                                        ₹{session.finalizedAmount.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : session.payableAmount > 0 ? (
                                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                                    <span className="text-slate-500">Payable Fee:</span>
                                                    <span className="text-sm font-bold text-slate-900 font-mono">
                                                        ₹{session.payableAmount.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL 1: APPROVE SESSION CONFIRMATION */}
            {approvingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <Check size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Approve Tuition Session?
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Confirm duration and verify payable fee
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setApprovingSession(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 mb-4 text-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Student:</span>
                                <span className="font-semibold text-slate-800">{approvingSession.student?.name || "Student"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tutor:</span>
                                <span className="font-semibold text-slate-800">{approvingSession.tutor?.fullName || "Assigned Tutor"}</span>
                            </div>

                            {approvingSession.correctedDurationMinutes != null && approvingSession.correctedDurationMinutes > 0 ? (
                                <>
                                    <div className="flex justify-between items-center py-1 border-t border-slate-200">
                                        <span className="text-amber-800 font-semibold">Corrected Duration to Approve:</span>
                                        <span className="font-bold text-amber-900 font-mono text-sm">
                                            {formatDurationHuman(approvingSession.effectiveMinutes)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-500">
                                        <span>Tutor Recorded Duration:</span>
                                        <span className="line-through">{formatDurationHuman(approvingSession.recordedMinutes)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-500">
                                        <span>Correction Reason:</span>
                                        <span className="font-medium text-slate-700">{approvingSession.durationCorrectionReason || "Not specified"}</span>
                                    </div>
                                    {approvingSession.durationCorrectionNotes && (
                                        <div className="flex justify-between text-[11px] text-slate-500">
                                            <span>Notes:</span>
                                            <span className="font-medium text-slate-700 italic max-w-[200px] truncate">&quot;{approvingSession.durationCorrectionNotes}&quot;</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Recorded Duration:</span>
                                    <span className="font-bold text-emerald-700 font-mono">
                                        {formatDurationHuman(approvingSession.recordedMinutes)}
                                    </span>
                                </div>
                            )}

                            {approvingSession.payableAmount > 0 && (
                                <div className="flex justify-between pt-1 border-t border-slate-200">
                                    <span className="text-slate-500">
                                        {approvingSession.finalizedAmount != null ? "Verified Fee:" : "Estimated Payable Fee:"}
                                    </span>
                                    <span className="font-bold text-slate-900">₹{approvingSession.payableAmount.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed mb-6">
                            By approving this session, you confirm that the tuition class took place as verified. The server will calculate final verified duration and record earnings.
                        </p>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setApprovingSession(null)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleConfirmApprove}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-60"
                            >
                                {actionLoading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Approving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        <span>Confirm Approval</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: CORRECT DURATION */}
            {correctingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    <SlidersHorizontal size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Correct Session Duration
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {correctingSession.student?.name ? `Student: ${correctingSession.student.name}` : "Submit corrected class duration"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setCorrectingSession(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {correctionError && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                {correctionError}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Duration inputs */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Corrected Duration
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] text-slate-500">Hours</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="12"
                                            value={correctedHours}
                                            onChange={(e) => setCorrectedHours(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-500">Minutes</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={correctedMinutes}
                                            onChange={(e) => setCorrectedMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-2 flex items-center justify-between text-xs rounded-lg bg-indigo-50/60 p-2 text-indigo-900">
                                    <span>Calculated: <strong>{formatDurationHuman(Number(correctedHours) * 60 + Number(correctedMinutes))}</strong></span>
                                    {correctingSession.hourlyRate > 0 && (
                                        <span>
                                            Fee: <strong>₹{calculateSessionEarnings(correctingSession.hourlyRate, Number(correctedHours) * 60 + Number(correctedMinutes)).toFixed(2)}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Reason for Adjustment <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={correctionReason}
                                    onChange={(e) => setCorrectionReason(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value="Tutor arrived late">Tutor arrived late</option>
                                    <option value="Session ended earlier than recorded">Session ended earlier than recorded</option>
                                    <option value="Technical or timer issue by tutor">Technical or timer issue by tutor</option>
                                    <option value="Power outage / Interrupted session">Power outage / Interrupted session</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={correctionNotes}
                                    onChange={(e) => setCorrectionNotes(e.target.value)}
                                    placeholder="Provide any details to help the tutor verify this adjustment..."
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setCorrectingSession(null)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleSubmitCorrection}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-60"
                            >
                                {actionLoading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Submit Correction</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: DISPUTE SESSION */}
            {disputingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Dispute Tuition Session
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Flag an issue with this session record
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setDisputingSession(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {disputeError && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                {disputeError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Dispute Reason <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                                >
                                    <option value="Tutor was absent / Class did not occur">Tutor was absent / Class did not occur</option>
                                    <option value="Wrong student or subject recorded">Wrong student or subject recorded</option>
                                    <option value="Incorrect date or duplicate session">Incorrect date or duplicate session</option>
                                    <option value="Major time discrepancy">Major time discrepancy</option>
                                    <option value="Unsatisfactory conduct">Unsatisfactory conduct</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Detailed Explanation <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={disputeExplanation}
                                    onChange={(e) => setDisputeExplanation(e.target.value)}
                                    placeholder="Please describe why this session is disputed..."
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                            Disputed sessions are flagged for review. The tutor will be notified to clarify or adjust the record before any payment is generated.
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setDisputingSession(null)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleSubmitDispute}
                                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-60"
                            >
                                {actionLoading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Submitting Dispute...</span>
                                    </>
                                ) : (
                                    <span>Submit Dispute</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


import { useEffect, useState } from "react";
import {
    ClipboardList,
    Clock,
    MapPin,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import {
    getParentDetailsAPI,
    getStudentDetailsAPI,
    getTutorPendingRequestAPI,
    updateScheduleStatusAPI,
} from "../../API/api";

export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState({});
    const [acknowledgments, setAcknowledgments] = useState({});
    const [cardErrors, setCardErrors] = useState({});

    async function updateScheduleStatus(scheduleId, status) {
        if (!scheduleId || actionLoading[scheduleId]) return;

        try {
            setActionLoading((prev) => ({ ...prev, [scheduleId]: status }));
            setCardErrors((prev) => {
                const next = { ...prev };
                delete next[scheduleId];
                return next;
            });

            const response = await updateScheduleStatusAPI(scheduleId, status);
            const responseText = await response.text();
            let result = {};
            if (responseText && responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch (parseErr) {
                    console.error("Failed to parse response JSON:", parseErr);
                }
            }

            if (!response.ok) {
                throw new Error(
                    result.message || `Failed to update schedule status (Status: ${response.status})`
                );
            }

            const confirmedStatus = (result.data?.status || status).toUpperCase();

            setRequests((prevRequests) =>
                prevRequests.map((req) =>
                    (req.id || req._id) === scheduleId
                        ? { ...req, status: confirmedStatus }
                        : req
                )
            );

            const successMessage =
                confirmedStatus === "ACCEPTED"
                    ? "Request accepted successfully!"
                    : "Request rejected successfully!";

            setAcknowledgments((prev) => ({
                ...prev,
                [scheduleId]: successMessage,
            }));
        } catch (err) {
            console.error("Error updating schedule status:", err);
            setCardErrors((prev) => ({
                ...prev,
                [scheduleId]: err.message || "Failed to update schedule status",
            }));
        } finally {
            setActionLoading((prev) => {
                const next = { ...prev };
                delete next[scheduleId];
                return next;
            });
        }
    }

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        try {
            setLoading(true);
            setError("");

            const response = await getTutorPendingRequestAPI();
            const responseText = await response.text();
            const result = responseText ? JSON.parse(responseText) : {};

            if (!response.ok) {
                throw new Error(result.message || "Failed to load requests");
            }

            const schedules = Array.isArray(result.data) ? result.data : [];

            const enrichedRequests = await Promise.all(
                schedules.map(async (schedule) => {
                    let parentName = "Parent unavailable";
                    let studentName = "Student unavailable";
                    let location = null;

                    // Fetch parent details
                    try {
                        const parentResponse = await getParentDetailsAPI(schedule.parentId);
                        const parentText = await parentResponse.text();
                        const parentResult = parentText ? JSON.parse(parentText) : {};

                        if (!parentResponse.ok) {
                            console.error(
                                "Failed to load parent:",
                                parentResponse.status,
                                parentResult.message || "Empty response body"
                            );
                        } else {
                            const parent = parentResult.data;
                            console.log("Parent details:", parent);
                            parentName = parent?.fullName || parentName;
                            location = parent?.parentLocation ?? null;
                        }
                    } catch (err) {
                        console.error(
                            "Failed to fetch parent details:",
                            schedule.parentId,
                            err
                        );
                    }

                    // Fetch student details
                    try {
                        const studentResponse = await getStudentDetailsAPI(schedule.childId);
                        const studentText = await studentResponse.text();
                        const studentResult = studentText ? JSON.parse(studentText) : {};

                        if (!studentResponse.ok) {
                            console.error(
                                "Failed to load student:",
                                studentResponse.status,
                                studentResult.message || "Empty response body"
                            );
                        } else {
                            const student = studentResult.data;
                            console.log("Student details:", student);
                            studentName = student?.name || studentName;
                        }
                    } catch (err) {
                        console.error(
                            "Failed to fetch student details:",
                            schedule.childId,
                            err
                        );
                    }

                    return {
                        ...schedule,
                        parentName,
                        studentName,
                        location,
                    };
                })
            );

            setRequests(enrichedRequests);
            console.log("Received Data:", enrichedRequests);
        } catch (err) {
            console.error("Error fetching requests:", err);
            setError(err.message || "Failed to load requests");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <p className="mt-3 text-sm font-medium text-slate-500">
                    Loading tuition requests...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                <p className="text-sm font-medium text-rose-700">{error}</p>
                <button
                    onClick={fetchRequests}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="w-full">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Tuition Requests
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review tuition schedules shared by parents.
                    </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center shadow-xs">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
                        <ClipboardList size={26} strokeWidth={1.8} />
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">
                        No pending requests
                    </h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                        New tuition requests from parents will appear here for your confirmation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Tuition Requests
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Review and approve tuition schedules requested by parents.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {requests.map((request) => {
                    const schedId = request.id || request._id;
                    const currentStatus = (request.status || "PENDING").toUpperCase();
                    const isProcessing = Boolean(actionLoading[schedId]);
                    const currentAction = actionLoading[schedId];
                    const successAck = acknowledgments[schedId];
                    const cardError = cardErrors[schedId];

                    return (
                        <div
                            key={schedId}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200"
                        >
                            <div>
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 leading-snug">
                                            Tuition Schedule Request
                                        </h2>
                                        <span className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-500">
                                            ID: {schedId}
                                        </span>
                                    </div>

                                    {/* Status Badge */}
                                    {currentStatus === "ACCEPTED" ? (
                                        <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border border-emerald-200/80 bg-emerald-50 text-emerald-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Accepted
                                        </span>
                                    ) : currentStatus === "REJECTED" ? (
                                        <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border border-rose-200/80 bg-rose-50 text-rose-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                            Rejected
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border border-amber-200/80 bg-amber-50 text-amber-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            Pending Review
                                        </span>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="space-y-3.5 border-t border-slate-100 pt-4 text-sm">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                                Parent Name
                                            </p>
                                            <p className="font-semibold text-slate-900 truncate mt-0.5 text-xs sm:text-sm">
                                                {request.parentName}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                                Student Name
                                            </p>
                                            <p className="font-semibold text-slate-900 truncate mt-0.5 text-xs sm:text-sm">
                                                {request.studentName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                            Tuition Address
                                        </p>
                                        <p className="font-medium text-slate-800 text-xs sm:text-sm whitespace-pre-line mt-0.5">
                                            {request.location?.address || "Not provided"}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Pincode: {request.location?.pincode || "Not provided"}
                                        </p>

                                        {request.location?.latitude != null &&
                                            request.location?.longitude != null && (
                                                <a
                                                    href={`https://www.google.com/maps?q=${request.location.latitude},${request.location.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                                >
                                                    <MapPin size={12} />
                                                    <span>View tuition location on map</span>
                                                    <ExternalLink size={11} />
                                                </a>
                                            )}
                                    </div>

                                    {/* Schedule Timings Section */}
                                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                                            <Clock size={13} className="text-blue-600" />
                                            <span>Requested Timings</span>
                                        </div>

                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-slate-500 shrink-0">Class Days:</span>
                                                <span className="font-medium text-slate-800 text-right">
                                                    {Array.isArray(request.daysOfWeek) && request.daysOfWeek.length > 0
                                                        ? request.daysOfWeek.join(", ")
                                                        : "Not provided"}
                                                </span>
                                            </div>

                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-slate-500 shrink-0">Session Time:</span>
                                                <span className="font-medium text-slate-800 text-right">
                                                    {request.startTime || "--:--"} – {request.endTime || "--:--"}
                                                </span>
                                            </div>

                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-slate-500 shrink-0">Effective From:</span>
                                                <span className="font-medium text-slate-800 text-right">
                                                    {request.effectiveFrom || "Not provided"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Success acknowledgment display */}
                                {successAck && (
                                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs sm:text-sm font-medium text-emerald-800">
                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                        <span>{successAck}</span>
                                    </div>
                                )}

                                {/* Error display on specific card */}
                                {cardError && (
                                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs sm:text-sm font-medium text-rose-700">
                                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                        <span>{cardError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action buttons */}
                            {currentStatus === "PENDING" && !successAck && (
                                <div className="mt-5 pt-3 border-t border-slate-100 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => updateScheduleStatus(schedId, "ACCEPTED")}
                                        className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] py-2.5 text-sm font-semibold text-white shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {currentAction === "ACCEPTED" ? "Processing..." : "Accept"}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => updateScheduleStatus(schedId, "REJECTED")}
                                        className="flex-1 inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white hover:bg-rose-50 active:scale-[0.99] py-2.5 text-sm font-semibold text-rose-600 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {currentAction === "REJECTED" ? "Processing..." : "Reject"}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

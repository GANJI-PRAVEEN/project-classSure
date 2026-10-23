
import { useEffect, useState } from "react";
import {
    getParentDetailsAPI,
    getStudentDetailsAPI,
    getTutorPendingRequestAPI,
    updateScheduleStatusAPI
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
                [scheduleId]: successMessage
            }));
        } catch (err) {
            console.error("Error updating schedule status:", err);
            setCardErrors((prev) => ({
                ...prev,
                [scheduleId]: err.message || "Failed to update schedule status"
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
                throw new Error(
                    result.message || "Failed to load requests"
                );
            }

            const schedules = Array.isArray(result.data)
                ? result.data
                : [];



            const enrichedRequests = await Promise.all(
                schedules.map(async (schedule) => {
                    let parentName = "Parent unavailable";
                    let studentName = "Student unavailable";
                    let location = null;

                    // Fetch parent details
                    try {
                        const parentResponse = await getParentDetailsAPI(
                            schedule.parentId
                        );

                        const parentText = await parentResponse.text();

                        // Parse the response only if the body is not empty
                        const parentResult = parentText
                            ? JSON.parse(parentText)
                            : {};

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
                        const studentResponse = await getStudentDetailsAPI(
                            schedule.childId
                        );

                        const studentText = await studentResponse.text();

                        console.log("Student ID:", schedule.childId);
                        console.log("Student status:", studentResponse.status);
                        console.log("Student response body:", studentText);

                        const studentResult = studentText
                            ? JSON.parse(studentText)
                            : {};

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
                        location
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
        return <p className="p-6">Loading tuition requests...</p>;
    }

    if (error) {
        return (
            <div className="p-6">
                <p className="text-red-600">{error}</p>
                <button
                    onClick={fetchRequests}
                    className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold">
                    No pending requests
                </h2>
                <p className="mt-2 text-gray-500">
                    New tuition requests from parents will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Tuition Requests</h1>
                <p className="mt-1 text-gray-500">
                    Review tuition schedules shared by parents.
                </p>
            </div>

            <div className="grid gap-4">
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
                            className="rounded-xl border bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Tuition Request
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Schedule ID: {schedId}
                                    </p>
                                </div>

                                {currentStatus === "ACCEPTED" ? (
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                        Accepted
                                    </span>
                                ) : currentStatus === "REJECTED" ? (
                                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                                        Rejected
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                                        Pending
                                    </span>
                                )}
                            </div>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Parent name
                                    </p>
                                    <p className="font-medium">
                                        {request.parentName}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">
                                        Student name
                                    </p>
                                    <p className="font-medium">
                                        {request.studentName}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">
                                        Tuition address
                                    </p>
                                    <p className="whitespace-pre-line font-medium">
                                        {request.location?.address || "Not provided"}
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Pincode: {request.location?.pincode || "Not provided"}
                                    </p>

                                    {request.location?.latitude != null &&
                                        request.location?.longitude != null && (
                                            <a
                                                href={`https://www.google.com/maps?q=${request.location.latitude},${request.location.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-block text-blue-600 hover:underline"
                                            >
                                                View tuition location on map
                                            </a>
                                        )}
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">
                                        Days
                                    </p>
                                    <p className="font-medium">
                                        {Array.isArray(request.daysOfWeek)
                                            ? request.daysOfWeek.join(", ")
                                            : "Not provided"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">
                                        Session time
                                    </p>
                                    <p className="font-medium">
                                        {request.startTime || "--:--"} –{" "}
                                        {request.endTime || "--:--"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">
                                        Effective from
                                    </p>
                                    <p className="font-medium">
                                        {request.effectiveFrom || "Not provided"}
                                    </p>
                                </div>
                            </div>

                            {/* Success acknowledgment display */}
                            {successAck && (
                                <div className="mt-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
                                    <svg className="h-5 w-5 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>{successAck}</span>
                                </div>
                            )}

                            {/* Error display on specific card */}
                            {cardError && (
                                <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                                    <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>{cardError}</span>
                                </div>
                            )}

                            {/* Action buttons (displayed when still pending and not acknowledged) */}
                            {currentStatus === "PENDING" && !successAck && (
                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => updateScheduleStatus(schedId, "ACCEPTED")}
                                        className="flex-1 rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                                    >
                                        {currentAction === "ACCEPTED" ? "Processing..." : "Accept"}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => updateScheduleStatus(schedId, "REJECTED")}
                                        className="flex-1 rounded-lg border border-red-300 py-2 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
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

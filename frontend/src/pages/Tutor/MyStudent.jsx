import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTutorStudentsAPI } from "../../API/api";

function MyStudents() {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem("user"));
        const loadStudents = async () => {
            try {
                setLoading(true);
                const res = await getAllTutorStudentsAPI(currentUser.id);
                console.log("Res", res);
                if (res.ok) {
                    const data = await res.json();
                    console.log("Students data", data);
                    setStudents(data);
                }
                else {
                    setError("Failed to load students");
                }
            } catch (error) {
                setError("Failed to load students");
            }
            finally {
                setLoading(false);
            }
        }
        loadStudents();
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="mx-auto max-w-7xl">

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">
                        My Students
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        View your assigned students and their class schedules.
                    </p>
                </div>

                {/* Student Count */}
                <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5">
                    <div>
                        <p className="text-sm text-gray-500">Total Students</p>
                        <p className="mt-1 text-2xl font-bold text-gray-800">
                            {students.length}
                        </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="25"
                            height="25"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="10" cy="7" r="4" />
                            <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <p className="py-12 text-center text-gray-500">
                        Loading students...
                    </p>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && students.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                        <h2 className="text-lg font-semibold text-gray-700">
                            No students assigned yet
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Students assigned to you will appear here.
                        </p>
                    </div>
                )}

                {/* Student Cards */}
                {!loading && !error && students.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {students.map((student) => {
                            const studentId = student.id ?? student._id;
                            const schedule = student.schedule;

                            return (
                                <div
                                    key={studentId}
                                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
                                >
                                    {/* Card Header */}
                                    <div className="border-b border-gray-100 p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                                                {student.name?.charAt(0)?.toUpperCase() || "S"}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <h2 className="truncate text-lg font-semibold text-gray-800">
                                                    {student.name || "Unnamed Student"}
                                                </h2>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {student.grade || "Grade not specified"}
                                                    {student.board ? ` · ${student.board}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Basic Information */}
                                    <div className="space-y-4 p-5">

                                        <div>
                                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Subjects
                                            </p>
                                            <p className="text-sm font-medium text-gray-700">
                                                {Array.isArray(student.subjects)
                                                    ? student.subjects.join(", ") || "Not specified"
                                                    : student.subjects || "Not specified"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Class Days
                                            </p>
                                            <p className="text-sm text-gray-700">
                                                {Array.isArray(schedule?.daysOfWeek)
                                                    ? schedule.daysOfWeek.join(", ") || "Not scheduled"
                                                    : "Not scheduled"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Class Timing
                                            </p>
                                            <p className="text-sm text-gray-700">
                                                {schedule?.startTime && schedule?.endTime
                                                    ? `${schedule.startTime} – ${schedule.endTime}`
                                                    : "Not scheduled"}
                                            </p>
                                        </div>

                                        {/* Schedule Status */}
                                        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                            <span className="text-sm text-gray-500">
                                                Schedule Status
                                            </span>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-medium ${schedule?.status === "ACTIVE"
                                                    ? "bg-green-100 text-green-700"
                                                    : schedule?.status === "PENDING"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : schedule?.status === "REJECTED"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {schedule?.status || "No Schedule"}
                                            </span>
                                        </div>

                                        {/* View Details */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/tutor/my-students/${studentId}`
                                                )
                                            }
                                            disabled={!studentId}
                                            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            View Details
                                        </button>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyStudents;
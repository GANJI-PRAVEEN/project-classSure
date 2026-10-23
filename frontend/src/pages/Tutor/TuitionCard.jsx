
import { Clock3, MapPin, UserRound, BookOpen, GraduationCap, Play, CalendarClock, ExternalLink } from "lucide-react";

function TuitionCard({ schedule, student, parent, subjects, onStartTimer, onReschedule }) {
    console.log("received subjects", subjects);
    const mapUrl =
        parent?.parentLocation?.latitude != null &&
            parent?.parentLocation?.longitude != null
            ? `https://www.google.com/maps?q=${parent.parentLocation.latitude},${parent.parentLocation.longitude}`
            : null;

    const formatTime = (time) => {
        if (!time) return "--";
        const [hours, minutes] = time.split(":").map(Number);
        const suffix = hours >= 12 ? "PM" : "AM";
        const formattedHour = hours % 12 || 12;

        return `${formattedHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
    };

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
        <article className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200">
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

                <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    Upcoming
                </span>
            </div>

            <div className="my-4 border-t border-slate-100" />

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
                        <p className="text-xs text-slate-500">Schedule time</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
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
                <button
                    type="button"
                    onClick={() => onStartTimer(schedule)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                    <Play size={16} />
                    Start Timer
                </button>

                <button
                    type="button"
                    onClick={() => onReschedule(schedule)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    <CalendarClock size={16} />
                    Reschedule Tuition
                </button>
            </div>
        </article>
    );
}

export default TuitionCard;

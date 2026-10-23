import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Clock, GraduationCap } from "lucide-react";
import { getAllTutorStudentsAPI, getScheduleByChildIdAPI } from "../../API/api";


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
          const enriched = await Promise.all(
            (Array.isArray(data) ? data : []).map(async (student) => {
              const childId = student.id ?? student._id;
              if (!student.schedule && childId) {
                try {
                  const sRes = await getScheduleByChildIdAPI(childId);
                  if (sRes.ok) {
                    const sData = await sRes.json();
                    return { ...student, schedule: sData };
                  }
                } catch {
                  // ignore
                }
              }
              return student;
            })
          );
          setStudents(enriched);
        } else {
          setError("Failed to load students");
        }
      } catch (error) {
        setError("Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, []);

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Students
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your enrolled students, academic details, and tuition schedules.
          </p>
        </div>

        {/* Total Students Counter Card */}
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60">
            <Users size={20} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Enrolled
            </p>
            <p className="text-lg font-bold text-slate-900 leading-none mt-0.5">
              {students.length}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading student roster...
          </p>
        </div>
      )}

      {/* Error Banner */}
      {!loading && error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && students.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
            <Users size={26} strokeWidth={1.8} />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            No students assigned yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Students assigned to your tuition batches will appear here once schedules are confirmed.
          </p>
        </div>
      )}

      {/* Student Cards Grid */}
      {!loading && !error && students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {students.map((student) => {
            const studentId = student.id ?? student._id;
            const schedule = student.schedule;
            const status = schedule?.status;

            return (
              <div
                key={studentId}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Card Header */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 font-bold text-base shadow-xs">
                        {student.name?.charAt(0)?.toUpperCase() || "S"}
                      </div>

                      <div className="min-w-0">
                        <h2 className="font-semibold text-slate-900 text-base leading-snug truncate">
                          {student.name || "Unnamed Student"}
                        </h2>
                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                          {student.grade || "Grade not specified"}
                          {student.board ? ` · ${student.board}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Schedule Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border ${
                        status === "ACTIVE"
                          ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
                          : status === "PENDING"
                          ? "border-amber-200/80 bg-amber-50 text-amber-700"
                          : status === "REJECTED"
                          ? "border-rose-200/80 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          status === "ACTIVE"
                            ? "bg-emerald-500"
                            : status === "PENDING"
                            ? "bg-amber-500"
                            : status === "REJECTED"
                            ? "bg-rose-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {status || "No Schedule"}
                    </span>
                  </div>

                  {/* Information Details */}
                  <div className="space-y-3.5 border-t border-slate-100 pt-4 text-sm">
                    {/* Subjects Pill Badges */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Subjects
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(student.subjects) && student.subjects.length > 0 ? (
                          student.subjects.map((subj, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                            >
                              {subj}
                            </span>
                          ))
                        ) : student.subjects ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {student.subjects}
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">Not specified</span>
                        )}
                      </div>
                    </div>

                    {/* Schedule Timings Section */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <Clock size={13} className="text-blue-600" />
                        <span>Class Schedule</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {schedule?.hourlyRate != null && schedule.hourlyRate > 0 && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 shrink-0">Hourly Rate:</span>
                            <span className="font-semibold text-slate-900 text-right">
                              ₹{schedule.hourlyRate}/hr
                            </span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-500 shrink-0">Days:</span>
                          <span className="font-medium text-slate-800 text-right">
                            {Array.isArray(schedule?.daysOfWeek) && schedule.daysOfWeek.length > 0
                              ? schedule.daysOfWeek.join(", ")
                              : "Not scheduled"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-500 shrink-0">Timing:</span>
                          <span className="font-medium text-slate-800 text-right">
                            {schedule?.startTime && schedule?.endTime
                              ? `${schedule.startTime} – ${schedule.endTime}`
                              : "Not scheduled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate(`/tutor/my-students/${studentId}`)}
                    disabled={!studentId}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
  );
}

export default MyStudents;
import { useEffect, useState } from "react";
import { Plus, Users, X, Clock } from "lucide-react";

import {
  getAllChildrensAPI,
  getStaticEducationCategoryAPI,
  getStaticSubjectsDataAPI,
  validateTutorAPI,
  saveChildAPI,
  deleteChildAPI,
  getEducationCategoryByIdAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
  getTutorByIdAPI,
  saveTempScheduleAPI,
  getSchedulesAPI,
  getScheduleByChildIdAPI,
} from "../../API/api.js";

const API = "http://localhost:8080/static_data";

const initialFormData = {
  studentName: "",
  tutorEmail: "",
  educationCategory: "",
  board: "",
  grade: "",
  subjects: [],
};

const getId = (item) => item?.id ?? item?._id ?? "";

const getName = (item) =>
  item?.name ??
  item?.educationCategoryName ??
  item?.boardName ??
  item?.subjectName ??
  "";

function normalizeCategory(category) {
  const value = String(category ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    SCHOOL_EDUCATION: "SCHOOL",
    INTER: "INTERMEDIATE",
    UG: "UNDERGRADUATE",
    PG: "POSTGRADUATE",
    COMPETITIVE_EXAMS: "COMPETITIVE_EXAMS",
  };

  return aliases[value] ?? value;
}

function formatDays(days) {
  if (!Array.isArray(days) || days.length === 0) return "";
  const nameMap = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
  };
  return days.map((d) => nameMap[String(d).toUpperCase()] || d).join(", ");
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parts[1].slice(0, 2) : "00";
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const [year, month, day] = String(dateStr).split("-");
    if (!year || !month || !day) return dateStr;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function MyChildren() {
  const [children, setChildren] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [grades, setGrades] = useState([]);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  // Tuition Schedule form state
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");


  // Load children with their enriched static names and schedules
  async function loadChildrensData() {
    try {
      const [res, schedRes] = await Promise.all([
        getAllChildrensAPI(),
        getSchedulesAPI().catch(() => null),
      ]);

      const scheduleMap = new Map();
      if (schedRes && schedRes.ok) {
        const schedData = await schedRes.json().catch(() => []);
        if (Array.isArray(schedData)) {
          schedData.forEach((s) => {
            if (s.childId) {
              scheduleMap.set(String(s.childId), s);
            }
          });
        }
      }

      if (res.ok) {
        const data = await res.json();
        const updatedChildren = await Promise.all(
          data.map(async (child) => {
            const childId = String(child.id ?? child._id ?? "");
            let categoryName = child.educationCategory;
            let tutorName = child.tutorName;
            let boardName = child.board;
            let subjectNames = Array.isArray(child.subjects) ? child.subjects : [];

            try {
              if (child.educationCategory) {
                const category = await getEducationCategoryByIdAPI(child.educationCategory);
                if (category.ok) {
                  const categoryData = await category.json();
                  categoryName = categoryData.name ?? categoryData.educationCategoryName ?? categoryName;
                }
              }
            } catch (err) {
              console.warn("Category load error:", err);
            }

            try {
              if (child.tutorId) {
                const tutorRes = await getTutorByIdAPI(child.tutorId);
                if (tutorRes.ok) {
                  const tutorData = await tutorRes.json();
                  tutorName = tutorData.fullName ?? tutorName;
                }
              }
            } catch (err) {
              console.warn("Tutor load error:", err);
            }

            try {
              if (child.board) {
                const board = await getBoardByIdAPI(child.board);
                if (board.ok) {
                  const boardData = await board.json();
                  boardName = boardData.name ?? boardData.boardName ?? boardName;
                }
              }
            } catch (err) {
              console.warn("Board load error:", err);
            }

            try {
              if (Array.isArray(child.subjectIds) && child.subjectIds.length > 0) {
                const subjectsRes = await getSubjectsByIdsAPI(child.subjectIds);
                if (subjectsRes.ok) {
                  const subjectsData = await subjectsRes.json();
                  if (Array.isArray(subjectsData)) {
                    subjectNames = subjectsData.map((s) => s.name ?? s.subjectName);
                  }
                }
              }
            } catch (err) {
              console.warn("Subjects load error:", err);
            }

            // Retrieve matching schedule for this child
            let matchedSchedule = scheduleMap.get(childId) || null;
            if (!matchedSchedule && childId) {
              try {
                const singleSchedRes = await getScheduleByChildIdAPI(childId);
                if (singleSchedRes.ok) {
                  matchedSchedule = await singleSchedRes.json();
                }
              } catch {
                // fallback if single schedule lookup fails
              }
            }

            return {
              ...child,
              educationCategory: categoryName,
              tutorName: tutorName,
              board: boardName,
              subjects: subjectNames,
              schedule: matchedSchedule,
            };
          })
        );

        setChildren(updatedChildren);
      }
    } catch (error) {
      console.error("Fetching children failed", error);
    }
  }

  // Initial load
  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialData() {
      setLoadingCategories(true);
      setLoadingSubjects(true);

      try {
        const [categoryResponse, subjectResponse] = await Promise.all([
          getStaticEducationCategoryAPI(),
          getStaticSubjectsDataAPI(),
        ]);

        if (categoryResponse.ok && subjectResponse.ok) {
          const [categoryData, subjectData] = await Promise.all([
            categoryResponse.json(),
            subjectResponse.json(),
          ]);

          setCategories(
            Array.isArray(categoryData)
              ? categoryData.filter((item) => item.active !== false)
              : []
          );

          setSubjects(
            Array.isArray(subjectData)
              ? subjectData.filter((item) => item.active !== false)
              : []
          );
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Initial data error:", error);
          setErrors((previous) => ({
            ...previous,
            initial: error.message,
          }));
        }
      } finally {
        setLoadingCategories(false);
        setLoadingSubjects(false);
      }
    }

    loadInitialData();
    loadChildrensData();

    return () => controller.abort();
  }, []);

  const selectedCategory = categories.find(
    (item) => String(getId(item)) === String(formData.educationCategory)
  );

  const categoryName = getName(selectedCategory);
  const isCompetitiveExam =
    normalizeCategory(categoryName) === "COMPETITIVE_EXAMS";

  // Load boards and grades when the education category changes
  useEffect(() => {
    if (!formData.educationCategory || !selectedCategory) {
      return;
    }

    const controller = new AbortController();

    async function loadCategoryData() {
      setLoadingGrades(true);
      setLoadingBoards(true);

      const category = normalizeCategory(getName(selectedCategory));

      try {
        const gradesUrl = `${API}/grades-data?category=${encodeURIComponent(category)}`;
        const gradeResponse = await fetch(gradesUrl, { signal: controller.signal });
        if (gradeResponse.ok) {
          const gradeData = await gradeResponse.json();
          setGrades(Array.isArray(gradeData) ? gradeData : []);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Grades fetch error:", error);
        }
      } finally {
        setLoadingGrades(false);
      }

      try {
        const boardsUrl = `${API}/boards-data?educationCategoryId=${encodeURIComponent(
          formData.educationCategory
        )}`;
        const boardResponse = await fetch(boardsUrl, { signal: controller.signal });
        if (boardResponse.ok) {
          const boardData = await boardResponse.json();
          setBoards(
            Array.isArray(boardData)
              ? boardData.filter((item) => item.active !== false)
              : []
          );
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Boards fetch error:", error);
        }
      } finally {
        setLoadingBoards(false);
      }
    }

    loadCategoryData();

    return () => controller.abort();
  }, [formData.educationCategory, selectedCategory]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setErrors((previous) => ({
      ...previous,
      [name]: "",
      submit: "",
    }));
    setMessage("");
  }

  function handleCategoryChange(event) {
    const value = event.target.value;
    setFormData((previous) => ({
      ...previous,
      educationCategory: value,
      board: "",
      grade: "",
    }));
    setBoards([]);
    setGrades([]);
    setErrors((previous) => ({
      ...previous,
      educationCategory: "",
      board: "",
      grade: "",
      boards: "",
      grades: "",
      submit: "",
    }));
    setMessage("");
  }

  function handleSubjectChange(subjectId) {
    setFormData((previous) => {
      const alreadySelected = previous.subjects.includes(subjectId);
      return {
        ...previous,
        subjects: alreadySelected
          ? previous.subjects.filter((id) => id !== subjectId)
          : [...previous.subjects, subjectId],
      };
    });
    setErrors((previous) => ({
      ...previous,
      subjects: "",
      submit: "",
    }));
    setMessage("");
  }

  function handleClose() {
    setShowForm(false);
    setFormData(initialFormData);
    setDaysOfWeek([]);
    setStartTime("");
    setEndTime("");
    setEffectiveFrom("");
    setEffectiveTo("");
    setHourlyRate("");
    setErrors({});
    setMessage("");
    setBoards([]);
    setGrades([]);
  }


  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setErrors({});
    setMessage("");

    const newErrors = {};
    const tutorEmail = formData.tutorEmail.trim().toLowerCase();

    // 1. Validate student name
    if (!formData.studentName.trim()) {
      newErrors.studentName = "Enter the student's name.";
    }

    // 2. Validate tutor email format
    if (!tutorEmail) {
      newErrors.tutorEmail = "Tutor email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorEmail)) {
      newErrors.tutorEmail = "Enter a valid tutor email address.";
    }

    // 3. Validate education category
    if (!formData.educationCategory) {
      newErrors.educationCategory = "Select an education category.";
    }

    // 4. Validate board
    if (boards.length > 0 && !isCompetitiveExam && !formData.board) {
      newErrors.board = "Select a board.";
    }

    // 5. Validate grade
    if (!formData.grade) {
      newErrors.grade = "Select a grade or year.";
    }

    // 6. Validate subjects
    if (!formData.subjects || formData.subjects.length === 0) {
      newErrors.subjects = "Select at least one subject.";
    }

    // 7. Validate recurring class days
    if (!daysOfWeek || daysOfWeek.length === 0) {
      newErrors.daysOfWeek = "Select at least one recurring class day.";
    }

    // 8. Validate schedule timings
    if (!startTime) {
      newErrors.startTime = "Select a start time.";
    }
    if (!endTime) {
      newErrors.endTime = "Select an end time.";
    } else if (startTime && endTime <= startTime) {
      newErrors.endTime = "End time must be later than start time.";
    }

    // 9. Validate effective dates
    if (!effectiveFrom) {
      newErrors.effectiveFrom = "Select the schedule start date.";
    }
    if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) {
      newErrors.effectiveTo = "End date must be on or after the effective-from date.";
    }

    // 10. Validate hourly tuition fee
    if (!hourlyRate || String(hourlyRate).trim() === "") {
      newErrors.hourlyRate = "Hourly tuition fee is required.";
    } else if (isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
      newErrors.hourlyRate = "Hourly fee must be greater than zero.";
    }

    // Stop and do not make any save requests if validation fails
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Verify tutor using existing API
      const response = await validateTutorAPI(tutorEmail);
      if (!response.ok) {
        setErrors({
          tutorEmail: "Tutor not found or this email does not belong to a registered tutor.",
        });
        setSubmitting(false);
        return;
      }

      const data = await response.json();
      const tutorId = data.tutor_id;
      const parentId = data.parent_id;

      // Step 2: Save Child using existing child creation API
      const childrenPayload = {
        name: formData.studentName.trim(),
        parentId: parentId,
        tutorId: tutorId,
        grade: formData.grade,
        subjectIds: formData.subjects,
        board: formData.board || null,
        educationCategory: formData.educationCategory,
      };

      const addChildResponse = await saveChildAPI(childrenPayload);
      if (!addChildResponse.ok) {
        const errorData = await addChildResponse.json().catch(() => ({}));
        setMessage(errorData.error || "Failed to save child. Please check inputs and try again.");
        setSubmitting(false);
        return;
      }

      const savedChild = await addChildResponse.json();
      const savedChildId = savedChild.id ?? savedChild._id;

      if (!savedChildId) {
        setMessage("Invalid server response: Child was saved but ID was not returned.");
        setSubmitting(false);
        return;
      }

      // Step 3: Build separate schedule payload
      const schedulePayload = {
        childId: savedChildId,
        parentId: parentId,
        tutorId: tutorId,
        daysOfWeek: daysOfWeek,
        startTime: startTime,
        endTime: endTime,
        effectiveFrom: effectiveFrom,
        effectiveTo: effectiveTo || null,
        hourlyRate: Number(hourlyRate),
        status: "PENDING",
      };


      let scheduleSaveSuccess = false;
      let scheduleErrorMessage = "";

      try {
        const scheduleResponse = await saveTempScheduleAPI(schedulePayload);
        if (scheduleResponse.ok) {
          scheduleSaveSuccess = true;
        } else {
          const schedErr = await scheduleResponse.json().catch(() => ({}));
          scheduleErrorMessage = schedErr.error || "Schedule creation was rejected by the server.";
        }
      } catch (err) {
        console.error("Schedule network error:", err);
        scheduleErrorMessage = "Network error while saving schedule.";
      }

      // If saving the schedule fails, clean up the orphaned child record
      if (!scheduleSaveSuccess) {
        try {
          await deleteChildAPI(savedChildId);
        } catch (cleanupErr) {
          console.error("Cleanup of orphaned child failed:", cleanupErr);
        }
        setMessage(`Schedule could not be saved: ${scheduleErrorMessage}. The child record was rolled back.`);
        setSubmitting(false);
        return;
      }

      // Complete Success: Close modal, reset form, and immediately refresh list
      handleClose();
      await loadChildrensData();
    } catch (error) {
      console.error("Save process encountered an error:", error);
      setMessage(error.message || "Unable to save child or schedule. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600";

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Children
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage student details, tuition schedules, and tutor assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData(initialFormData);
            setDaysOfWeek([]);
            setStartTime("");
            setEndTime("");
            setEffectiveFrom("");
            setEffectiveTo("");
            setHourlyRate("");
            setErrors({});
            setMessage("");
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition"
        >
          <Plus size={18} strokeWidth={2.2} />
          Add Child
        </button>
      </div>

      {errors.initial && (
        <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errors.initial}
        </p>
      )}

      {/* Children list */}
      {children.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
            <Users size={26} strokeWidth={1.8} />
          </div>
          <h2 className="text-base font-semibold text-slate-900">No children added yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Click &quot;Add Child&quot; to register a student and request a recurring tuition schedule with a tutor.
          </p>
          <button
            type="button"
            onClick={() => {
              setFormData(initialFormData);
              setDaysOfWeek([]);
              setStartTime("");
              setEndTime("");
              setEffectiveFrom("");
              setEffectiveTo("");
              setHourlyRate("");
              setErrors({});
              setMessage("");
              setShowForm(true);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus size={16} strokeWidth={2.2} />
            Add Child
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {children.map((child) => {
            const schedule = child.schedule;
            const isPending = schedule?.status === "PENDING";
            const isActive = schedule?.status === "ACTIVE" || schedule?.status === "APPROVED";

            return (
              <div
                key={child.id ?? child._id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 font-bold text-base shadow-xs">
                        {child.name?.charAt(0)?.toUpperCase() ?? "S"}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-slate-900 text-base leading-snug truncate">
                          {child.name}
                        </h2>
                        <p className="text-xs font-medium text-slate-500 truncate">
                          {child.grade || "No grade specified"}
                        </p>
                      </div>
                    </div>

                    {schedule ? (
                      <span
                        className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border ${
                          isPending
                            ? "border-amber-200/80 bg-amber-50 text-amber-700"
                            : isActive
                            ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPending
                              ? "bg-amber-500"
                              : isActive
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {isPending ? "Pending Approval" : isActive ? "Active" : schedule.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                        No Schedule
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-3.5 border-t border-slate-100 pt-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Education category
                        </p>
                        <p className="font-medium text-slate-800 text-xs sm:text-sm truncate mt-0.5">
                          {child.educationCategory || "Not specified"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Board
                        </p>
                        <p className="font-medium text-slate-800 text-xs sm:text-sm truncate mt-0.5">
                          {child.board || "Not specified"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Assigned Tutor
                      </p>
                      <p className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5 truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span className={child.tutorName ? "text-slate-900" : "text-slate-400 italic"}>
                          {child.tutorName || "No tutor assigned"}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Subjects
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(child.subjects ?? []).length > 0 ? (
                          child.subjects.map((name, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-slate-400">None specified</span>
                        )}
                      </div>
                    </div>

                    {/* Schedule Timings Section */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 mt-2">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <Clock size={13} className="text-blue-600" />
                        <span>Tuition Schedule</span>
                      </div>

                      {schedule ? (
                        <div className="space-y-1.5 text-xs">
                          {schedule.hourlyRate != null && schedule.hourlyRate > 0 && (
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-slate-500 shrink-0">Hourly Rate:</span>
                              <span className="font-semibold text-slate-900 text-right">
                                ₹{schedule.hourlyRate}/hr
                              </span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 shrink-0">Class Days:</span>
                            <span className="font-medium text-slate-800 text-right">
                              {formatDays(schedule.daysOfWeek) || "Not specified"}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 shrink-0">Timings:</span>
                            <span className="font-medium text-slate-800 text-right">
                              {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 shrink-0">Effective:</span>
                            <span className="font-medium text-slate-800 text-right">
                              {formatDate(schedule.effectiveFrom)} →{" "}
                              {schedule.effectiveTo ? formatDate(schedule.effectiveTo) : "Ongoing"}
                            </span>
                          </div>

                          {isPending && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>Schedule pending tutor approval</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs italic text-slate-400">No schedule available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add child modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="relative my-auto flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Add Child
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enter student details and set recurring tuition timings.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                aria-label="Close form"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                {/* Student name */}
                <div>
                  <label className={labelClass} htmlFor="studentName">
                    Student name *
                  </label>
                  <input
                    id="studentName"
                    name="studentName"
                    type="text"
                    value={formData.studentName}
                    onChange={handleChange}
                    placeholder="Enter student's full name"
                    className={inputClass}
                    disabled={submitting}
                    required
                  />
                  {errors.studentName && (
                    <p className="mt-1 text-xs text-rose-600">{errors.studentName}</p>
                  )}
                </div>

                {/* Tutor email */}
                <div>
                  <label className={labelClass} htmlFor="tutorEmail">
                    Tutor email *
                  </label>
                  <input
                    id="tutorEmail"
                    name="tutorEmail"
                    type="email"
                    value={formData.tutorEmail}
                    onChange={handleChange}
                    placeholder="Enter the registered tutor's email"
                    className={inputClass}
                    autoComplete="email"
                    disabled={submitting}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the email the tutor used to register on ClassSure.
                  </p>
                  {errors.tutorEmail && (
                    <p className="mt-1 text-xs text-rose-600">{errors.tutorEmail}</p>
                  )}
                </div>

                {/* Education category */}
                <div>
                  <label className={labelClass} htmlFor="educationCategory">
                    Education category *
                  </label>
                  <select
                    id="educationCategory"
                    name="educationCategory"
                    value={formData.educationCategory}
                    onChange={handleCategoryChange}
                    className={inputClass}
                    disabled={loadingCategories || submitting}
                    required
                  >
                    <option value="">
                      {loadingCategories
                        ? "Loading categories..."
                        : "Select education category"}
                    </option>
                    {categories.map((category) => (
                      <option key={getId(category)} value={getId(category)}>
                        {getName(category)}
                      </option>
                    ))}
                  </select>
                  {errors.educationCategory && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.educationCategory}
                    </p>
                  )}
                </div>

                {/* Board */}
                {formData.educationCategory && !isCompetitiveExam && (
                  <div>
                    <label className={labelClass} htmlFor="board">
                      Board
                    </label>
                    <select
                      id="board"
                      name="board"
                      value={formData.board}
                      onChange={handleChange}
                      className={inputClass}
                      disabled={loadingBoards || boards.length === 0 || submitting}
                    >
                      <option value="">
                        {loadingBoards
                          ? "Loading boards..."
                          : boards.length === 0
                            ? "No boards available"
                            : "Select board"}
                      </option>
                      {boards.map((board) => (
                        <option key={getId(board)} value={getId(board)}>
                          {getName(board)}
                        </option>
                      ))}
                    </select>
                    {errors.board && (
                      <p className="mt-1 text-xs text-rose-600">{errors.board}</p>
                    )}
                  </div>
                )}

                {/* Grade */}
                <div>
                  <label className={labelClass} htmlFor="grade">
                    {isCompetitiveExam
                      ? "Preparation level *"
                      : "Grade / Year / Semester *"}
                  </label>
                  <select
                    id="grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    className={inputClass}
                    disabled={!formData.educationCategory || loadingGrades || submitting}
                    required
                  >
                    <option value="">
                      {!formData.educationCategory
                        ? "Select a category first"
                        : loadingGrades
                          ? "Loading options..."
                          : grades.length === 0
                            ? "No options available"
                            : "Select an option"}
                    </option>
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                  {errors.grade && (
                    <p className="mt-1 text-xs text-rose-600">{errors.grade}</p>
                  )}
                </div>

                {/* Subjects */}
                <div>
                  <label className={labelClass}>Subjects *</label>
                  {loadingSubjects ? (
                    <p className="text-xs text-slate-500">Loading subjects...</p>
                  ) : subjects.length === 0 ? (
                    <p className="text-xs text-slate-500">No subjects available.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {subjects.map((subject) => {
                        const subjectId = String(getId(subject));
                        const isChecked = formData.subjects.includes(subjectId);
                        return (
                          <label
                            key={subjectId}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                              isChecked
                                ? "border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleSubjectChange(subjectId)}
                              disabled={submitting}
                              className="h-4 w-4 rounded accent-blue-600"
                            />
                            <span className="truncate">{getName(subject)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {errors.subjects && (
                    <p className="mt-1 text-xs text-rose-600">{errors.subjects}</p>
                  )}
                </div>

                {/* Tuition Schedule section */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock size={17} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Tuition Schedule *
                    </h3>
                  </div>

                  {/* Hourly Tuition Fee */}
                  <div className="mb-4">
                    <label className={labelClass} htmlFor="hourlyRate">
                      Hourly Tuition Fee (₹/hour) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-slate-400">
                        ₹
                      </span>
                      <input
                        id="hourlyRate"
                        name="hourlyRate"
                        type="number"
                        min="1"
                        step="any"
                        value={hourlyRate}
                        onChange={(e) => {
                          setHourlyRate(e.target.value);
                          setErrors((prev) => ({ ...prev, hourlyRate: "" }));
                        }}
                        placeholder="Enter hourly fee (e.g., 300)"
                        className={`${inputClass} pl-8`}
                        disabled={submitting}
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      This rate will be used to calculate the tutor&apos;s earnings from verified teaching hours.
                    </p>
                    {errors.hourlyRate && (
                      <p className="mt-1 text-xs text-rose-600">{errors.hourlyRate}</p>
                    )}
                  </div>

                  {/* Recurring Class Days */}
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Class Days *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "MONDAY",
                        "TUESDAY",
                        "WEDNESDAY",
                        "THURSDAY",
                        "FRIDAY",
                        "SATURDAY",
                        "SUNDAY",
                      ].map((day) => {
                        const selected = daysOfWeek.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              setDaysOfWeek((previous) =>
                                selected
                                  ? previous.filter((item) => item !== day)
                                  : [...previous, day]
                              );
                              setErrors((prev) => ({ ...prev, daysOfWeek: "" }));
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                              selected
                                ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {day.charAt(0) + day.slice(1, 3).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                    {errors.daysOfWeek && (
                      <p className="mt-1 text-xs text-rose-600">{errors.daysOfWeek}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {/* Start Time */}
                    <div>
                      <label
                        htmlFor="startTime"
                        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600"
                      >
                        Start Time *
                      </label>
                      <input
                        id="startTime"
                        type="time"
                        value={startTime}
                        disabled={submitting}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          setErrors((prev) => ({ ...prev, startTime: "", endTime: "" }));
                        }}
                        className={inputClass}
                        required
                      />
                      {errors.startTime && (
                        <p className="mt-1 text-xs text-rose-600">{errors.startTime}</p>
                      )}
                    </div>

                    {/* End Time */}
                    <div>
                      <label
                        htmlFor="endTime"
                        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600"
                      >
                        End Time *
                      </label>
                      <input
                        id="endTime"
                        type="time"
                        value={endTime}
                        disabled={submitting}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          setErrors((prev) => ({ ...prev, endTime: "" }));
                        }}
                        className={inputClass}
                        required
                      />
                      {errors.endTime && (
                        <p className="mt-1 text-xs text-rose-600">{errors.endTime}</p>
                      )}
                    </div>

                    {/* Effective From */}
                    <div>
                      <label
                        htmlFor="effectiveFrom"
                        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600"
                      >
                        Effective From *
                      </label>
                      <input
                        id="effectiveFrom"
                        type="date"
                        value={effectiveFrom}
                        disabled={submitting}
                        onChange={(e) => {
                          setEffectiveFrom(e.target.value);
                          setErrors((prev) => ({ ...prev, effectiveFrom: "", effectiveTo: "" }));
                        }}
                        className={inputClass}
                        required
                      />
                      {errors.effectiveFrom && (
                        <p className="mt-1 text-xs text-rose-600">{errors.effectiveFrom}</p>
                      )}
                    </div>

                    {/* Effective To */}
                    <div>
                      <label
                        htmlFor="effectiveTo"
                        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600"
                      >
                        Effective To
                        <span className="ml-1 font-normal text-slate-400">
                          (Optional)
                        </span>
                      </label>
                      <input
                        id="effectiveTo"
                        type="date"
                        min={effectiveFrom || undefined}
                        value={effectiveTo}
                        disabled={submitting}
                        onChange={(e) => {
                          setEffectiveTo(e.target.value);
                          setErrors((prev) => ({ ...prev, effectiveTo: "" }));
                        }}
                        className={inputClass}
                      />
                      {errors.effectiveTo && (
                        <p className="mt-1 text-xs text-rose-600">{errors.effectiveTo}</p>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Schedules are submitted with &quot;Pending&quot; status and become active once accepted by your tutor.
                  </p>
                </div>

                {message && (
                  <p className="rounded-xl bg-blue-50 p-3.5 text-xs sm:text-sm text-blue-700 border border-blue-200">
                    {message}
                  </p>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                >
                  {submitting ? "Saving..." : "Save Child"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Plus,
  Users,
  X,
  Clock,
  Trash2,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  Pencil,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

import {
  getAllChildrensAPI,
  getStaticEducationCategoryAPI,
  getStaticSubjectsDataAPI,
  validateTutorAPI,
  saveChildAPI,
  updateChildAPI,
  updateScheduleAPI,
  deleteChildAPI,
  getEducationCategoryByIdAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
  getTutorByIdAPI,
  saveTempScheduleAPI,
  getSchedulesAPI,
  getScheduleByChildIdAPI,
} from "../../API/api.js";

const API = `${import.meta.env.VITE_API_BASE_URL}/static_data`;

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

function MyChildrenSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50/70 border border-blue-100 rounded-xl px-3.5 py-2.5 w-fit">
        <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span>Loading children & schedules...</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs animate-pulse"
          >
            <div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 sm:w-36 rounded-md bg-slate-200" />
                    <div className="h-3 w-20 rounded-md bg-slate-100" />
                  </div>
                </div>
                <div className="h-6 w-24 rounded-full bg-slate-200 shrink-0" />
              </div>

              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="h-14 rounded-xl bg-slate-100" />
                  <div className="h-14 rounded-xl bg-slate-100" />
                </div>
                <div className="h-12 rounded-xl bg-slate-100" />
                <div className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="flex gap-1.5">
                    <div className="h-6 w-16 rounded-lg bg-slate-100" />
                    <div className="h-6 w-20 rounded-lg bg-slate-100" />
                  </div>
                </div>
                <div className="h-28 rounded-xl bg-slate-100 mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyChildren() {
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childToDelete, setChildToDelete] = useState(null);
  const [deletingChild, setDeletingChild] = useState(false);
  const [editingChild, setEditingChild] = useState(null);

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

  // Edit section focus ("all", "child", "tutor", "schedule")
  const [editSection, setEditSection] = useState("all");
  const [verifyingTutor, setVerifyingTutor] = useState(false);
  const [verifiedTutorInfo, setVerifiedTutorInfo] = useState(null);

  async function handleVerifyTutor(emailToVerify) {
    const targetEmail = (emailToVerify || formData.tutorEmail).trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setErrors((prev) => ({ ...prev, tutorEmail: "Enter a valid email before verifying." }));
      return;
    }
    setVerifyingTutor(true);
    try {
      const res = await validateTutorAPI(targetEmail);
      if (res.ok) {
        const data = await res.json();
        let tName = "";
        if (data.tutor_id) {
          try {
            const tRes = await getTutorByIdAPI(data.tutor_id);
            if (tRes.ok) {
              const tData = await tRes.json();
              tName = tData.fullName ?? tData.name ?? "";
            }
          } catch {
            // fallback
          }
        }
        setVerifiedTutorInfo({
          tutorId: data.tutor_id,
          name: tName || "Registered Tutor",
          email: targetEmail,
        });
        setErrors((prev) => ({ ...prev, tutorEmail: "" }));
      } else {
        setVerifiedTutorInfo(null);
        setErrors((prev) => ({ ...prev, tutorEmail: "No registered tutor found with this email." }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, tutorEmail: "Network error while checking tutor." }));
    } finally {
      setVerifyingTutor(false);
    }
  }

  function handleOpenEdit(child, initialSection = "all") {
    setEditingChild(child);
    setEditSection(initialSection);
    const catId = child.rawEducationCategoryId || child.educationCategory || "";
    const matchedCat = categories.find(
      (c) => String(getId(c)) === String(catId) || getName(c) === child.educationCategory
    );
    const educationCategory = matchedCat ? getId(matchedCat) : catId;

    const email = child.tutorEmail || child.schedule?.tutorEmail || "";
    setFormData({
      studentName: child.name || "",
      tutorEmail: email,
      educationCategory: educationCategory,
      board: child.rawBoardId || child.board || "",
      grade: child.grade || "",
      subjects: child.rawSubjectIds || child.subjectIds || [],
    });

    if (email) {
      setVerifiedTutorInfo({
        tutorId: child.tutorId,
        name: child.tutorName || "Current Tutor",
        email: email,
      });
    } else {
      setVerifiedTutorInfo(null);
    }

    if (child.schedule) {
      setDaysOfWeek(Array.isArray(child.schedule.daysOfWeek) ? child.schedule.daysOfWeek : []);
      setStartTime(child.schedule.startTime || "");
      setEndTime(child.schedule.endTime || "");
      setEffectiveFrom(child.schedule.effectiveFrom || "");
      setEffectiveTo(child.schedule.effectiveTo || "");
      setHourlyRate(
        child.schedule.hourlyRate != null ? String(child.schedule.hourlyRate) : ""
      );
    } else {
      setDaysOfWeek([]);
      setStartTime("");
      setEndTime("");
      setEffectiveFrom("");
      setEffectiveTo("");
      setHourlyRate("");
    }

    setErrors({});
    setMessage("");
    setShowForm(true);
  }

  async function handleDeleteChild(childId, childName) {
    setChildToDelete({ id: childId, name: childName });
  }

  async function confirmDeleteChild() {
    if (!childToDelete) return;
    setDeletingChild(true);
    try {
      const res = await deleteChildAPI(childToDelete.id);
      if (res.ok) {
        setChildren((prev) => prev.filter((c) => String(c.id ?? c._id) !== String(childToDelete.id)));
        setChildToDelete(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete child record.");
      }
    } catch (err) {
      console.error("Delete child failed:", err);
      alert("Network error while deleting child.");
    } finally {
      setDeletingChild(false);
    }
  }

  // Load children with their enriched static names and schedules
  async function loadChildrensData() {
    setLoadingChildren(true);
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
        const rawData = await res.json();
        const rawList = Array.isArray(rawData) ? rawData : [];
        const seenChildIds = new Set();
        const seenChildNames = new Set();
        const data = rawList.filter((c) => {
          const id = String(c.id ?? c._id ?? "");
          const normName = (c.name || "").trim().toLowerCase();
          if (id && seenChildIds.has(id)) return false;
          if (normName && seenChildNames.has(normName)) return false;
          if (id) seenChildIds.add(id);
          if (normName) seenChildNames.add(normName);
          return true;
        });
        const updatedChildren = await Promise.all(
          data.map(async (child) => {
            const childId = String(child.id ?? child._id ?? "");
            let categoryName = child.educationCategory;
            let tutorName = child.tutorName;
            let tutorEmail = child.tutorEmail || "";
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
                  tutorName = tutorData.fullName ?? tutorData.name ?? tutorName;
                  tutorEmail = tutorData.email || tutorData.user?.email || tutorEmail;
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

            if (!tutorEmail && matchedSchedule?.tutorEmail) {
              tutorEmail = matchedSchedule.tutorEmail;
            }

            return {
              ...child,
              rawEducationCategoryId: child.educationCategory,
              rawBoardId: child.board,
              rawSubjectIds: Array.isArray(child.subjectIds) ? child.subjectIds : [],
              educationCategory: categoryName,
              tutorName: tutorName,
              tutorEmail: tutorEmail,
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
    } finally {
      setLoadingChildren(false);
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
    setEditingChild(null);
    setEditSection("all");
    setVerifiedTutorInfo(null);
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
      setEditSection("all");
      return;
    }

    setSubmitting(true);

    try {
      if (editingChild) {
        // === EDIT EXISTING CHILD FLOW ===
        const childId = editingChild.id ?? editingChild._id;
        let tutorId = editingChild.tutorId;
        let parentId = editingChild.parentId;

        const originalTutorEmail = (editingChild.tutorEmail || "").trim().toLowerCase();
        if (tutorEmail !== originalTutorEmail || !tutorId) {
          try {
            const tutorRes = await validateTutorAPI(tutorEmail);
            if (tutorRes.ok) {
              const data = await tutorRes.json();
              tutorId = data.tutor_id || tutorId;
              parentId = data.parent_id || parentId;
            } else {
              const err = await tutorRes.json().catch(() => ({}));
              setErrors({
                tutorEmail:
                  err.error ||
                  err.message ||
                  "No tutor found with this email. Please check that this email belongs to a registered tutor.",
              });
              setEditSection("tutor");
              setSubmitting(false);
              return;
            }
          } catch {
            setErrors({
              tutorEmail: "Failed to verify tutor email. Please check your connection.",
            });
            setEditSection("tutor");
            setSubmitting(false);
            return;
          }
        }

        const childrenPayload = {
          id: childId,
          _id: childId,
          name: formData.studentName.trim(),
          parentId: parentId,
          tutorId: tutorId,
          grade: formData.grade,
          subjectIds: formData.subjects,
          board: formData.board || null,
          educationCategory: formData.educationCategory,
        };

        const updateRes = await updateChildAPI(childId, childrenPayload);
        if (!updateRes.ok) {
          await saveChildAPI(childrenPayload).catch(() => null);
        }

        if (daysOfWeek.length > 0 && startTime && endTime && effectiveFrom && hourlyRate) {
          const schedulePayload = {
            id: editingChild.schedule?.id ?? editingChild.schedule?._id,
            childId: childId,
            parentId: parentId,
            tutorId: tutorId,
            daysOfWeek: daysOfWeek,
            startTime: startTime,
            endTime: endTime,
            effectiveFrom: effectiveFrom,
            effectiveTo: effectiveTo || null,
            hourlyRate: Number(hourlyRate),
            status: editingChild.schedule?.status || "PENDING",
          };

          try {
            const schedRes = await saveTempScheduleAPI(schedulePayload);
            if (!schedRes.ok && schedulePayload.id) {
              await updateScheduleAPI(schedulePayload.id, schedulePayload).catch(() => null);
            }
          } catch (schedErr) {
            console.warn("Schedule save error:", schedErr);
          }
        }

        handleClose();
        await loadChildrensData();
        return;
      }
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

      {/* Loading state (Issue 4) */}
      {loadingChildren ? (
        <MyChildrenSkeleton />
      ) : children.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-14 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-xs">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {children.map((child) => {
            const schedule = child.schedule;
            const isPending = schedule?.status === "PENDING";
            const isActive = schedule?.status === "ACTIVE" || schedule?.status === "APPROVED";

            return (
              <div
                key={child.id ?? child._id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Header: Responsive on Phones and Laptop */}
                  <div className="mb-3.5 flex flex-col xs:flex-row sm:flex-col lg:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1 w-full">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 font-bold text-base shadow-xs">
                        {child.name?.charAt(0)?.toUpperCase() ?? "S"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-slate-900 text-base leading-snug break-words">
                          {child.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {child.grade && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              <GraduationCap size={12} className="text-slate-500 shrink-0" />
                              <span className="truncate max-w-[120px]">{child.grade}</span>
                            </span>
                          )}
                          {child.board && (
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 truncate max-w-[100px]">
                              {child.board}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status badge & Actions */}
                    <div className="flex items-center justify-between w-full xs:w-auto sm:w-full lg:w-auto pt-1 xs:pt-0 border-t xs:border-t-0 sm:border-t lg:border-t-0 border-slate-100 gap-2 shrink-0">
                      {schedule ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border shadow-2xs ${
                            isPending
                              ? "border-amber-200/80 bg-amber-50 text-amber-800"
                              : isActive
                              ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPending
                                ? "bg-amber-500 animate-pulse"
                                : isActive
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>{isPending ? "Pending Approval" : isActive ? "Active" : schedule.status}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                          No Schedule
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(child)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Child Details"
                          aria-label={`Edit ${child.name}`}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteChild(child.id ?? child._id, child.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Child Record"
                          aria-label={`Delete ${child.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-3 border-t border-slate-100 pt-3.5 text-sm">
                    {/* Category & Board grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Education Category
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5 break-words">
                          {child.educationCategory || "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Board / Curriculum
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5 break-words">
                          {child.board || "Not specified"}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Tutor */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Assigned Tutor
                        </p>
                        <p className="font-semibold text-slate-900 mt-0.5 truncate flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                          <span className={child.tutorName ? "text-slate-900" : "text-slate-400 italic"}>
                            {child.tutorName || "No tutor assigned"}
                          </span>
                        </p>
                        {child.tutorEmail && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                            {child.tutorEmail}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(child, "tutor")}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700 transition active:scale-95"
                        title="Change assigned tutor"
                      >
                        <UserCheck size={12} />
                        <span>Change</span>
                      </button>
                    </div>

                    {/* Subjects */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Enrolled Subjects
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(child.subjects ?? []).length > 0 ? (
                          child.subjects.map((name, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
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
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-3.5 mt-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                          <Clock size={14} className="text-blue-600" />
                          <span>Weekly Schedule</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {schedule?.hourlyRate != null && schedule.hourlyRate > 0 && (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700 shadow-2xs">
                              ₹{schedule.hourlyRate}/hr
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(child, "schedule")}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-2xs transition active:scale-95"
                            title="Edit schedule timings and class days"
                          >
                            <Pencil size={11} className="text-blue-600" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>

                      {schedule ? (
                        <div className="space-y-2 text-xs">
                          {/* Class Days Pills */}
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                              Class Days
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => {
                                const isClassDay = Array.isArray(schedule.daysOfWeek) &&
                                  schedule.daysOfWeek.map((day) => String(day).toUpperCase()).includes(d);
                                const shortDay = d.slice(0, 3);
                                return (
                                  <span
                                    key={d}
                                    className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition ${
                                      isClassDay
                                        ? "bg-blue-600 text-white shadow-2xs"
                                        : "bg-slate-100 text-slate-400 opacity-60"
                                    }`}
                                  >
                                    {shortDay}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Timings & Dates */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                Timings (IST)
                              </span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                Effective Dates
                              </span>
                              <span className="font-medium text-slate-700 text-xs">
                                {formatDate(schedule.effectiveFrom)} →{" "}
                                {schedule.effectiveTo ? formatDate(schedule.effectiveTo) : "Ongoing"}
                              </span>
                            </div>
                          </div>

                          {isPending && (
                            <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                              <span>Awaiting tutor confirmation</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-1">
                          <p className="text-xs italic text-slate-400">No schedule assigned yet</p>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(child, "schedule")}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition active:scale-95"
                          >
                            <Plus size={12} />
                            <span>Add Schedule</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons: Edit and Delete */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(child, "all")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition active:scale-95"
                    >
                      <Pencil size={13} className="text-slate-500" />
                      <span>Edit Child & Schedule</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteChild(child.id ?? child._id, child.name)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition active:scale-95"
                    >
                      <Trash2 size={13} className="text-rose-500" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Child Confirmation Dialog */}
      {childToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <Trash2 size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Child Record?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{childToDelete.name}</span>? This will also remove any associated schedules.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingChild}
                onClick={() => setChildToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingChild}
                onClick={confirmDeleteChild}
                className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {deletingChild ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add child modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="relative my-auto flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>{editingChild ? `Edit Child & Tuition Schedule` : "Add Child"}</span>
                  {editingChild && (
                    <span className="rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      Edit Mode
                    </span>
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editingChild
                    ? "Modify student details, reassign tutor, or update recurring tuition schedule."
                    : "Enter student details, assign a tutor, and set recurring tuition timings."}
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

            {/* Quick Section Tabs when editing */}
            {editingChild && (
              <div className="flex items-center gap-1.5 border-b border-slate-200/80 bg-slate-50/80 px-5 py-2.5 overflow-x-auto text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setEditSection("all")}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap ${
                    editSection === "all"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  All Details
                </button>
                <button
                  type="button"
                  onClick={() => setEditSection("child")}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    editSection === "child"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <GraduationCap size={13} />
                  <span>Student Info</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditSection("tutor")}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    editSection === "tutor"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <UserCheck size={13} />
                  <span>Change Tutor</span>
                  {editingChild.tutorName && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      editSection === "tutor" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"
                    }`}>
                      {editingChild.tutorName.split(" ")[0]}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditSection("schedule")}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    editSection === "schedule"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <Clock size={13} />
                  <span>Change Schedule</span>
                  {editingChild.schedule && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      editSection === "schedule" ? "bg-blue-500 text-white" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {editingChild.schedule.status || "Set"}
                    </span>
                  )}
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                {/* 1. Student & Academics Section */}
                {(!editingChild || editSection === "all" || editSection === "child") && (
                  <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                      <GraduationCap size={16} className="text-blue-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Student & Academic Details
                      </h3>
                    </div>

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
                  </div>
                )}

                {/* 2. Tutor & Tutor Change Section */}
                {(!editingChild || editSection === "all" || editSection === "tutor") && (
                  <div className="space-y-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-blue-100">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-blue-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          {editingChild ? "Change Assigned Tutor" : "Assigned Tutor"}
                        </h3>
                      </div>
                      {editingChild?.tutorName && (
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Current: {editingChild.tutorName}
                        </span>
                      )}
                    </div>

                    {editingChild && (
                      <div className="rounded-xl border border-blue-100 bg-white p-3 text-xs space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Currently Assigned
                          </span>
                          <span className="font-bold text-blue-700">{editingChild.tutorName || "None"}</span>
                        </div>
                        {editingChild.tutorEmail ? (
                          <p className="text-slate-600 text-[11px]">
                            Registered Email: <span className="font-mono text-slate-800">{editingChild.tutorEmail}</span>
                          </p>
                        ) : null}
                        <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          To change this student&apos;s tutor, enter the new tutor&apos;s registered email address below. You can verify it first before saving.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className={labelClass} htmlFor="tutorEmail">
                        {editingChild ? "Tutor Email (Enter new email to change tutor) *" : "Tutor email *"}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="tutorEmail"
                          name="tutorEmail"
                          type="email"
                          value={formData.tutorEmail}
                          onChange={handleChange}
                          placeholder="Enter registered tutor's email"
                          className={inputClass}
                          autoComplete="email"
                          disabled={submitting}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyTutor(formData.tutorEmail)}
                          disabled={submitting || verifyingTutor || !formData.tutorEmail}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs transition disabled:opacity-50 active:scale-95"
                          title="Verify tutor exists on ClassSure"
                        >
                          {verifyingTutor ? (
                            <>
                              <RefreshCw size={13} className="animate-spin text-blue-600" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={13} />
                              <span>Verify</span>
                            </>
                          )}
                        </button>
                      </div>

                      {verifiedTutorInfo && (
                        <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5 text-xs text-emerald-800 animate-in fade-in">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-semibold">Verified ClassSure Tutor:</span>{" "}
                            <span>{verifiedTutorInfo.name}</span>{" "}
                            <span className="font-mono text-[11px] text-emerald-700">({verifiedTutorInfo.email})</span>
                          </div>
                        </div>
                      )}

                      {errors.tutorEmail && (
                        <p className="mt-1 text-xs text-rose-600">{errors.tutorEmail}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Enter the email the tutor used to register on ClassSure.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Tuition Schedule Section */}
                {(!editingChild || editSection === "all" || editSection === "schedule") && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-blue-100">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          {editingChild ? "Edit Tuition Schedule & Timings" : "Tuition Schedule *"}
                        </h3>
                      </div>
                      {editingChild?.schedule && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          editingChild.schedule.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            editingChild.schedule.status === "ACCEPTED" ? "bg-emerald-600" : "bg-amber-500 animate-pulse"
                          }`} />
                          Schedule: {editingChild.schedule.status || "PENDING"}
                        </span>
                      )}
                    </div>

                    {/* Hourly Tuition Fee */}
                    <div>
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
                    <div>
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
                )}

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
                  {submitting
                    ? editingChild
                      ? "Updating..."
                      : "Saving..."
                    : editingChild
                    ? "Save Changes"
                    : "Save Child"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

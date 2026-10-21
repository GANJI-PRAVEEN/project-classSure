import { useEffect, useState } from "react";

import { Plus, Users, X, ChevronRight } from "lucide-react";

import {
  getAllChildrensAPI,
  getStaticEducationCategoryAPI,
  getStaticSubjectsDataAPI,
  validateTutorAPI,
  saveChildAPI,
  getEducationCategoryByIdAPI,
  getSubjectsByIdsAPI,
  getBoardByIdAPI,
  getTutorByIdAPI,
  saveTempScheduleAPI,
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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState([]);

  // Load education categories and subjects.

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

        if (!categoryResponse.ok) {
          throw new Error(
            `Education categories request failed: ${categoryResponse.status}`,
          );
        }

        if (!subjectResponse.ok) {
          throw new Error(`Subjects request failed: ${subjectResponse.status}`);
        }

        const [categoryData, subjectData] = await Promise.all([
          categoryResponse.json(),

          subjectResponse.json(),
        ]);

        setCategories(
          Array.isArray(categoryData)
            ? categoryData.filter((item) => item.active !== false)
            : [],
        );

        setSubjects(
          Array.isArray(subjectData)
            ? subjectData.filter((item) => item.active !== false)
            : [],
        );
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

    async function loadChildrensData() {
      try {
        const res = await getAllChildrensAPI();

        if (res.ok) {
          const data = await res.json();
          console.log("DATA", data);
          const updatedChildren = await Promise.all(
            data.map(async (child) => {
              const category = await getEducationCategoryByIdAPI(
                child.educationCategory,
              );
              const tutorRes = await getTutorByIdAPI(child.tutorId);
              const board = await getBoardByIdAPI(child.board);
              const categoryData = await category.json();
              const boardData = await board.json();
              const tutorData = await tutorRes.json();
              console.log("Tutor Data :", tutorData);
              console.log("category object name", categoryData);
              console.log("board object name", boardData);

              const subjects = await getSubjectsByIdsAPI(child.subjectIds);
              const subjectsData = await subjects.json();
              console.log("subject object name", subjectsData);
              return {
                ...child,

                educationCategory: categoryData.name,
                tutorName: tutorData.fullName,
                board: boardData.name,

                subjects: subjectsData.map((subject) => subject.name),
              };
            }),
          );

          setChildren(updatedChildren);
        }
      } catch (error) {
        console.log("Fetching children failed", error);
      }
    }

    loadInitialData();

    loadChildrensData();

    return () => controller.abort();
  }, []);

  const selectedCategory = categories.find(
    (item) => String(getId(item)) === String(formData.educationCategory),
  );

  const categoryName = getName(selectedCategory);

  const isCompetitiveExam =
    normalizeCategory(categoryName) === "COMPETITIVE_EXAMS";

  // Load boards and grades when the education category changes.

  useEffect(() => {
    if (!formData.educationCategory || !selectedCategory) {
      setBoards([]);

      setGrades([]);

      setLoadingBoards(false);

      setLoadingGrades(false);

      return;
    }

    const controller = new AbortController();

    async function loadCategoryData() {
      setBoards([]);

      setGrades([]);

      setErrors((previous) => ({
        ...previous,

        boards: "",

        grades: "",
      }));

      const category = normalizeCategory(getName(selectedCategory));

      // Load grades using the category name.

      setLoadingGrades(true);

      try {
        const gradesUrl = `${API}/grades-data?category=${encodeURIComponent(category)}`;

        const gradeResponse = await fetch(gradesUrl, {
          signal: controller.signal,
        });

        if (!gradeResponse.ok) {
          throw new Error(`Grades request failed: ${gradeResponse.status}`);
        }

        const gradeData = await gradeResponse.json();

        setGrades(Array.isArray(gradeData) ? gradeData : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Grades fetch error:", error);

          setErrors((previous) => ({
            ...previous,

            grades: error.message,
          }));
        }
      } finally {
        setLoadingGrades(false);
      }

      // Assumes your backend accepts educationCategoryId.

      // Change this URL if your actual controller uses another parameter.

      setLoadingBoards(true);

      try {
        const boardsUrl = `${API}/boards-data?educationCategoryId=${encodeURIComponent(
          formData.educationCategory,
        )}`;

        const boardResponse = await fetch(boardsUrl, {
          signal: controller.signal,
        });

        if (!boardResponse.ok) {
          throw new Error(`Boards request failed: ${boardResponse.status}`);
        }

        const boardData = await boardResponse.json();

        setBoards(
          Array.isArray(boardData)
            ? boardData.filter((item) => item.active !== false)
            : [],
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Boards fetch error:", error);

          setErrors((previous) => ({
            ...previous,

            boards: error.message,
          }));
        }
      } finally {
        setLoadingBoards(false);
      }
    }

    loadCategoryData();

    return () => controller.abort();
  }, [formData.educationCategory, categories, selectedCategory]);

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

    setErrors({});

    setMessage("");

    setBoards([]);

    setGrades([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

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

    // 4. Validate grade

    if (!formData.grade) {
      newErrors.grade = "Select a grade or year.";
    }

    // 5. Validate subjects

    if (formData.subjects.length === 0) {
      newErrors.subjects = "Select at least one subject.";
    }

    // 6. Validate board

    if (boards.length > 0 && !isCompetitiveExam && !formData.board) {
      newErrors.board = "Select a board.";
    }
    // 7. Validate schedule timings
    if (!startTime) {
      newErrors.startTime = "Select a start time.";
    }

    if (!endTime) {
      newErrors.endTime = "Select an end time.";
    } else if (startTime && endTime <= startTime) {
      newErrors.endTime = "End time must be later than start time.";
    }

    // 8. Validate effective dates
    if (!effectiveFrom) {
      newErrors.effectiveFrom = "Select the schedule start date.";
    }

    if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) {
      newErrors.effectiveTo =
        "End date must be on or after the effective-from date.";
    }

    // Stop if frontend validation fails

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      return;
    }

    // 7. Verify tutor using Spring Boot

    try {
      setSubmitting(true);

      const response = await validateTutorAPI(tutorEmail);

      // Handle backend errors

      if (!response.ok) {
        console.log("response ", response);

        // const errorMessage = await response.json().;

        setErrors({
          tutorEmail: "Tutor not found or this user is not a tutor.",
        });

        return;
      }

      // 8. Get verified tutor ID

      const data = await response.json();

      const tutorId = data.tutor_id;

      const parentId = data.parent_id;

      const msg = data.message;

      console.log("Tutor verified successfully.");

      console.log("Tutor ID:", tutorId);

      console.log("Parent ID:", parentId);

      console.log("Message ", msg);

      // Child creation will be implemented next.

      console.log("Validated child form:", {
        ...formData,

        tutorId,

        parentId,
      });

      const childrenPayload = {
        name: formData.studentName,

        parentId: parentId,

        tutorId: tutorId,

        grade: formData.grade,

        subjectIds: formData.subjects,

        board: formData.board,

        educationCategory: formData.educationCategory,
      };

      try {
        const addChildResponse = await saveChildAPI(childrenPayload);

        if (!addChildResponse.ok) {
          console.log("Failed to save child:", addChildResponse.status);
          setMessage("Failed to save child. Please try again.");
          return;
        }

        const savedChild = await addChildResponse.json();

        console.log("Child saved:", savedChild);

        // Create a separate payload for the schedules collection
        const schedulePayload = {
          childId: savedChild.id ?? savedChild._id,
          parentId: parentId,
          tutorId: tutorId,
          daysOfWeek: daysOfWeek,
          startTime: startTime,
          endTime: endTime,
          effectiveFrom: effectiveFrom,
          effectiveTo: effectiveTo || null,
          status: "PENDING",
        };

        console.log("Schedule payload:", schedulePayload);

        const scheduleResponse = await saveTempScheduleAPI(schedulePayload);

        if (!scheduleResponse.ok) {
          console.error("Failed to save schedule:", scheduleResponse.status);

          setMessage(
            "Child saved, but the schedule request could not be created.",
          );
          return;
        }

        const savedSchedule = await scheduleResponse.json();

        console.log("Schedule saved:", savedSchedule);

        setMessage(
          "Child saved successfully. Schedule request sent to the tutor for approval.",
        );
      } catch (error) {
        console.error("Error saving child or schedule:", error);

        setMessage("Unable to save the child or schedule. Please try again.");
      }
    } catch (error) {
      console.error("Tutor verification failed:", error);

      setMessage("Unable to connect to the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50";

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Page header */}

        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              My Children
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage student details and tutor assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormData(initialFormData);

              setErrors({});

              setMessage("");

              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Child
          </button>
        </div>

        {errors.initial && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errors.initial}
          </p>
        )}

        {/* Children list */}

        {children.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Users size={28} className="mx-auto mb-3 text-blue-600" />

            <h2 className="font-semibold text-gray-900">
              No children added yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Add your first child to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <div
                key={child.id ?? child._id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-600">
                    {child.name?.charAt(0)?.toUpperCase() ?? "S"}
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {child.name}
                    </h2>

                    <p className="text-sm text-gray-500">{child.grade}</p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs text-gray-500">Education category</p>

                    <p className="text-sm font-medium text-gray-800">
                      {child.educationCategory || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Board</p>

                    <p className="text-sm font-medium text-gray-800">
                      {child.board || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Assigned Tutor</p>
                    <p className="text-sm font-medium text-gray-800">
                      {child.tutorName || "No tutor assigned"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs text-gray-500">Subjects</p>

                    <div className="flex flex-wrap gap-2">
                      {(child.subjects ?? []).map((name, id) => (
                        <span
                          key={id}
                          className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add child modal */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
          <div className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Child
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the student's details and tutor information.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close form"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
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
                    required
                  />

                  {errors.studentName && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.studentName}
                    </p>
                  )}
                </div>

                {/* Compulsory tutor email */}

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
                    required
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Enter the email the tutor used to register on ClassSure.
                  </p>

                  {errors.tutorEmail && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.tutorEmail}
                    </p>
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
                    disabled={loadingCategories}
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
                    <p className="mt-1 text-xs text-red-600">
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
                      disabled={loadingBoards || boards.length === 0}
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

                    {errors.boards && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.boards}
                      </p>
                    )}

                    {errors.board && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.board}
                      </p>
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
                    disabled={!formData.educationCategory || loadingGrades}
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

                  {errors.grades && (
                    <p className="mt-1 text-xs text-red-600">{errors.grades}</p>
                  )}

                  {errors.grade && (
                    <p className="mt-1 text-xs text-red-600">{errors.grade}</p>
                  )}
                </div>

                {/* Subjects */}

                <div>
                  <label className={labelClass}>Subjects *</label>

                  {loadingSubjects ? (
                    <p className="text-sm text-gray-500">Loading subjects...</p>
                  ) : subjects.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No subjects available.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {subjects.map((subject) => {
                        const subjectId = String(getId(subject));

                        return (
                          <label
                            key={subjectId}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={formData.subjects.includes(subjectId)}
                              onChange={() => handleSubjectChange(subjectId)}
                              className="accent-blue-600"
                            />

                            {getName(subject)}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {errors.subjects && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.subjects}
                    </p>
                  )}
                </div>

                {message && (
                  <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    {message}
                  </p>
                )}

                {/* Tuition Schedule */}
                <div className="border-t border-gray-200 px-6 py-5">
                  <h3 className="mb-4 text-base font-semibold text-gray-900">
                    Tuition Schedule
                  </h3>

                  {/* Class Days */}
                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Class Days
                    </label>

                    <div className="flex flex-wrap gap-2">
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
                            onClick={() => {
                              setDaysOfWeek((previous) =>
                                selected
                                  ? previous.filter((item) => item !== day)
                                  : [...previous, day],
                              );
                            }}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
                            }`}
                          >
                            {day.charAt(0) + day.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>

                    {errors.daysOfWeek && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.daysOfWeek}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Start Time */}
                    <div className="min-w-0">
                      <label
                        htmlFor="startTime"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Start Time
                      </label>
                      <input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* End Time */}
                    <div className="min-w-0">
                      <label
                        htmlFor="endTime"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        End Time
                      </label>
                      <input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Effective From */}
                    <div className="min-w-0">
                      <label
                        htmlFor="effectiveFrom"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Effective From
                      </label>
                      <input
                        id="effectiveFrom"
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        required
                        className="block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Effective To */}
                    <div className="min-w-0">
                      <label
                        htmlFor="effectiveTo"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Effective To
                        <span className="ml-1 font-normal text-gray-400">
                          (Optional)
                        </span>
                      </label>
                      <input
                        id="effectiveTo"
                        type="date"
                        min={effectiveFrom || undefined}
                        value={effectiveTo}
                        onChange={(e) => setEffectiveTo(e.target.value)}
                        className="block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    These timings apply to the selected recurring class days.
                    Leave Effective To empty for an ongoing schedule.
                  </p>
                </div>
              </div>

              {/* Modal footer */}

              <div className="flex justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

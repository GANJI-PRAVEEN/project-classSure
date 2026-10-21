import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8080";

export default function TutorSignup() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    degreeId: "",
    about: "",
  });

  const [degrees, setDegrees] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectKeys, setSelectedSubjectKeys] = useState(
    () => new Set(),
  );

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load active degrees and subjects when this component mounts.
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      setError("");

      try {
        const [degreeResponse, subjectResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/static_data/degrees-data`),
          fetch(`${API_BASE_URL}/static_data/subjects-data`),
        ]);

        if (!degreeResponse.ok || !subjectResponse.ok) {
          throw new Error(
            "Could not load degrees or subjects. Please try again.",
          );
        }

        const degreeData = await degreeResponse.json();
        const subjectData = await subjectResponse.json();

        setDegrees(degreeData.filter((degree) => degree.active === true));

        const normalizedSubjects = subjectData
          .filter((subject) => subject.active === true)
          .map((subject, index) => ({
            ...subject,
            mongoId: String(subject.id ?? subject._id ?? ""),
            selectionKey: `subject-option-${index}`,
          }));

        setSubjects(normalizedSubjects);
      } catch (err) {
        setError(err.message || "Failed to load registration data.");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Update form fields.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // Toggle the selected subject.
  const handleSubjectChange = (selectionKey) => {
    setSelectedSubjectKeys((previousKeys) => {
      const updatedKeys = new Set(previousKeys);

      if (updatedKeys.has(selectionKey)) {
        updatedKeys.delete(selectionKey);
      } else {
        updatedKeys.add(selectionKey);
      }

      return updatedKeys;
    });
  };

  // Submit tutor registration.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!form.degreeId) {
      setError("Please select your qualification.");
      return;
    }

    const selectedSubjects = subjects.filter((subject) =>
      selectedSubjectKeys.has(subject.selectionKey),
    );

    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    if (selectedSubjects.some((subject) => !subject.mongoId)) {
      setError(
        "A subject is missing its ID. Check your subjects API response.",
      );
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      degreeId: String(form.degreeId),
      subjectIds: selectedSubjects.map((subject) => subject.mongoId),
      about: form.about.trim(),
      role: "TUTOR",
    };

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        const message = responseText.toLowerCase();

        if (
          response.status === 409 ||
          message.includes("duplicate key") ||
          message.includes("e11000") ||
          message.includes("email already exists") ||
          message.includes("email already registered")
        ) {
          throw new Error(
            "This email is already registered. Please log in or use another email.",
          );
        }

        throw new Error(responseText || `Signup failed (${response.status}).`);
      }

      setSuccess(responseText || "Tutor account created successfully!");

      setForm({
        fullName: "",
        email: "",
        password: "",
        degreeId: "",
        about: "",
      });

      setSelectedSubjectKeys(new Set());
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form heading */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tutor registration</h2>

        <p className="mt-1 text-sm text-slate-500">
          Tell us about yourself and the subjects you teach.
        </p>
      </div>

      {/* Full name */}
      <div>
        <label
          htmlFor="tutor-fullName"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Full name
        </label>

        <input
          id="tutor-fullName"
          name="fullName"
          type="text"
          value={form.fullName}
          onChange={handleChange}
          placeholder="Enter your full name"
          autoComplete="name"
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="tutor-email"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Email address
        </label>

        <input
          id="tutor-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="tutor-password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Password
        </label>

        <input
          id="tutor-password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Qualification */}
      <div>
        <label
          htmlFor="tutor-degreeId"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Highest qualification
        </label>

        <select
          id="tutor-degreeId"
          name="degreeId"
          value={form.degreeId}
          onChange={handleChange}
          disabled={loadingData}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        >
          <option value="">
            {loadingData
              ? "Loading qualifications..."
              : "Select your qualification"}
          </option>

          {degrees.map((degree, index) => {
            const id = String(degree.id ?? degree._id ?? "");

            return (
              <option key={id || index} value={id}>
                {degree.name}
                {degree.shortName ? ` (${degree.shortName})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* Subjects */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800">
          Subjects you teach
        </h3>

        <p className="mb-3 mt-1 text-xs text-slate-500">
          Select all subjects you can teach.
        </p>

        {loadingData ? (
          <p className="text-sm text-slate-500">Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            No active subjects are available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subjects.map((subject) => {
              const isSelected = selectedSubjectKeys.has(subject.selectionKey);

              return (
                <label
                  key={subject.selectionKey}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSubjectChange(subject.selectionKey)}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    {subject.name}
                    {subject.shortName ? ` (${subject.shortName})` : ""}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Selected: {selectedSubjectKeys.size} subject(s)
        </p>
      </div>

      {/* About */}
      <div>
        <label
          htmlFor="tutor-about"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          About you{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </label>

        <textarea
          id="tutor-about"
          name="about"
          value={form.about}
          onChange={handleChange}
          placeholder="Describe your teaching experience..."
          rows={4}
          className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || loadingData}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Create tutor account"}
      </button>
    </form>
  );
}

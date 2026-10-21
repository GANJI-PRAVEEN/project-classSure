import { useState } from "react";

const API_BASE_URL = "http://localhost:8080";

export default function ParentSignup() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    address: "",
    pincode: "",
    latitude: null,
    longitude: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Update form fields.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // Optionally capture the parent's current coordinates.
  const handleUseCurrentLocation = () => {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location access.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previousForm) => ({
          ...previousForm,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));

        setSuccess(
          "Coordinates captured. Please enter or verify your home address.",
        );
      },
      () => {
        setError(
          "Could not access your location. Allow location permission or enter your address manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  // Submit parent registration.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!form.address.trim()) {
      setError("Please enter your home address.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      setError("Please enter a valid 6-digit PIN code.");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      role: "PARENT",

      parentLocation: {
        address: form.address.trim(),
        pincode: form.pincode,
        latitude: form.latitude,
        longitude: form.longitude,
      },
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

      setSuccess(responseText || "Parent account created successfully!");

      setForm({
        fullName: "",
        email: "",
        password: "",
        address: "",
        pincode: "",
        latitude: null,
        longitude: null,
      });
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
        <h2 className="text-xl font-bold text-slate-900">
          Parent registration
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create an account to find and manage home tutors.
        </p>
      </div>

      {/* Full name */}
      <div>
        <label
          htmlFor="parent-fullName"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Full name
        </label>

        <input
          id="parent-fullName"
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
          htmlFor="parent-email"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Email address
        </label>

        <input
          id="parent-email"
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
          htmlFor="parent-password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Password
        </label>

        <input
          id="parent-password"
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

      {/* Home address */}
      <div>
        <label
          htmlFor="parent-address"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Home address
        </label>

        <textarea
          id="parent-address"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="House number, street, area, city"
          rows={3}
          autoComplete="street-address"
          required
          className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* PIN code */}
      <div>
        <label
          htmlFor="parent-pincode"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          PIN code
        </label>

        <input
          id="parent-pincode"
          name="pincode"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={form.pincode}
          onChange={handleChange}
          placeholder="Enter 6-digit PIN code"
          required
          autoComplete="postal-code"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Optional current location */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              Location coordinates
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Optional. Helps identify your location more accurately.
            </p>

            {form.latitude !== null && form.longitude !== null && (
              <p className="mt-2 break-all text-xs text-emerald-700">
                Coordinates captured successfully.
              </p>
            )}

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Use my current location
            </button>
          </div>
        </div>
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
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Create parent account"}
      </button>
    </form>
  );
}

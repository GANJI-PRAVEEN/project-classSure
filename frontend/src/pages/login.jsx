import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "http://localhost:8080";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const responseText = await response.text();
      console.log("Response Text", responseText);

      if (!response.ok) {
        throw new Error(
          responseText || "Invalid email or password."
        );
      }

      // Assuming your backend returns the JWT as a JSON string.
      // If it returns an object, adjust this part to match it.
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        result = responseText;
      }

      const token =
        typeof result === "string" ? result : result.token;

      const role =
        typeof result === "object" && result !== null
          ? result.role
          : null;
      const user =
        typeof result === "object" && result !== null
          ? result.user
          : null;

      if (!token || !role || !user) {
        throw new Error(
          "Login response must contain both a token,a role and a user"
        );
      }

      // Store the token for authenticated API requests.
      // localStorage.setItem("token", token);
      // localStorage.setItem("role", role);
      // localStorage.setItem("user", JSON.stringify(user));
      login(token, user, role);
      console.log("set user ", localStorage.getItem("user"));

      // Redirect according to the user's actual role.
      if (role === "TUTOR") {
        navigate("/tutor/dashboard");
      } else if (role === "PARENT") {
        navigate("/parent/dashboard");
      } else {
        throw new Error("Unrecognized user role.");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">

        {/* Branding */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-700">
            ClassSure
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Welcome back! Continue your learning journey.
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">
            Log in to your account
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Sign in as a tutor or parent.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Create account
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure access for tutors and parents.
        </p>
      </div>
    </div>
  );
}
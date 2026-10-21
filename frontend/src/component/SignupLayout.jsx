
import { useNavigate } from "react-router-dom";

export default function SignupLayout({
  selectedRole,
  onRoleChange,
  children,
}) {
  const navigate = useNavigate();

  const roleButtonClass = (role) =>
    `flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
      selectedRole === role
        ? "bg-white text-blue-700 shadow-sm"
        : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">

        {/* Header: Brand and login */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-3">

            {/* ClassSure branding */}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-blue-700 sm:text-4xl">
                ClassSure
              </h1>

              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Connecting Home Tutors and Parents
              </p>
            </div>

            {/* Login reminder and action */}
            <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
              <span className="text-right text-xs text-slate-500 sm:text-sm">
                Already registered?
              </span>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Log in
              </button>
            </div>
          </div>

          <div className="mt-6 border-b border-slate-200" />
        </header>

        {/* Shared signup card */}
        <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

          {/* Role selector */}
          <div className="mb-7">
            <p className="mb-3 text-sm font-semibold text-slate-800">
              Create an account as
            </p>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onRoleChange("TUTOR")}
                className={roleButtonClass("TUTOR")}
                aria-pressed={selectedRole === "TUTOR"}
              >
                I'm a Tutor
              </button>

              <button
                type="button"
                onClick={() => onRoleChange("PARENT")}
                className={roleButtonClass("PARENT")}
                aria-pressed={selectedRole === "PARENT"}
              >
                I'm a Parent
              </button>
            </div>
          </div>

          {/* Selected role form */}
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            © ClassSure. Connecting learning with trust.
          </p>
        </footer>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TerminalProtocols() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleUnderstand = () => {
    if (user) {
      navigate("/"); // already logged in → go home
    } else {
      navigate("/register"); // not logged in → go register
    }
  };
  return (
    <div className="min-h-[calc(100vh-120px)]">
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleUnderstand}
            className="rounded-xl border border-slate-800 bg-slate-900/20 px-3 py-2 text-sm font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            ← Back
          </button>

          <div className="h-px flex-1 bg-slate-800/70" />
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 md:p-10 shadow-2xl">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Terminal Protocols &{" "}
            <span className="text-indigo-400">Data Privacy Acts</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Effective date: <span className="text-slate-300">Immediately</span>
          </p>

          <div className="mt-8 space-y-8 text-slate-200">
            <section>
              <h2 className="text-lg font-black text-white">1. Purpose</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                These Terminal Protocols & Data Privacy Acts describe the rules,
                safety controls, and data handling practices used by PC
                PartMart. By using our services, you agree to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">
                2. User Responsibilities
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-slate-300 space-y-2">
                <li>Provide accurate account information.</li>
                <li>
                  Do not attempt to misuse, exploit, or disrupt the platform.
                </li>
                <li>
                  Keep your login credentials secure; you are responsible for
                  activity under your account.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">
                3. Data We Collect
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-slate-300 space-y-2">
                <li>
                  <span className="font-bold text-slate-200">
                    Account data:
                  </span>{" "}
                  name, email, hashed password, profile details.
                </li>
                <li>
                  <span className="font-bold text-slate-200">Order data:</span>{" "}
                  cart items, order history, delivery information (if
                  applicable).
                </li>
                <li>
                  <span className="font-bold text-slate-200">
                    Technical data:
                  </span>{" "}
                  device/browser info, basic logs for security and debugging.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">
                4. How We Use Your Data
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-slate-300 space-y-2">
                <li>To create and manage your account.</li>
                <li>To process orders and provide customer support.</li>
                <li>To improve performance, reliability, and security.</li>
                <li>To prevent fraud, abuse, and unauthorized access.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">5. Data Sharing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                We do not sell your personal data. We may share limited data
                only with service providers (e.g., payment processing, shipping,
                analytics) strictly to operate the service, or if required by
                law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">
                6. Security Controls (Terminal Protocols)
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-slate-300 space-y-2">
                <li>
                  Passwords are stored using secure hashing (never plain text).
                </li>
                <li>Role-based access controls for sensitive actions.</li>
                <li>Monitoring and logging for abuse prevention.</li>
                <li>Rate limiting and validation on critical endpoints.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">
                7. Cookies & Local Storage
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                We may use cookies/local storage to keep you signed in and
                improve your experience. You can clear browser storage at any
                time, but some features may stop working properly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">8. Your Rights</h2>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-slate-300 space-y-2">
                <li>Request access to your personal data.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Request deletion of your account (where applicable).</li>
              </ul>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                To request changes, contact support via the Support page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-white">
                9. Changes to This Policy
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                We may update these terms from time to time. If changes are
                major, we will make reasonable efforts to notify users.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
              <h2 className="text-base font-black text-white">Contact</h2>
              <p className="mt-2 text-sm text-slate-300">
                For questions about privacy or protocols, reach out via{" "}
                <Link
                  to="/support"
                  className="text-indigo-300 hover:text-indigo-200 font-bold"
                >
                  Support
                </Link>
                .
              </p>
            </section>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleUnderstand}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-black text-white hover:bg-indigo-400 transition"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

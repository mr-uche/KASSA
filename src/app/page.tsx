"use client";

import { useState } from "react";

export default function Home() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <main className="min-h-screen bg-[#f4f5f7] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[1000px] min-h-[650px] grid grid-cols-1 lg:grid-cols-2 overflow-hidden">

        {/* LEFT SIDE */}
        <section className="bg-[#11745f] text-white px-10 py-10 lg:px-10 lg:py-9 flex flex-col">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-[5px] bg-white text-[#11745f] flex items-center justify-center text-[12px] font-bold">
              K
            </div>

            <span className="font-semibold text-[13px]">
              Kassa
            </span>
          </div>

          {/* Main text */}
          <div className="mt-14">
            <h1 className="text-[27px] leading-[1.05] font-bold max-w-[270px]">
              Banks and Fintechs
              <br />
              move money.
              <br />
              <span className="text-[#8ce0c8]">
                Kassa makes it
                <br />
                understandable.
              </span>
            </h1>

            <p className="mt-4 text-[10px] leading-[1.45] text-[#b8e4d8] max-w-[290px]">
              One reconciled dashboard for every bank transfer,
              <br />
              POS, USSD, card, cash, and wallet payment.
            </p>

            {/* Features */}
            <div className="mt-5 space-y-3 text-[10px] text-[#d5f1ea]">
              <div className="flex items-start gap-2">
                <span className="mt-[3px] text-[#9be4d2]">●</span>
                <span>One reconciled view of every sale, every channel</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="mt-[3px] text-[#9be4d2]">●</span>
                <span>Catch failed or missing payments the same day</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="mt-[3px] text-[#9be4d2]">●</span>
                <span>Know exactly which staff member handled each sale</span>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-auto pt-10">
            <div className="bg-[#0c624f] rounded-lg px-4 py-4 max-w-[285px]">
              <p className="text-[10px] italic leading-[1.5] text-[#c7e9e0]">
                “I don&apos;t need faster payments. I need to know, at a
                glance, that every naira payment is accounted for.”
              </p>

              <p className="mt-3 text-[9px] text-[#91cdbf]">
                Adebola Okafor — Business Owner, 2-branch pharmacy
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="bg-[#f4f5f7] flex items-center justify-center px-6 py-8 lg:px-[70px]">

          <div className="bg-white border border-[#e4e7eb] rounded-xl w-full max-w-[360px] px-5 py-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">

            {/* Heading */}
            <div className="mb-4">
              <p className="text-[8px] font-bold text-[#11745f] uppercase">
                Step 1 of 1
              </p>

              <h2 className="text-[17px] font-bold text-[#172033] mt-1">
                Create your business account
              </h2>

              <p className="text-[9px] text-[#8a919d] mt-1">
                Free trial. No card required. Cancel anytime.
              </p>
            </div>

            <form className="space-y-2.5">

              {/* Business Name */}
              <Field
                label="Business name"
                placeholder="e.g. Adebola Pharmacy"
              />

              {/* Name + Phone */}
              <div className="grid grid-cols-2 gap-2.5">
                <Field
                  label="Your full name"
                  placeholder="Full name"
                />

                <Field
                  label="Phone number"
                  placeholder="+234"
                />
              </div>

              {/* Email */}
              <Field
                label="Work email"
                placeholder="name@business.com"
                type="email"
              />

              {/* Business Type */}
              <div>
                <label className="block text-[8px] font-semibold text-[#374151] mb-1">
                  Business type
                </label>

                <div className="relative">
                  <select
                    defaultValue=""
                    className="w-full h-[30px] appearance-none rounded-[5px] border border-[#dce0e5] bg-white px-2.5 pr-8 text-[9px] text-[#aeb5bf] outline-none focus:border-[#11745f]"
                  >
                    <option value="" disabled>
                      Select business type
                    </option>
                    <option>Pharmacy</option>
                    <option>Retail</option>
                    <option>Restaurant</option>
                    <option>Fintech</option>
                    <option>Other</option>
                  </select>

                  <svg
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7d8794"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              {/* Password */}
              <PasswordField
                label="Password"
                placeholder="Minimum 8 characters"
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />

              {/* Confirm Password */}
              <PasswordField
                label="Confirm password"
                placeholder="Re-enter password"
                showPassword={showConfirmPassword}
                setShowPassword={setShowConfirmPassword}
              />

              {/* Terms */}
              <div className="flex items-start gap-1.5 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-[1px] accent-[#11745f]"
                  defaultChecked
                />

                <label
                  htmlFor="terms"
                  className="text-[8px] leading-[1.4] text-[#59616d]"
                >
                  I agree to Kassa's{" "}
                  <a href="#" className="text-[#11745f] underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-[#11745f] underline">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* Sign Up */}
              <button
                type="submit"
                className="w-full h-[31px] rounded-[5px] bg-[#11745f] hover:bg-[#0e654f] text-white text-[10px] font-semibold transition-colors"
              >
                Sign up
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px bg-[#edf0f2] flex-1" />
                <span className="text-[8px] text-[#a8afb8]">
                  or
                </span>
                <div className="h-px bg-[#edf0f2] flex-1" />
              </div>

              {/* Login */}
              <div className="text-center">
                <p className="text-[8px] text-[#8b929d]">
                  Already have an account?
                </p>

                <a
                  href="/login"
                  className="text-[9px] font-semibold text-[#11745f] underline"
                >
                  Log in
                </a>
              </div>

            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

/* INPUT COMPONENT */
function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[8px] font-semibold text-[#374151] mb-1">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        className="w-full h-[30px] rounded-[5px] border border-[#dce0e5] bg-white px-2.5 text-[9px] text-[#374151] placeholder:text-[#b6bdc6] outline-none focus:border-[#11745f] transition-colors"
      />
    </div>
  );
}

/* PASSWORD COMPONENT */
function PasswordField({
  label,
  placeholder,
  showPassword,
  setShowPassword,
}: {
  label: string;
  placeholder: string;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
    <div>
      <label className="block text-[8px] font-semibold text-[#374151] mb-1">
        {label}
      </label>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className="w-full h-[30px] rounded-[5px] border border-[#dce0e5] bg-white px-2.5 pr-9 text-[9px] text-[#374151] placeholder:text-[#b6bdc6] outline-none focus:border-[#11745f]"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7d8794]"
          aria-label="Toggle password visibility"
        >
          {showPassword ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.7 4.2 9.7 8a10.7 10.7 0 0 1-3.1 5.1" />
              <path d="M6.6 6.6C4.6 8 3.3 10 2.3 12c1 3.8 4.7 8 9.7 8 1.5 0 2.9-.4 4.1-1" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M2.3 12C3.3 8.2 7 4 12 4s8.7 4.2 9.7 8c-1 3.8-4.7 8-9.7 8s-8.7-4.2-9.7-8Z" />
              <circle cx="12" cy="12" r="2.7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
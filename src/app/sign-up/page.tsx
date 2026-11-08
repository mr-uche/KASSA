"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/logo";
import TextField from "@/components/ui/TextField";
import SelectField from "@/components/ui/SelectField";
import Button from "@/components/ui/Button";
import { kassaPost } from "@/lib/kassa-client";


const bullets = [
  "One reconciled view of every sale, every channel",
  "Catch failed or missing payments the same day",
  "Know exactly which staff member handled each sale",
];

export default function SignUpPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const fields = new FormData(e.currentTarget);
    const password = String(fields.get("password") ?? "");
    const confirmation = String(fields.get("confirmPassword") ?? "");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await kassaPost("/api/auth/register", {
        fullName: String(fields.get("fullName") ?? "").trim(),
        email: String(fields.get("email") ?? "").trim(),
        phone: String(fields.get("phone") ?? "").trim() || undefined,
        password,
      });
      const typeValue = String(fields.get("businessType") ?? "");
      const typeLabels: Record<string, string> = {
        pharmacy: "Pharmacy",
        retail: "Retail store",
        restaurant: "Restaurant / Food",
        services: "Other",
        other: "Other",
      };
      // No passwords or tokens are stored in the browser.
      sessionStorage.setItem("kassa_onboarding_prefill", JSON.stringify({
        businessName: String(fields.get("businessName") ?? "").trim(),
        businessType: typeLabels[typeValue] ?? "Other",
      }));
      router.replace("/onboarding");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
 <div className="h-screen absolute inset-0 z-10 flex flex-col lg:grid lg:h-screen lg:grid-cols-[5fr_6fr]">
      {/* Splash header (mobile/tablet) / Left panel (desktop) */}
      <div className="relative flex shrink-0 flex-col overflow-visible bg-[#08745F] px-6 pt-6 pb-6 text-white lg:h-auto lg:px-14 lg:pt-8 lg:pb-8">
        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col justify-between">
          <div>
            <div className="mb-5">
              <Logo variant="light" />
            </div>

            <h1 className="text-[28px] font-bold leading-tight lg:mt-10 lg:text-[40px]">
              Banks and Fintechs<br /> move money.{" "}<br />
              <span className="text-brand-100 text-[34px]">Kassa makes it<br /> understandable.</span>
            </h1>

            <p className="mt-4 hidden lg:block max-w-md text-sm text-brand-100/90 ">
              One reconciled dashboard for every bank transfer,<br /> POS, USSD, card,
              cash, and wallet payment.
            </p>

            <ul className="mt-6 hidden lg:block space-y-3 text-sm ">
              {[
                "One reconciled view of every sale, every channel",
                "Catch failed or missing payments the same day",
                "Know exactly which staff member handled each sale",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-100" />
                  <span className="text-brand-50/95">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <blockquote className="mt-8 hidden max-w-sm rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur-sm lg:block">
            <p className="text-sm text-white/90 leading-relaxed">
              &ldquo;I don&apos;t need faster payments. I need to know, at a
              glance, that every naira coming in is accounted for.&rdquo;
            </p>
            <footer className="mt-3 text-xs text-white/60">
              Adebora Okafor; Business Owner, 2-branch pharmacy
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right / form panel */}
      <div className="flex items-center justify-center  bg-white px-6 py-8 ">
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
           Step 1 of 1
          </p>

          <h2 className="mt-1 text-2xl font-bold text-text-primary">
           Create your business account
          </h2>

          <p className="mt-1 text-sm text-text-secondary">
           Free trial. No card required. Cancel anytime.
          </p>

         <form
           onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4"
         >
       
         <TextField
          label="Business name"
          name="businessName"
          required
          maxLength={150}
          placeholder="e.g. Adebola Pharmacy"
          />
         <TextField
            label="Your full name"
            name="fullName"
            required
            maxLength={120}
            placeholder="Full name"
          />
        
        

         <div className="grid grid-cols-2 gap-4">
          

          <TextField
            label="Phone number"
            name="phone"
            type="tel"
            placeholder="+234"
          />
          <TextField
          label="Work email"
          name="email"
          required
          type="email"
          placeholder="name@business.com"
          />
         </div>

        

          <SelectField
          label="Business type"
          name="businessType"
          required
          placeholder="Select business type"
         >
          <option value="retail">Retail / Shop</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="restaurant">
            Restaurant / Food service
          </option>
          <option value="services">Services</option>
          <option value="other">Other</option>
         </SelectField>

         <div className="grid grid-cols-2 gap-4">
         <TextField
          label="Password"
          name="password"
          required
          minLength={12}
          type={showPassword ? "text" : "password"}
          placeholder="Minimum 12 characters"
          trailingIcon={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-controls="password"
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
              className="flex items-center justify-center rounded text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
         />

         <TextField
          label="Confirm password"
          name="confirmPassword"
          required
          minLength={12}
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Re-enter password"
          trailingIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              aria-controls="confirmPassword"
              aria-pressed={showConfirmPassword}
              title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              className="flex items-center justify-center rounded text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          />
        </div>  

        

        <label className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-border-subtle text-brand-500 focus:ring-brand-100"
          />

          <span>
            I agree to Kassa&apos;s{" "}
            <Link
              href="/terms"
              className="text-brand-500 underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-brand-500 underline"
            >
              Privacy Policy
            </Link>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-700">{error}</p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          fullWidth
          className="mt-2"
        >
          {submitting ? "Creating account..." : "Sign up"}
        </Button>

       

        <p className="text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-500"
          >
            Log in
          </Link>
        </p>
      </form>
      </div>
    </div>
  </div>
  );
}
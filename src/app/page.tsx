"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import TextField from "@/components/ui/TextField";
import SelectField from "@/components/ui/SelectField";
import Button from "@/components/ui/Button";

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path
      d="M1.5 10s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle
      cx="10"
      cy="10"
      r="2.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

export default function SignUpPage() {
  const router = useRouter();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // No authentication.
    // Just move to the first onboarding page.
    router.push("/onboarding");
  };
  return (
    <AuthSplitLayout>
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
          placeholder="e.g. Adebola Pharmacy"
        />
        <TextField
            label="Your full name"
            name="fullName"
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
          type="email"
          placeholder="name@business.com"
        />
        </div>

        

        <SelectField
          label="Business type"
          name="businessType"
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
          type="password"
          placeholder="Minimum 8 characters"
          trailingIcon={<EyeIcon />}
        />

        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter password"
          trailingIcon={<EyeIcon />}
        />
        </div>  

        

        <label className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            defaultChecked
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

        <Button
          type="submit"
          fullWidth
          className="mt-2"
        >
          Sign up
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
    </AuthSplitLayout>
  );
}
import { useState } from "react";
import { useToast } from "@chakra-ui/react"; // retained: toast API only — no layout components
import { FcGoogle } from "react-icons/fc";
import { supabase } from "../lib/supabase";
import { CadenceButton } from "../components/ui/CadenceButton";
import { CadenceCard } from "../components/ui/CadenceCard";

// ─── Inline icon replacements (removes @chakra-ui/icons dependency) ──────────
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ─── Types (unchanged) ────────────────────────────────────────────────────────
interface FormData {
  username: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  nativeLanguage: string;
  primaryGoal: string;
  englishProficiency: string;
  region: string;
  phoneNumber: string;
  referralCode: string;
  termsAccepted: boolean;
}

type FormErrors = {
  [K in keyof FormData]?: string;
};

// ─── Password strength (unchanged logic) ─────────────────────────────────────
function getPasswordStrength(password: string): {
  strength: number;
  label: string;
  colorClass: string;
} {
  if (password.length === 0) return { strength: 0, label: "", colorClass: "bg-border" };
  if (password.length < 8) return { strength: 25, label: "Too short", colorClass: "bg-error" };
  let strength = 25;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 15;
  if (/[^a-zA-Z\d]/.test(password)) strength += 10;
  if (strength < 50) return { strength, label: "Weak", colorClass: "bg-error" };
  if (strength < 75) return { strength, label: "Fair", colorClass: "bg-warning" };
  if (strength < 90) return { strength, label: "Good", colorClass: "bg-brand" };
  return { strength, label: "Strong", colorClass: "bg-success" };
}

// ─── Shared input class ───────────────────────────────────────────────────────
const inputClass =
  "w-full h-10 px-3.5 rounded-lg bg-surface border border-border text-text-primary " +
  "placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring " +
  "focus:border-transparent transition-all text-sm disabled:opacity-50";

const selectClass =
  "w-full h-10 px-3.5 rounded-lg bg-surface border border-border text-text-primary " +
  "focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent " +
  "transition-all text-sm appearance-none cursor-pointer";

const labelClass = "block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5";
const helperClass = "mt-1 text-xs text-text-muted";
const errorClass  = "mt-1 text-xs text-error";

// ─── Component ────────────────────────────────────────────────────────────────
export function SignupPage({
  onSwitchToLogin,
  onSignupSuccess
}: {
  onSwitchToLogin: () => void;
  onSignupSuccess: (username: string) => void;
}) {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    nativeLanguage: "",
    primaryGoal: "",
    englishProficiency: "",
    region: "",
    phoneNumber: "",
    referralCode: "",
    termsAccepted: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  // ── Validation (unchanged) ──────────────────────────────────────────────────
  const validateField = (name: keyof FormData, value: string | boolean): string | undefined => {
    switch (name) {
      case "username":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Username is required";
        if (typeof value === "string" && value.length < 3) return "Username must be at least 3 characters";
        break;
      case "fullName":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Full name is required";
        break;
      case "email":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Email is required";
        if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
        break;
      case "password":
        if (!value || (typeof value === "string" && value.length < 8)) return "Password must be at least 8 characters";
        break;
      case "confirmPassword":
        if (!value || (typeof value === "string" && value !== formData.password)) return "Passwords do not match";
        break;
      case "age":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Age is required";
        const ageNum = typeof value === "string" ? parseInt(value, 10) : 0;
        if (isNaN(ageNum) || ageNum < 13) return "You must be 13 or older to use this platform";
        break;
      case "nativeLanguage":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Native language is required";
        break;
      case "primaryGoal":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Please select your primary goal";
        break;
      case "englishProficiency":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Please select your English proficiency level";
        break;
      case "region":
        if (!value || (typeof value === "string" && value.trim() === "")) return "Region/Location is required";
        break;
      case "termsAccepted":
        if (!value) return "You must accept the Terms of Service and Privacy Policy";
        break;
    }
    return undefined;
  };

  const handleChange = (name: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const toast = useToast();

  // ── Submit (unchanged auth logic) ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};
    (Object.keys(formData) as Array<keyof FormData>).forEach((key) => {
      if (key !== "phoneNumber" && key !== "referralCode") {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.fullName, username: formData.username } }
      });
      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: formData.username,
            full_name: formData.fullName,
            native_languages: [formData.nativeLanguage],
            learning_motivation: [formData.primaryGoal],
            location_country: formData.region,
          });
        if (profileError && profileError.code !== '23505') {
          console.error('Profile creation error:', profileError);
        }
      }

      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => { onSignupSuccess(formData.username || formData.fullName || "User"); }, 2000);
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, status: "error", duration: 5000, isClosable: true });
      setIsSubmitting(false);
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center px-4 py-12 transition-colors duration-200">
        <div className="w-full max-w-md">
          <CadenceCard elevation="default" className="p-8 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <h1 className="text-xl font-bold text-success">Account Created Successfully!</h1>
            <p className="text-sm text-text-secondary">Redirecting to your dashboard...</p>
          </CadenceCard>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="w-full max-w-2xl space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-11 w-11 rounded-xl bg-brand flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create your account</h1>
          <p className="text-sm text-text-secondary">Start your journey to better communication</p>
        </div>

        {/* Card */}
        <CadenceCard elevation="default" className="p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="signup-username" className={labelClass}>
                Username
                <span className="ml-1 normal-case font-normal text-text-muted">(Unique identifier)</span>
              </label>
              <input
                id="signup-username"
                type="text"
                placeholder="johndoe"
                autoComplete="username"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, username: validateField("username", formData.username) }))}
                className={inputClass}
              />
              {errors.username && <p className={errorClass}>{errors.username}</p>}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="signup-fullname" className={labelClass}>Full Name</label>
              <input
                id="signup-fullname"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, fullName: validateField("fullName", formData.fullName) }))}
                className={inputClass}
              />
              {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className={labelClass}>Email Address</label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, email: validateField("email", formData.email) }))}
                className={inputClass}
              />
              <p className={helperClass}>For account verification and communication</p>
              {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className={labelClass}>Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, password: validateField("password", formData.password) }))}
                  className={inputClass + " pr-10"}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {/* Password strength bar */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.colorClass}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted">{passwordStrength.label}</p>
                </div>
              )}
              <p className={helperClass}>Minimum 8 characters</p>
              {errors.password && <p className={errorClass}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm-password" className={labelClass}>Confirm Password</label>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, confirmPassword: validateField("confirmPassword", formData.confirmPassword) }))}
                  className={inputClass + " pr-10"}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword}</p>}
            </div>

            {/* Two-column row: Age + Region */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="signup-age" className={labelClass}>Age</label>
                <input
                  id="signup-age"
                  type="number"
                  placeholder="25"
                  min={13}
                  value={formData.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, age: validateField("age", formData.age) }))}
                  className={inputClass}
                />
                <p className={helperClass}>Must be 13+ for child safety compliance</p>
                {errors.age && <p className={errorClass}>{errors.age}</p>}
              </div>
              <div>
                <label htmlFor="signup-region" className={labelClass}>Region / Location</label>
                <input
                  id="signup-region"
                  type="text"
                  placeholder="Mumbai, Maharashtra"
                  value={formData.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, region: validateField("region", formData.region) }))}
                  className={inputClass}
                />
                <p className={helperClass}>City/State (helps with accent analysis)</p>
                {errors.region && <p className={errorClass}>{errors.region}</p>}
              </div>
            </div>

            {/* Native Language */}
            <div>
              <label htmlFor="signup-native-lang" className={labelClass}>
                Native Language
                <span
                  title="This helps us provide personalized accent analysis and pronunciation guidance tailored to your language background."
                  className="ml-1 inline-flex items-center text-text-muted cursor-help"
                >
                  <InfoIcon />
                </span>
              </label>
              <div className="relative">
                <select
                  id="signup-native-lang"
                  value={formData.nativeLanguage}
                  onChange={(e) => handleChange("nativeLanguage", e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, nativeLanguage: validateField("nativeLanguage", formData.nativeLanguage) }))}
                  className={selectClass}
                >
                  <option value="">Select your native language</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="English">English</option>
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>
              {errors.nativeLanguage && <p className={errorClass}>{errors.nativeLanguage}</p>}
            </div>

            {/* Primary Goal */}
            <div>
              <label htmlFor="signup-goal" className={labelClass}>Primary Goal</label>
              <div className="relative">
                <select
                  id="signup-goal"
                  value={formData.primaryGoal}
                  onChange={(e) => handleChange("primaryGoal", e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, primaryGoal: validateField("primaryGoal", formData.primaryGoal) }))}
                  className={selectClass}
                >
                  <option value="">Select your primary goal</option>
                  <option value="stuttering">Improve stuttering/stammering</option>
                  <option value="accent">Reduce accent interference</option>
                  <option value="word-retrieval">Improve word retrieval/fluency</option>
                  <option value="pronunciation">Improve pronunciation</option>
                  <option value="general">General communication improvement</option>
                  <option value="all">All of the above</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>
              {errors.primaryGoal && <p className={errorClass}>{errors.primaryGoal}</p>}
            </div>

            {/* English Proficiency */}
            <div>
              <label htmlFor="signup-proficiency" className={labelClass}>Current English Proficiency</label>
              <div className="relative">
                <select
                  id="signup-proficiency"
                  value={formData.englishProficiency}
                  onChange={(e) => handleChange("englishProficiency", e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, englishProficiency: validateField("englishProficiency", formData.englishProficiency) }))}
                  className={selectClass}
                >
                  <option value="">Select your level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>
              {errors.englishProficiency && <p className={errorClass}>{errors.englishProficiency}</p>}
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="signup-phone" className={labelClass}>
                  Phone <span className="normal-case font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  autoComplete="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className={inputClass}
                />
                <p className={helperClass}>For future SMS notifications</p>
              </div>
              <div>
                <label htmlFor="signup-referral" className={labelClass}>
                  Referral Code <span className="normal-case font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  id="signup-referral"
                  type="text"
                  placeholder="ABC123"
                  value={formData.referralCode}
                  onChange={(e) => handleChange("referralCode", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Terms */}
            <div>
              <div className="flex items-start gap-2.5">
                <input
                  id="signup-terms"
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={(e) => {
                    handleChange("termsAccepted", e.target.checked);
                    if (errors.termsAccepted) setErrors((p) => ({ ...p, termsAccepted: undefined }));
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-brand cursor-pointer focus:ring-focus-ring"
                />
                <label htmlFor="signup-terms" className="text-sm text-text-secondary cursor-pointer select-none">
                  I agree to the{" "}
                  <button type="button" className="font-medium text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm">
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button type="button" className="font-medium text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm">
                    Privacy Policy
                  </button>
                </label>
              </div>
              {errors.termsAccepted && <p className={errorClass}>{errors.termsAccepted}</p>}
            </div>

            {/* Submit */}
            <CadenceButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              loadingText="Creating account..."
            >
              Create Account
            </CadenceButton>

            {/* Social Sign Up */}
            <CadenceButton
              type="button"
              variant="outline"
              size="md"
              fullWidth
              leftIcon={<FcGoogle className="w-5 h-5" />}
            >
              Sign up with Google
            </CadenceButton>

            {/* Switch to login */}
            <p className="text-xs text-text-secondary text-center">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-medium text-brand hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
              >
                Log in
              </button>
            </p>
          </form>
        </CadenceCard>
      </div>
    </div>
  );
}

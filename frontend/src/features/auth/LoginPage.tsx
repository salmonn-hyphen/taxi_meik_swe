import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginSchema, type LoginFormData } from "@/utils/validation";
import { useAuth, useToast } from "@/providers";
import { getDashboardPath } from "@/utils/auth";
import Logo from "@/assets/Logo.svg";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const response = await login(data);
      addToast("Welcome back!", "success");
      navigate(getDashboardPath(response.user.role), { replace: true });
    } catch (err: any) {
      addToast(err.response?.data?.error || err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-white/20 bg-white/10 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
        <CardHeader className="space-y-1 text-center">
          <img
            src={Logo}
            alt="Logo"
            className="mx-auto h-24 w-50 object-contain"
          />

          <CardTitle className="text-3xl text-white">Welcome back</CardTitle>
          <CardDescription className="text-white/70">
            Sign in with your phone number and password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white/80">
                Phone
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="0912345678"
                  maxLength={12}
                  className="h-12 border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/35 focus-visible:ring-white/40"
                  {...register("phone")}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-rose-200">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-12 border-white/15 bg-white/10 pr-12 text-white placeholder:text-white/35 focus-visible:ring-white/40"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-200">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-sky-200 transition hover:text-white hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-white text-slate-950 shadow-lg transition hover:bg-slate-100"
            >
              {loading ? "Signing in..." : "Sign In"}
              <LogIn className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-white/70">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-sky-200 transition hover:text-white hover:underline"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

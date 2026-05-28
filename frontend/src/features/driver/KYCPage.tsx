import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast, useAuth } from "@/providers";
import { usersApi } from "@/api";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ArrowRight,
  FileImage,
  RefreshCw,
  Camera,
  IdCard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import uploadLogo from '@/assets/image.png';

export function KYCPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [uploading, setUploading] = useState(false);

  // File States
  const [nrcFront, setNrcFront] = useState<File | null>(null);
  const [nrcBack, setNrcBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [drivingLicenseFront, setDrivingLicenseFront] = useState<File | null>(
    null,
  );
  const [drivingLicenseBack, setDrivingLicenseBack] = useState<File | null>(
    null,
  );

  // Preview URLs
  const [previews, setPreviews] = useState<Record<string, string>>({
    nrcFront: "",
    nrcBack: "",
    selfie: "",
    drivingLicenseFront: "",
    drivingLicenseBack: "",
  });

  const fileInputRefs = {
    nrcFront: useRef<HTMLInputElement>(null),
    nrcBack: useRef<HTMLInputElement>(null),
    selfie: useRef<HTMLInputElement>(null),
    drivingLicenseFront: useRef<HTMLInputElement>(null),
    drivingLicenseBack: useRef<HTMLInputElement>(null),
  };

  const fetchKycStatus = async () => {
    try {
      setLoadingStatus(true);
      const data = await usersApi.getKycStatus();
      setKycStatus(data?.kycStatus || "PENDING");
    } catch (err) {
      // Fallback to checking the local user object's verification_status
      if (
        user?.verification_status === "verified" ||
        user?.verification_status === "trusted"
      ) {
        setKycStatus("APPROVED");
      } else {
        setKycStatus("PENDING");
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();

    // Revoke object URLs on unmount to prevent memory leaks
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleFileChange = (field: string, file: File) => {
    // 5MB validation
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      addToast(`${file.name} exceeds 5MB size limit`, "error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      addToast("Please upload image files only", "error");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviews((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      return { ...prev, [field]: previewUrl };
    });

    if (field === "nrcFront") setNrcFront(file);
    if (field === "nrcBack") setNrcBack(file);
    if (field === "selfie") setSelfie(file);
    if (field === "drivingLicenseFront") setDrivingLicenseFront(file);
    if (field === "drivingLicenseBack") setDrivingLicenseBack(file);
  };

  const clearFile = (field: string) => {
    setPreviews((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      return { ...prev, [field]: "" };
    });

    if (field === "nrcFront") setNrcFront(null);
    if (field === "nrcBack") setNrcBack(null);
    if (field === "selfie") setSelfie(null);
    if (field === "drivingLicenseFront") setDrivingLicenseFront(null);
    if (field === "drivingLicenseBack") setDrivingLicenseBack(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(field, file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !nrcFront ||
      !nrcBack ||
      !selfie ||
      !drivingLicenseFront ||
      !drivingLicenseBack
    ) {
      addToast("Please upload all 5 required documents", "error");
      return;
    }

    const formData = new FormData();
    formData.append("nrcFront", nrcFront);
    formData.append("nrcBack", nrcBack);
    formData.append("selfie", selfie);
    formData.append("drivingLicenseFront", drivingLicenseFront);
    formData.append("drivingLicenseBack", drivingLicenseBack);

    try {
      setUploading(true);
      await usersApi.uploadKycDocuments(formData);
      addToast("Identity documents uploaded successfully!", "success");
      setKycStatus("SUBMITTED");
    } catch (err: any) {
      addToast(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Upload failed",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">
          Retrieving verification records...
        </p>
      </div>
    );
  }

  // 1. APPROVED VIEW
  if (kycStatus === "APPROVED") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-12 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Identity Verified
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
              Congratulations! Your KYC verification has been approved. You now
              have full access to request, accept, and manage rentals.
            </p>
          </div>
          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/driver/bookings")}
              className="px-8 gap-2"
            >
              View My Bookings <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. SUBMITTED / PENDING VIEW
  if (kycStatus === "SUBMITTED") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-12 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto shadow-sm animate-pulse">
            <Clock className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Verification Pending
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
              Your identity documents have been submitted and are currently
              under review by our administration.
            </p>
            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl px-4 py-2.5 max-w-xs mx-auto mt-4">
              Verification reviews typically take up to 48 business hours. We'll
              update your status as soon as possible.
            </p>
          </div>
          <div className="pt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/driver")}>
              Back to Dashboard
            </Button>
            <Button onClick={fetchKycStatus} variant="ghost" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh Status
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. REJECTED VIEW
  if (kycStatus === "REJECTED") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-12 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-red-600 dark:text-red-400">
              Verification Rejected
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
              Your previous document submission could not be verified. This can
              happen if the images are blurry, cropped, or details don't match
              your account profiles.
            </p>
          </div>
          <div className="pt-4">
            <Button
              onClick={() => setKycStatus("PENDING")}
              size="lg"
              className="px-8 gap-2"
            >
              Re-upload Documents <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 4. UPLOAD FORM (PENDING STATE)
  const uploadFields = [
    {
      key: "nrcFront",
      label: "NRC Front Side",
      icon: <IdCard className="w-6 h-6" />,
    },
    {
      key: "nrcBack",
      label: "NRC Back Side",
      icon: <IdCard className="w-6 h-6" />,
    },
    {
      key: "selfie",
      label: "Selfie with NRC / Photo",
      icon: <Camera className="w-6 h-6" />,
    },
    {
      key: "drivingLicenseFront",
      label: "Driving License Front Side",
      icon: <FileImage className="w-6 h-6" />,
    },
    {
      key: "drivingLicenseBack",
      label: "Driving License Back Side",
      icon: <FileImage className="w-6 h-6" />,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          KYC Verification
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload clear images of your documents to verify your driver
          credentials and unlock car bookings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {uploadFields.map((field) => {
            const preview = previews[field.key];
            const file =
              field.key === "nrcFront"
                ? nrcFront
                : field.key === "nrcBack"
                  ? nrcBack
                  : field.key === "selfie"
                    ? selfie
                    : field.key === "drivingLicenseFront"
                      ? drivingLicenseFront
                      : drivingLicenseBack;

            return (
              <Card
                key={field.key}
                className="border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[280px]"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {field.icon}
                    {field.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  {preview ? (
                    <div className="relative border rounded-xl overflow-hidden aspect-video max-h-44 mx-auto w-full group">
                      <img
                        src={preview}
                        alt="Upload Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => clearFile(field.key)}
                          className="rounded-full w-8 h-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, field.key)}
                      onClick={() =>
                        fileInputRefs[
                          field.key as
                            | "nrcFront"
                            | "nrcBack"
                            | "selfie"
                            | "drivingLicenseFront"
                            | "drivingLicenseBack"
                        ].current?.click()
                      }
                      className={cn(
                        "border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 h-44",
                        "hover:border-sky-500 hover:bg-sky-50/10 dark:hover:border-sky-400/50",
                      )}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        ref={
                          fileInputRefs[
                            field.key as
                              | "nrcFront"
                              | "nrcBack"
                              | "selfie"
                              | "drivingLicenseFront"
                              | "drivingLicenseBack"
                          ]
                        }
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileChange(field.key, f);
                        }}
                        className="hidden"
                      />
                      <div className="w-20 h-20 flex items-center justify-center">
                        <img
                          src={uploadLogo}
                          alt="Upload"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-sm font-semibold">
                        Upload {field.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Drag & drop or click to browse
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Max size: 5MB (JPG, PNG)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/driver")}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="px-8 gap-2"
            disabled={
              uploading ||
              !nrcFront ||
              !nrcBack ||
              !selfie ||
              !drivingLicenseFront ||
              !drivingLicenseBack
            }
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Documents...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Submit Verification Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
export default KYCPage;

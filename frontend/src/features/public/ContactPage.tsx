import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactPage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSent(true);
      reset();
      setTimeout(() => setSent(false), 5000);
    } catch {
      // silently fail — user will see the toast/system message
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white/70 backdrop-blur-xl">
          Get in Touch
        </div>
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-white/65 max-w-xl mx-auto">
          Have a question or need help? We're here for you.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          {
            icon: <Mail className="w-5 h-5" />,
            title: "Email",
            value: "taximeikswe@gmail.com",
          },
          {
            icon: <Phone className="w-5 h-5" />,
            title: "Phone",
            value: "+959 699300378",
          },
          {
            icon: <MapPin className="w-5 h-5" />,
            title: "Address",
            value: "Yangon, Myanmar",
          },
        ].map((c) => (
          <Card
            key={c.title}
            className="border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_30px_120px_rgba(15,23,42,0.45)]"
          >
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4 text-amber-400">
                {c.icon}
              </div>
              <h3 className="font-semibold text-white mb-1">{c.title}</h3>
              <p className="text-sm text-white/65">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_30px_120px_rgba(15,23,42,0.45)]">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-white/70">Name</label>
                  <Input
                    placeholder="Your name"
                    className="h-12 border-white/15 bg-white/10 text-white placeholder:text-white/35 focus-visible:ring-white/40"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-rose-200">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-white/70">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className="h-12 border-white/15 bg-white/10 text-white placeholder:text-white/35 focus-visible:ring-white/40"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-200">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-white/70">Subject</label>
                <Input
                  placeholder="How can we help?"
                  className="h-12 border-white/15 bg-white/10 text-white placeholder:text-white/35 focus-visible:ring-white/40"
                  {...register("subject")}
                />
                {errors.subject && (
                  <p className="text-xs text-rose-200">
                    {errors.subject.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-white/70">Message</label>
                <textarea
                  rows={5}
                  placeholder="Your message..."
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
                  {...register("message")}
                />
                {errors.message && (
                  <p className="text-xs text-rose-200">
                    {errors.message.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="h-12 w-full rounded-xl bg-white text-slate-950 shadow-lg hover:bg-slate-100"
              >
                {sending ? "Sending..." : sent ? "Sent!" : "Send Message"}
                <Send className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Shield, Users, Car, Heart } from "lucide-react";

export function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto text-center mb-16"
      >
        <h1 className="text-4xl font-bold mb-4">
          About{" "}
          <span className="text-amber-400 text-4xl font-bold mb-4">
            Taxi-MeikSwe
          </span>{" "}
          Myanmar
        </h1>
        <p className="text-lg text-muted-foreground">
          Building Myanmar's most trusted taxi rental ecosystem
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            TaxiRental Myanmar connects car owners with verified taxi drivers
            through a secure, transparent platform. We solve the trust problem
            in car rentals by implementing thorough verification, secure deposit
            handling, and fair dispute resolution.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our platform is designed specifically for the Myanmar market,
            supporting local payment methods and understanding the unique needs
            of the local taxi industry.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-muted/20 rounded-2xl p-8"
        >
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "2026", label: "Founded" },
              { value: "50+", label: "Cars" },
              { value: "100+", label: "Users" },
              { value: "20+", label: "Cities" },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center p-4 bg-muted/20 rounded-lg"
              >
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            icon: <Shield className="w-6 h-6" />,
            title: "Trust & Safety",
            desc: "Every user is verified, every car is inspected, every transaction is protected.",
          },
          {
            icon: <Users className="w-6 h-6" />,
            title: "Community First",
            desc: "Built for the Myanmar taxi community with local needs in mind.",
          },
          {
            icon: <Heart className="w-6 h-6" />,
            title: "Fair & Transparent",
            desc: "Clear pricing, transparent processes, and fair dispute resolution.",
          },
        ].map((v) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-muted/20 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
              {v.icon}
            </div>
            <h3 className="font-semibold mb-2">{v.title}</h3>
            <p className="text-sm text-muted-foreground">{v.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

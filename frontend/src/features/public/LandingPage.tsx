import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Car, Users, DollarSign, CheckCircle, Star, TrendingUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export function LandingPage() {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 min-h-screen flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_28%),linear-gradient(135deg,#020617_0%,#081028_45%,#0f172a_100%)]" />
        <div className="absolute inset-0 opacity-60">
          <div className="absolute left-[-8rem] top-12 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="absolute right-[-6rem] top-1/3 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute bottom-[-6rem] left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-32 w-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white/70 backdrop-blur-xl"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400/80" />
              Myanmar's trusted taxi rental platform
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Myanmar's Trusted<br />
              <span className="text-amber-400">Taxi Rental</span> Platform
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-xl mx-auto">
              Connect car owners with verified taxi drivers. Safe, reliable rentals with full deposit protection and dispute resolution.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-amber-500 text-white hover:bg-amber-500/90 shadow-lg shadow-amber-500/20">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white/90 hover:bg-white/[0.18] backdrop-blur-xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-5"
          >
            {[
              { value: '500+', label: 'Cars Listed', icon: <Car className="w-5 h-5" /> },
              { value: '1,000+', label: 'Verified Drivers', icon: <Users className="w-5 h-5" /> },
              { value: '50+', label: 'Cities', icon: <TrendingUp className="w-5 h-5" /> },
              { value: '98%', label: 'Satisfaction', icon: <Star className="w-5 h-5" /> },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="rounded-xl border border-white/20 bg-white/10 p-6 text-center shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center mx-auto mb-3 text-amber-400">
                  {stat.icon}
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/65">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white/70 backdrop-blur-xl">
              Simple Process
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              How It Works
            </h2>
            <p className="text-white/65 max-w-xl mx-auto">
              Simple process for both car owners and taxi drivers
            </p>
          </motion.div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { step: '01', title: 'Register & Verify', desc: 'Create your account and submit your documents for verification.', icon: <Shield className="w-8 h-8" /> },
              { step: '02', title: 'List or Browse', desc: 'Owners list cars, drivers browse and book verified vehicles.', icon: <Car className="w-8 h-8" /> },
              { step: '03', title: 'Rent & Earn', desc: 'Drive safely, complete inspections, and enjoy secure payments.', icon: <DollarSign className="w-8 h-8" /> },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={itemVariants}
                className="group relative rounded-xl border border-white/20 bg-white/10 p-8 text-center shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition hover:border-amber-400/30 hover:bg-white/[0.13]"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4 text-amber-400 transition group-hover:bg-amber-400/20 group-hover:scale-105">
                  {item.icon}
                </div>
                <div className="text-xs font-semibold text-amber-400/70 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/65">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative border-t border-white/10 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white/70 backdrop-blur-xl">
              Why Choose Us
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Why Choose TaxiRental Myanmar?
            </h2>
            <p className="text-white/65">Built for the Myanmar taxi industry</p>
          </motion.div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid md:grid-cols-3 gap-5"
          >
            {[
              { title: 'Verified System', desc: 'Every user, car, and document is verified by our admin team.', icon: <Shield className="w-6 h-6" /> },
              { title: 'Deposit Protection', desc: 'Deposits are securely held and released only after successful completion.', icon: <DollarSign className="w-6 h-6" /> },
              { title: 'Dispute Resolution', desc: 'Fair dispute handling with admin mediation and deposit protection.', icon: <Star className="w-6 h-6" /> },
              { title: 'Inspection Process', desc: 'Pre and post-rental inspections ensure car condition accountability.', icon: <CheckCircle className="w-6 h-6" /> },
              { title: 'Multiple Payments', desc: 'Support for KBZPay, WavePay, AyaPay, CBPay, and bank transfers.', icon: <TrendingUp className="w-6 h-6" /> },
              { title: 'Local Support', desc: 'Myanmar-based support team ready to help in Burmese and English.', icon: <Users className="w-6 h-6" /> },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="rounded-xl border border-white/20 bg-white/10 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition hover:border-amber-400/20 hover:bg-white/[0.13]"
              >
                <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center mb-3 text-amber-400">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/65">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/10 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/20 bg-white/10 p-12 md:p-16 text-center shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-white/65 mb-8 max-w-xl mx-auto">
              Join hundreds of car owners and taxi drivers across Myanmar.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register?role=owner">
                <Button size="lg" className="bg-amber-500 text-white hover:bg-amber-500/90 shadow-lg shadow-amber-500/20">
                  Register as Owner
                </Button>
              </Link>
              <Link to="/register?role=driver">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white/90 hover:bg-white/[0.18] backdrop-blur-xl">
                  Register as Driver
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

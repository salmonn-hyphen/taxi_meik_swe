import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'How do I register as a car owner?',
    a: 'Click "Get Started" and select "Register as Owner". Fill in your details, upload required documents (NRC, Owner Book, Vehicle Registration), and wait for admin verification.',
  },
  {
    q: 'How do I register as a taxi driver?',
    a: 'Click "Get Started" and select "Register as Driver". Submit your details, driving license, and required documents. Once verified, you can browse and book cars.',
  },
  {
    q: 'How long does verification take?',
    a: 'Verification typically takes 24-48 hours. Our admin team reviews all documents carefully to ensure platform safety.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We support KBZPay, WavePay, AyaPay, CBPay, bank transfers, and cash payments.',
  },
  {
    q: 'How does the deposit system work?',
    a: 'Drivers pay a security deposit before renting a car. The deposit is held securely and released after the car is returned in good condition.',
  },
  {
    q: 'What happens if there is damage to the car?',
    a: 'Damage reports can be submitted with evidence photos. Our admin team reviews and mediates disputes. Deposit deductions may apply based on the damage assessment.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Yes, but cancellation policies apply. Please check the specific terms when booking.',
  },
  {
    q: 'How do inspections work?',
    a: 'Inspections are conducted before and after each rental. Both owner and driver sign off on the car condition to ensure accountability.',
  },
]

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">Everything you need to know about TaxiRental Myanmar</p>
      </motion.div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center bg-muted/20 justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors text-left"
            >
              <span className="font-medium text-sm">{faq.q}</span>
              <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform ml-2', openIndex === i && 'rotate-180')} />
            </button>
            {openIndex === i && (
              <div className="px-4 py-3 text-sm text-white rounded-b-xl bg-muted/10">
                {faq.a}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

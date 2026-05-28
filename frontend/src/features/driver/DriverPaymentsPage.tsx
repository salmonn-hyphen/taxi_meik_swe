import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { paymentsApi } from '@/api'
import type { Payment } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatCurrency } from '@/utils/format'
import { DollarSign } from 'lucide-react'

export function DriverPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paymentsApi.getMyPayments().then((res) => setPayments(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton type="list" />
  if (payments.length === 0) return <div className="space-y-6"><h1 className="text-2xl font-bold">Payments</h1><EmptyState title="No payments" description="Payment history will appear here." /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="grid gap-3">
        {payments.map((payment) => (
          <motion.div key={payment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><DollarSign className="w-5 h-5" /></div>
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{payment.method || 'No payment action'} &middot; {formatDate(payment.paid_at)}</p>
                  </div>
                </div>
                <StatusBadge status={payment.status} type="payment" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

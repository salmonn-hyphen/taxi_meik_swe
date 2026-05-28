import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign } from 'lucide-react'
import { paymentsApi } from '@/api'
import type { Payment } from '@/types'
import { PAYMENT_METHODS } from '@/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileUploader } from '@/components/shared/FileUploader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useToast } from '@/providers'
import { formatCurrency, formatDate } from '@/utils/format'

export function OwnerPaymentsPage() {
  const { addToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('kbzpay')
  const [uploadingId, setUploadingId] = useState<string | number | null>(null)

  const availablePaymentMethods = PAYMENT_METHODS.filter((method) =>
    ['kbzpay', 'wavepay', 'ayapay'].includes(method.value),
  )

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      const res = await paymentsApi.getOwnerPayments()
      setPayments(res.data)
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (payment: Payment, file: File) => {
    try {
      setUploadingId(payment.id)
      const formData = new FormData()
      formData.append('method', paymentMethod)
      formData.append('screenshot', file)
      await paymentsApi.submitPayment(payment.booking_id, formData)
      addToast('Owner commission submitted for review', 'success')
      loadPayments()
    } catch {
      addToast('Payment upload failed', 'error')
    } finally {
      setUploadingId(null)
    }
  }

  if (loading) return <LoadingSkeleton type="list" />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Owner Payments</h1>

      {payments.length === 0 ? (
        <EmptyState title="No owner payments" description="Commission payments will appear after bookings are approved." />
      ) : (
        <div className="grid gap-3">
          {payments.map((payment) => {
            const canUpload = ['incomplete', 'failed'].includes(payment.status)

            return (
              <motion.div key={payment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Booking #{payment.booking_id} &middot; {formatDate(payment.paid_at)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round((payment.commission_rate || 0) * 100)}% owner commission
                            {payment.commission_amount ? ` (${formatCurrency(payment.commission_amount)})` : ''}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={payment.status} type="payment" />
                    </div>

                    {canUpload && (
                      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-wrap gap-2">
                          {availablePaymentMethods.map((method) => (
                            <Button
                              key={method.value}
                              type="button"
                              size="sm"
                              variant={paymentMethod === method.value ? 'default' : 'outline'}
                              onClick={() => setPaymentMethod(method.value)}
                            >
                              <span className="mr-1">{method.icon}</span>
                              {method.label}
                            </Button>
                          ))}
                        </div>
                        <FileUploader
                          label={uploadingId === payment.id ? 'Uploading...' : 'Upload owner commission proof'}
                          onUpload={(file) => handleUpload(payment, file)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

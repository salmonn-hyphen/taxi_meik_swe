import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, DollarSign, Car, User, Shield, AlertTriangle, Star, Camera, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FileUploader } from '@/components/shared/FileUploader'
import { PAYMENT_METHODS } from '@/constants'
import { bookingsApi, paymentsApi, depositsApi, damageReportsApi, disputesApi, reviewsApi } from '@/api'
import { useAuth, useToast } from '@/providers'
import type { Booking, Payment, Deposit } from '@/types'
import { formatDate, formatCurrency } from '@/utils/format'

export function DriverBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('kbzpay')

  const availablePaymentMethods = PAYMENT_METHODS.filter((method) =>
    ['kbzpay', 'wavepay', 'ayapay'].includes(method.value),
  )

  const selectedPaymentMethod = availablePaymentMethods.find((method) => method.value === paymentMethod) || availablePaymentMethods[0]
  const agencyPaymentDetails: Record<string, { accountName: string; accountNumber: string; qrImage: string }> = {
    kbzpay: {
      accountName: 'Taxi Meik Swe Agency',
      accountNumber: '09 000 111 222',
      qrImage: createQrPlaceholder('KBZPAY', '09 000 111 222'),
    },
    wavepay: {
      accountName: 'Taxi Meik Swe Agency',
      accountNumber: '09 000 333 444',
      qrImage: createQrPlaceholder('WAVEPAY', '09 000 333 444'),
    },
    ayapay: {
      accountName: 'Taxi Meik Swe Agency',
      accountNumber: '09 000 555 666',
      qrImage: createQrPlaceholder('AYAPAY', '09 000 555 666'),
    },
  }
  const selectedAgencyPayment = agencyPaymentDetails[selectedPaymentMethod?.value || 'kbzpay']

  useEffect(() => {
    if (id) loadBooking(id)
  }, [id])

  const loadBooking = async (bookingId: string | number) => {
    try {
      const data = await bookingsApi.getDriverBooking(bookingId)
      setBooking(data)
    } catch {
      navigate('/driver/bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!booking) return
    try {
      await bookingsApi.cancelBooking(booking.id)
      addToast('Booking cancelled', 'success')
      loadBooking(booking.id)
      setCancelOpen(false)
    } catch {
      addToast('Failed to cancel', 'error')
    }
  }

  const handlePaymentUpload = async (file: File) => {
    if (!booking) return
    try {
      const formData = new FormData()
      formData.append('method', paymentMethod)
      formData.append('screenshot', file)
      await paymentsApi.submitPayment(booking.id, formData)
      addToast('Payment submitted for review', 'success')
      setShowPaymentForm(false)
      loadBooking(booking.id)
    } catch {
      addToast('Payment upload failed', 'error')
    }
  }

  const handleDepositUpload = async (file: File) => {
    if (!booking) return
    try {
      const formData = new FormData()
      formData.append('payment_method', paymentMethod)
      formData.append('screenshot', file)
      await depositsApi.submitDeposit(booking.id, formData)
      addToast('Deposit submitted', 'success')
      setShowDepositForm(false)
      loadBooking(booking.id)
    } catch {
      addToast('Deposit upload failed', 'error')
    }
  }

  if (loading) return <LoadingSkeleton type="detail" />
  if (!booking) return null

  const paymentStatus = booking.payment_status || booking.payment?.status || 'incomplete'
  const depositStatus = booking.deposit_status || booking.deposit?.status || 'incomplete'
  const canSubmitPayment = booking.status === 'accepted' && ['incomplete', 'failed'].includes(paymentStatus)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Booking #{booking.id}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{booking.car?.brand} {booking.car?.model}</p>
              </div>
              <StatusBadge status={booking.status} type="booking" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="font-medium">{booking.owner?.name || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-semibold text-primary">{formatCurrency(booking.total_amount)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(booking.start_date)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDate(booking.end_date)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <div className="mt-1">
                  <StatusBadge status={paymentStatus} type="payment" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Deposit Status</p>
                <div className="mt-1">
                  <StatusBadge status={depositStatus} type="deposit" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {booking.status === 'requested' && (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>Cancel Booking</Button>
              )}
              {canSubmitPayment && !showPaymentForm && (
                <Button onClick={() => setShowPaymentForm(true)}><DollarSign className="w-4 h-4 mr-2" /> Submit Payment</Button>
              )}
              {paymentStatus === 'confirmed' && depositStatus === 'incomplete' && !showDepositForm && (
                <Button onClick={() => setShowDepositForm(true)}><Shield className="w-4 h-4 mr-2" /> Submit Deposit</Button>
              )}
              {booking.status === 'completed' && (
                <Button onClick={() => navigate(`/driver/reviews?booking=${booking.id}`)}><Star className="w-4 h-4 mr-2" /> Leave Review</Button>
              )}
            </div>

            {showPaymentForm && (
              <Card>
                <CardContent className="space-y-4 p-4">
                  <PaymentMethodPanel
                    title="Payment Method"
                    amount={booking.total_amount}
                    methods={availablePaymentMethods}
                    selectedMethod={paymentMethod}
                    agencyPayment={selectedAgencyPayment}
                    onSelect={setPaymentMethod}
                  />
                  <FileUploader label="Upload payment proof" onUpload={handlePaymentUpload} />
                </CardContent>
              </Card>
            )}

            {showDepositForm && (
              <Card>
                <CardContent className="space-y-4 p-4">
                  <PaymentMethodPanel
                    title="Deposit Method"
                    amount={booking.deposit?.amount}
                    methods={availablePaymentMethods}
                    selectedMethod={paymentMethod}
                    agencyPayment={selectedAgencyPayment}
                    onSelect={setPaymentMethod}
                  />
                  <FileUploader label="Upload deposit proof" onUpload={handleDepositUpload} />
                </CardContent>
              </Card>
            )}

            {booking.driver_notes && (
              <div>
                <p className="text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground">{booking.driver_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking?"
        variant="destructive"
        confirmLabel="Cancel Booking"
        onConfirm={handleCancel}
      />
    </div>
  )
}

function PaymentMethodPanel({
  title,
  amount,
  methods,
  selectedMethod,
  agencyPayment,
  onSelect,
}: {
  title: string
  amount?: number | null
  methods: Array<{ value: string; label: string; icon: string }>
  selectedMethod: string
  agencyPayment: { accountName: string; accountNumber: string; qrImage: string }
  onSelect: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">Choose a payment method, scan the agency QR code, then upload your payment slip.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {methods.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onSelect(method.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              selectedMethod === method.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted'
            }`}
          >
            <span className="mr-1">{method.icon}</span>
            {method.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[160px_1fr]">
        <div className="flex aspect-square items-center justify-center rounded-lg bg-white p-3">
          <img src={agencyPayment.qrImage} alt="Agency payment QR code" className="h-full w-full object-contain" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <QrCode className="h-4 w-4" />
            Agency QR Code
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Account:</span> {agencyPayment.accountName}</p>
            <p><span className="text-muted-foreground">Phone:</span> {agencyPayment.accountNumber}</p>
            {amount ? <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(amount)}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function createQrPlaceholder(method: string, accountNumber: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <rect width="180" height="180" fill="white"/>
      <rect x="14" y="14" width="44" height="44" fill="#0f172a"/>
      <rect x="22" y="22" width="28" height="28" fill="white"/>
      <rect x="30" y="30" width="12" height="12" fill="#0f172a"/>
      <rect x="122" y="14" width="44" height="44" fill="#0f172a"/>
      <rect x="130" y="22" width="28" height="28" fill="white"/>
      <rect x="138" y="30" width="12" height="12" fill="#0f172a"/>
      <rect x="14" y="122" width="44" height="44" fill="#0f172a"/>
      <rect x="22" y="130" width="28" height="28" fill="white"/>
      <rect x="30" y="138" width="12" height="12" fill="#0f172a"/>
      <path d="M74 18h10v10H74zM96 18h10v20H96zM72 42h28v10H72zM112 72h12v12h-12zM132 72h24v10h-24zM72 74h12v24H72zM92 70h10v10H92zM108 96h48v10h-48zM70 112h22v10H70zM104 118h10v28h-10zM122 122h10v10h-10zM144 118h12v38h-12zM76 144h18v12H76zM96 156h34v10H96z" fill="#0f172a"/>
      <text x="90" y="91" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">${method}</text>
      <text x="90" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#475569">${accountNumber}</text>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

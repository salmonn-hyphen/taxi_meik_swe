import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { agreementsApi, type Agreement } from '@/api/agreements'
import { useAuth } from '@/providers'
import { formatDate } from '@/utils/format'

function agreementPath(role: string | undefined, id: string | number) {
  const normalizedRole = role?.toUpperCase()
  if (normalizedRole === 'OWNER') return `/owner/agreements/${id}`
  if (normalizedRole === 'DRIVER') return `/driver/agreements/${id}`
  return `/admin/agreements/${id}`
}

function parseRentalMonths(value?: string | null) {
  if (!value) return null
  const match = String(value).match(/\d+/)
  return match ? Number(match[0]) : null
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function getAgreementExpireDate(agreement: Agreement) {
  const startDate = agreement.created_at ? new Date(agreement.created_at) : new Date()
  const rentalMonths = parseRentalMonths(agreement.car?.rental_period)

  if (rentalMonths) return addMonths(startDate, rentalMonths)
  if (agreement.end_date) return new Date(agreement.end_date)
  return null
}

export function AgreementListCard() {
  const { user } = useAuth()
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAgreements = async () => {
      try {
        const data = await agreementsApi.list()
        setAgreements(data)
      } catch {
        setAgreements([])
      } finally {
        setLoading(false)
      }
    }

    loadAgreements()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Agreement Forms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading agreements...</p>
        ) : agreements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agreement forms yet.</p>
        ) : (
          agreements.slice(0, 5).map((agreement) => {
            const expireDate = getAgreementExpireDate(agreement)

            return (
              <div key={agreement.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {agreement.car?.brand} {agreement.car?.model}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Sent {agreement.agreement_sent_at ? formatDate(agreement.agreement_sent_at) : 'recently'}</p>
                  <p>Rental period: {agreement.car?.rental_period || 'Not set'}</p>
                  <p>Expires: {expireDate ? formatDate(expireDate.toISOString()) : 'Not set'}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Owner: {agreement.owner_agreement_agreed_at ? 'Agreed' : 'Pending'}</span>
                  <span>Driver: {agreement.driver_agreement_agreed_at ? 'Agreed' : 'Pending'}</span>
                </div>
                <Link to={agreementPath(user?.role, agreement.id)}>
                  <Button size="sm" variant="outline" className="mt-3 w-full">
                    Open Agreement
                  </Button>
                </Link>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

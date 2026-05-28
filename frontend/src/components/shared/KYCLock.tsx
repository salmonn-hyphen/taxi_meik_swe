import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth, useRole } from '@/providers'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isKycApproved } from '@/constants'

interface KYCLockProps {
  children: React.ReactNode
  feature: string
}

export function KYCLock({ children, feature }: KYCLockProps) {
  const { user, refreshUser } = useAuth()
  const { isDriver } = useRole()

  useEffect(() => {
    if (!isKycApproved(user?.verification_status)) {
      refreshUser().catch(() => {
        // Keep showing the lock if the current session cannot be refreshed.
      })
    }
  }, [refreshUser, user?.verification_status])

  if (isKycApproved(user?.verification_status)) {
    return <>{children}</>
  }

  const kycPath = isDriver ? '/driver/documents' : '/owner/documents'

  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-[2px] p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold mb-1">KYC Verification Required</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-4">
          Please complete your identity verification to access {feature}.
        </p>
        <Link to={kycPath}>
          <Button>
            Go to KYC <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
      <div className="pointer-events-none select-none blur-sm opacity-30">
        {children}
      </div>
    </div>
  )
}

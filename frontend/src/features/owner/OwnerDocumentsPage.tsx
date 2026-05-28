import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, FileCheck, Save, XCircle } from 'lucide-react'
import { FileUploader } from '@/components/shared/FileUploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { usersApi } from '@/api'
import { useAuth, useToast } from '@/providers'
import type { OwnerDocument, OwnerProfile } from '@/types'
import { normalizeVerificationStatus, OWNER_KYC_DOCUMENT_TYPES } from '@/constants'

const statusCopy = {
  verified: {
    title: 'KYC Approved',
    description: 'Your owner information has been verified.',
    icon: CheckCircle,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  rejected: {
    title: 'KYC Rejected',
    description: 'Please update your information and upload clear NRC images again.',
    icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  pending: {
    title: 'KYC Under Review',
    description: 'Your submitted information is waiting for admin review.',
    icon: Clock,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  },
  unverified: {
    title: 'KYC Required',
    description: 'Submit your NRC number, address, and both NRC images.',
    icon: FileCheck,
    className: 'border-gray-200 bg-gray-50 text-gray-700',
  },
}

function profileStatus(profile: OwnerProfile | null) {
  if (profile?.admin_approval_status === 'APPROVED') return 'approved'
  if (profile?.admin_approval_status === 'REJECTED') return 'rejected'
  return 'pending'
}

export function OwnerDocumentsPage() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<OwnerProfile | null>(null)
  const [documents, setDocuments] = useState<OwnerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [form, setForm] = useState({ nrc_text: '', address: '' })

  useEffect(() => {
    loadKyc()
  }, [])

  const loadKyc = async () => {
    try {
      const [profileData, documentData] = await Promise.all([
        usersApi.getOwnerProfile(),
        usersApi.getOwnerDocuments(),
      ])
      setProfile(profileData)
      setDocuments(documentData)
      setForm({
        nrc_text: profileData.nrc_text || profileData.nrc_number || '',
        address: profileData.address || '',
      })
      if (profileData.user) {
        updateUser({
          ...profileData.user,
          verification_status: normalizeVerificationStatus(profileData.admin_approval_status) as any,
        })
      }
    } catch {
      addToast('Failed to load KYC information', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.nrc_text.trim()) {
      addToast('NRC number is required', 'error')
      return
    }

    try {
      setSaving(true)
      const updated = await usersApi.updateOwnerProfile({
        nrc_text: form.nrc_text.trim(),
        address: form.address.trim(),
      })
      setProfile(updated)
      setForm({
        nrc_text: updated.nrc_text || updated.nrc_number || '',
        address: updated.address || '',
      })
      addToast('KYC information saved', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save KYC information', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (type: string, file: File) => {
    try {
      setUploading(type)
      const doc = await usersApi.uploadOwnerDocument(type, file)
      setDocuments((prev) => [...prev.filter((item) => item.type !== type), doc])
      addToast('Document uploaded successfully', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Upload failed', 'error')
    } finally {
      setUploading(null)
    }
  }

  const getDoc = (type: string) => documents.find((document) => document.type === type)

  if (loading) return <LoadingSkeleton type="card" count={3} />

  const verificationStatus = profile
    ? normalizeVerificationStatus(profile.admin_approval_status)
    : normalizeVerificationStatus(user?.verification_status)
  const banner = statusCopy[verificationStatus as keyof typeof statusCopy] || statusCopy.unverified
  const BannerIcon = banner.icon

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Owner KYC</h1>
          <p className="text-muted-foreground">Manage the information used to verify your owner account.</p>
        </div>
        <StatusBadge status={verificationStatus} type="verification" />
      </div>

      <div className={`flex items-start gap-3 rounded-lg border p-4 ${banner.className}`}>
        <BannerIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">{banner.title}</p>
          <p className="text-sm opacity-90">{banner.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">KYC Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="owner-nrc">NRC Number</Label>
              <Input
                id="owner-nrc"
                value={form.nrc_text}
                onChange={(event) => setForm((current) => ({ ...current, nrc_text: event.target.value }))}
                placeholder="12/ABC(N)123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Approval Status</Label>
              <div className="flex h-10 items-center">
                <StatusBadge status={profileStatus(profile)} type="document" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-address">Address</Label>
            <textarea
              id="owner-address"
              rows={3}
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Street, quarter, township"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Button type="button" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save KYC Info'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {OWNER_KYC_DOCUMENT_TYPES.map((doc) => {
          const existing = getDoc(doc.key)
          return (
            <motion.div key={doc.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium">{doc.label}</CardTitle>
                    <StatusBadge status={existing?.status || 'not_uploaded'} type="document" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {existing?.file_url && (
                    <img src={existing.file_url} alt={doc.label} className="h-36 w-full rounded-lg object-cover" />
                  )}

                  {existing?.status === 'approved' ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Approved
                    </div>
                  ) : existing?.status === 'rejected' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                        <XCircle className="h-4 w-4" /> Rejected
                      </div>
                      {existing.admin_notes && <p className="text-xs text-muted-foreground">Reason: {existing.admin_notes}</p>}
                      <FileUploader
                        label={`Re-upload ${doc.label}`}
                        onUpload={(file) => handleUpload(doc.key, file)}
                        uploading={uploading === doc.key}
                      />
                    </div>
                  ) : (
                    <>
                      {existing?.status === 'pending' && (
                        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-600">
                          <Clock className="h-4 w-4" /> Under review
                        </div>
                      )}
                      <FileUploader
                        label={`${existing?.file_url ? 'Replace' : 'Upload'} ${doc.label}`}
                        onUpload={(file) => handleUpload(doc.key, file)}
                        uploading={uploading === doc.key}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

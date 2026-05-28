import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUploader } from '@/components/shared/FileUploader'
import { KYCLock } from '@/components/shared/KYCLock'
import { carsApi } from '@/api'
import { useToast } from '@/providers'
import type { Car } from '@/types'

type CarPostForm = {
  brand: string
  model: string
  year: string
  color: string
  license_number: string
  fuel_type: 'petrol' | 'diesel' | 'electric' | ''
  owner_book: string
  rental_period: string
  rental_payment_type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | ''
  rental_type: 'DRIVER_HOME' | 'OWNER_HOME' | ''
  rental_price: string
  deposit_amount: string
}

const initialForm: CarPostForm = {
  brand: '',
  model: '',
  year: '',
  color: '',
  license_number: '',
  fuel_type: '',
  owner_book: '',
  rental_period: '',
  rental_payment_type: '',
  rental_type: '',
  rental_price: '',
  deposit_amount: '0',
}

const imageLabels = [
  { key: 'front_image', label: 'Front Image' },
  { key: 'back_image', label: 'Back Image' },
  { key: 'left_image', label: 'Left Image' },
  { key: 'right_image', label: 'Right Image' },
] as const

function readFileData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function OwnerCarFormPage() {
  return (
    <KYCLock feature="Post Car">
      <OwnerCarFormContent />
    </KYCLock>
  )
}

function OwnerCarFormContent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!id)
  const [uploading, setUploading] = useState<string | null>(null)
  const [form, setForm] = useState<CarPostForm>(initialForm)
  const [images, setImages] = useState<Record<string, string>>({})
  const isEditing = !!id

  useEffect(() => {
    if (!id) return

    const loadCar = async () => {
      try {
        const car = await carsApi.getById(id)

        if (car.status === 'verified' || car.admin_approval_status === 'APPROVED') {
          addToast('Approved cars cannot be edited', 'error')
          navigate('/owner/cars')
          return
        }

        setForm(carToForm(car))
        if (car.images) {
          setImages({
            front_image: car.images.front_image,
            back_image: car.images.back_image,
            left_image: car.images.left_image,
            right_image: car.images.right_image,
          })
        }
      } catch (err: any) {
        addToast(err.response?.data?.error || 'Failed to load car', 'error')
        navigate('/owner/cars')
      } finally {
        setInitialLoading(false)
      }
    }

    loadCar()
  }, [id, navigate, addToast])

  const setField = (key: keyof CarPostForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleImage = async (key: string, file: File) => {
    try {
      setUploading(key)
      const data = await readFileData(file)
      setImages((current) => ({ ...current, [key]: data }))
    } finally {
      setUploading(null)
    }
  }

  const validate = () => {
    const required: Array<keyof CarPostForm> = [
      'brand',
      'model',
      'license_number',
      'fuel_type',
      'owner_book',
      'rental_payment_type',
      'rental_type',
      'rental_price',
    ]

    if (required.some((key) => !String(form[key]).trim())) {
      addToast('Please fill all required car fields', 'error')
      return false
    }

    if (imageLabels.some((image) => !images[image.key])) {
      addToast('Please upload all four car images', 'error')
      return false
    }

    return true
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        rental_price: Number(form.rental_price),
        deposit_amount: Number(form.deposit_amount || 0),
        ...images,
      }

      if (isEditing && id) {
        await carsApi.update(id, payload)
        addToast('Car updated and sent back for admin approval', 'success')
      } else {
        await carsApi.create(payload)
        addToast('Car submitted for admin approval', 'success')
      }
      navigate('/owner/cars')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to post car', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return <div className="max-w-4xl mx-auto"><Card><CardContent className="p-6 text-sm text-muted-foreground">Loading car...</CardContent></Card></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Car' : 'Post Car'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input value={form.brand} onChange={(event) => setField('brand', event.target.value)} placeholder="Toyota" />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input value={form.model} onChange={(event) => setField('model', event.target.value)} placeholder="Crown" />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input type="number" value={form.year} onChange={(event) => setField('year', event.target.value)} placeholder="2020" />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={form.color} onChange={(event) => setField('color', event.target.value)} placeholder="White" />
                </div>
                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input value={form.license_number} onChange={(event) => setField('license_number', event.target.value)} placeholder="YGN-1234" />
                </div>
                <div className="space-y-2">
                  <Label>Fuel Type</Label>
                  <Select value={form.fuel_type} onValueChange={(value) => setField('fuel_type', value)}>
                    <SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">EV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Owner Book</Label>
                <Input value={form.owner_book} onChange={(event) => setField('owner_book', event.target.value)} placeholder="Owner book number or reference" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select value={form.rental_payment_type} onValueChange={(value) => setField('rental_payment_type', value)}>
                    <SelectTrigger><SelectValue placeholder="Payment type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rental Type</Label>
                  <Select value={form.rental_type} onValueChange={(value) => setField('rental_type', value)}>
                    <SelectTrigger><SelectValue placeholder="Rental type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRIVER_HOME">Driver Home</SelectItem>
                      <SelectItem value="OWNER_HOME">Owner Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rental Period</Label>
                  <Input value={form.rental_period} onChange={(event) => setField('rental_period', event.target.value)} placeholder="e.g. 3 months" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rental Price (MMK)</Label>
                  <Input type="number" value={form.rental_price} onChange={(event) => setField('rental_price', event.target.value)} placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <Label>Deposit Amount (MMK)</Label>
                  <Input type="number" value={form.deposit_amount} onChange={(event) => setField('deposit_amount', event.target.value)} placeholder="200000" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {imageLabels.map((image) => (
                  <div key={image.key} className="space-y-2">
                    <Label>{image.label}</Label>
                    <FileUploader
                      label={`${images[image.key] ? 'Replace' : 'Upload'} ${image.label}`}
                      preview={images[image.key]}
                      onUpload={(file) => handleImage(image.key, file)}
                      uploading={uploading === image.key}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate('/owner/cars')}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : isEditing ? 'Update Car' : 'Submit Car'}
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function carToForm(car: Car): CarPostForm {
  return {
    brand: car.brand || '',
    model: car.model || '',
    year: car.year ? String(car.year) : '',
    color: car.color || '',
    license_number: car.license_number || car.license_plate || '',
    fuel_type: car.fuel_type === 'ev' ? 'electric' : (car.fuel_type as CarPostForm['fuel_type']) || '',
    owner_book: car.owner_book || '',
    rental_period: car.rental_period || '',
    rental_payment_type: car.rental_payment_type || '',
    rental_type: car.rental_type || '',
    rental_price: car.rental_price ? String(car.rental_price) : String(car.daily_rate || ''),
    deposit_amount: String(car.deposit_amount || 0),
  }
}

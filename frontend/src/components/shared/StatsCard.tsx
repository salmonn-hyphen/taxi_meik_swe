import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: 'up' | 'down'
  trendValue?: string
  className?: string
}

export function StatsCard({ title, value, icon, description, trend, trendValue, className }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('hover:shadow-md transition-shadow', className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text font-semibold">{value}</p>
              {trend && (
                <p className={cn(
                  'text-xs font-medium',
                  trend === 'up' ? 'text-emerald-600' : 'text-red-600',
                )}>
                  {trendValue} {trend === 'up' ? '↑' : '↓'}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

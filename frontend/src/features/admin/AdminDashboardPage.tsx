import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Car,
  DollarSign,
  AlertTriangle,
  CalendarCheck,
  Shield,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  UserCheck,
  CheckCircle,
  FileCheck,
  CreditCard,
  History,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { adminApi } from '@/api'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { AdminDashboardStats } from '@/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setRefreshing(true)
      const data = await adminApi.getDashboardStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load admin stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-slate-50 p-3 rounded-lg border border-slate-800 shadow-xl text-xs space-y-1">
          <p className="font-semibold text-slate-400">{payload[0].payload.month}</p>
          <p className="font-bold text-slate-100">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2 w-1/3">
            <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-80 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Calculate some derived metrics
  const totalVerificationsPending =
    (stats?.pending_owner_verifications || 0) +
    (stats?.pending_driver_verifications || 0) +
    (stats?.pending_car_verifications || 0)

  return (
    <div className="space-y-6 p-1 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin Console</h1>
          <p className="text-sm text-slate-500 mt-1">Platform metrics, audit trail, and verification queues.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
          onClick={loadDashboard}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Sync Data'}
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Platform Users',
            value: stats?.total_users || 0,
            description: `Owners: ${stats?.total_owners || 0} • Drivers: ${stats?.total_drivers || 0}`,
            icon: <Users className="w-5 h-5 text-slate-600" />,
            bg: 'bg-slate-50',
          },
          {
            title: 'Platform Revenue',
            value: formatCurrency(stats?.total_revenue || 0),
            description: 'Cumulative system earnings',
            icon: <DollarSign className="w-5 h-5 text-slate-600" />,
            bg: 'bg-slate-50',
          },
          {
            title: 'Active Bookings',
            value: stats?.active_bookings || 0,
            description: 'Ongoing taxi rentals',
            icon: <CalendarCheck className="w-5 h-5 text-slate-600" />,
            bg: 'bg-slate-50',
          },
          {
            title: 'Active Disputes',
            value: stats?.active_disputes || 0,
            description: 'Requiring administrative review',
            icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
            bg: 'bg-amber-50/50 border-amber-100',
            badge: stats?.active_disputes ? { count: stats.active_disputes, variant: 'destructive' as const } : null,
          },
        ].map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="hover:shadow-sm transition-all duration-200 border-slate-100 bg-white relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.title}</p>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{card.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.bg} border border-slate-100 transition-colors`}>
                    {card.icon}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                  <span className="text-xs text-slate-500 font-medium truncate">{card.description}</span>
                  {card.badge && (
                    <Badge variant={card.badge.variant} className="text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                      {card.badge.count} Active
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center border-b pb-1 border-slate-100">
          <TabsList className="bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
            <TabsTrigger
              value="overview"
              className="text-xs px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="backlog"
              className="text-xs px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold transition-all"
            >
              Pending Reviews ({totalVerificationsPending + (stats?.pending_payment_approvals || 0)})
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="text-xs px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold transition-all"
            >
              Activity Logs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 focus:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Area Chart */}
            <Card className="lg:col-span-2 border-slate-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold text-slate-800">Financial Growth</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Platform commission earnings trends over the past few months.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Flat Color Theme</span>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {stats?.revenue_chart && stats.revenue_chart.length > 0 ? (
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={stats.revenue_chart} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#64748b" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="#64748b"
                          fontSize={11}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${(v / 1000).toLocaleString()}k`}
                          dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#475569"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-60 flex items-center justify-center border border-dashed rounded-lg border-slate-200">
                    <p className="text-sm text-slate-400">No transaction records available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Panel */}
            <Card className="border-slate-100 bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800">Quick Actions</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Critical pending items requiring approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: 'Verify Owners',
                    count: stats?.pending_owner_verifications || 0,
                    icon: <UserCheck className="w-4 h-4" />,
                    color: 'text-slate-700 bg-slate-100',
                    path: '/admin/verifications/owners',
                  },
                  {
                    label: 'Verify Drivers',
                    count: stats?.pending_driver_verifications || 0,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'text-slate-700 bg-slate-100',
                    path: '/admin/verifications/drivers',
                  },
                  {
                    label: 'Verify Vehicles',
                    count: stats?.pending_car_verifications || 0,
                    icon: <FileCheck className="w-4 h-4" />,
                    color: 'text-slate-700 bg-slate-100',
                    path: '/admin/verifications/cars',
                  },
                  {
                    label: 'Approve Payments',
                    count: stats?.pending_payment_approvals || 0,
                    icon: <CreditCard className="w-4 h-4" />,
                    color: 'text-slate-700 bg-slate-100',
                    path: '/admin/payments',
                  },
                ].map((action) => (
                  <a
                    key={action.label}
                    href={action.path}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all group duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${action.color}`}>{action.icon}</div>
                      <span className="text-sm font-semibold text-slate-700">{action.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {action.count > 0 ? (
                        <Badge variant="destructive" className="font-bold text-[10px] px-1.5">
                          {action.count}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-medium text-[10px] px-1.5 bg-slate-100 text-slate-500">
                          0
                        </Badge>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors group-hover:translate-x-0.5 duration-200" />
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Pending Reviews */}
        <TabsContent value="backlog" className="space-y-6 focus:outline-none">
          <Card className="border-slate-100 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Pending Reviews Queue</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Detailed backlog count of entities awaiting administrative KYC verification or payment processing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: 'Owner KYC',
                    count: stats?.pending_owner_verifications || 0,
                    description: 'Identity & NRC details uploaded',
                    path: '/admin/verifications/owners',
                  },
                  {
                    title: 'Driver KYC',
                    count: stats?.pending_driver_verifications || 0,
                    description: 'Driving license & NRC details',
                    path: '/admin/verifications/drivers',
                  },
                  {
                    title: 'Car Submissions',
                    count: stats?.pending_car_verifications || 0,
                    description: 'Vehicle photos & owner book details',
                    path: '/admin/verifications/cars',
                  },
                  {
                    title: 'Payment Approvals',
                    count: stats?.pending_payment_approvals || 0,
                    description: 'Screenshots & transaction reference slips',
                    path: '/admin/payments',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-5 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <div className="flex items-end justify-between mt-6">
                      <div className="text-3xl font-extrabold text-slate-900">{item.count}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-600 hover:text-slate-900 p-0 h-auto gap-1"
                        asChild
                      >
                        <a href={item.path}>
                          Review Queue <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Activity Logs */}
        <TabsContent value="audit" className="focus:outline-none">
          <Card className="border-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-5 border-b border-slate-50">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold text-slate-800">System Activity Log</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Recent actions executed by administrators on the platform.
                </CardDescription>
              </div>
              <History className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent className="pt-6">
              {stats?.recent_activities && stats.recent_activities.length > 0 ? (
                <div className="relative pl-6 border-l border-slate-100 space-y-6">
                  {stats.recent_activities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-slate-200 group-hover:bg-slate-400 transition-colors">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(activity.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-400">No actions recorded in the audit log.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

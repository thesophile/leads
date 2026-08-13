import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import Layout from '../Layout/Layout'

const CONVERSION_DATA = [
  { name: 'Total Leads', value: 5736, color: '#3b82f6', rate: '100%' },
  { name: 'Contacted', value: 3820, color: '#6366f1', rate: '66.5%' },
  { name: 'Interested', value: 1240, color: '#8b5cf6', rate: '21.6%' },
  { name: 'Quotations', value: 680, color: '#f59e0b', rate: '11.8%' },
  { name: 'Approved', value: 245, color: '#f97316', rate: '4.2%' },
  { name: 'Orders Won', value: 198, color: '#10b981', rate: '3.4%' },
]

// Lead acquisition trend over the last 8 months
const MONTHLY_TREND = [
  { month: 'Jan', leads: 620, contacted: 402 },
  { month: 'Feb', leads: 735, contacted: 498 },
  { month: 'Mar', leads: 684, contacted: 455 },
  { month: 'Apr', leads: 812, contacted: 560 },
  { month: 'May', leads: 745, contacted: 510 },
  { month: 'Jun', leads: 902, contacted: 634 },
  { month: 'Jul', leads: 738, contacted: 522 },
  { month: 'Aug', leads: 500, contacted: 239 },
]

// Lead source distribution
const SOURCE_DATA = [
  { name: 'Google Search', value: 1920, color: '#3b82f6' },
  { name: 'Instagram Campaign', value: 1380, color: '#8b5cf6' },
  { name: 'Facebook Ads', value: 940, color: '#f59e0b' },
  { name: 'Customer Referral', value: 760, color: '#10b981' },
  { name: 'Official Website', value: 522, color: '#f97316' },
  { name: 'Manual Entry', value: 214, color: '#64748b' },
]

// Quotation → Order conversion by month (monthly revenue in ₹ Lakh)
const MONTHLY_QUOTATIONS = [
  { month: 'Jan', quotations: 42, orders: 12 },
  { month: 'Feb', quotations: 51, orders: 16 },
  { month: 'Mar', quotations: 47, orders: 14 },
  { month: 'Apr', quotations: 60, orders: 19 },
  { month: 'May', quotations: 55, orders: 17 },
  { month: 'Jun', quotations: 68, orders: 22 },
  { month: 'Jul', quotations: 49, orders: 15 },
]

// Staff sales performance
const TEAM_PERFORMANCE = [
  { name: 'Priya Sharma', quotations: 48, orders: 15 },
  { name: 'Alex Joseph', quotations: 41, orders: 12 },
  { name: 'NIMISHA DAVIS', quotations: 36, orders: 11 },
  { name: 'Ananya Nair', quotations: 29, orders: 8 },
  { name: 'Shanu VR', quotations: 26, orders: 9 },
]

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
  fontSize: '11px',
  padding: '8px 12px',
}

function ActivityIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function ChartCard({ title, subtitle, badge, headerRight, children, className = '', bodyClass = 'p-5' }) {
  return (
    <div className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <ActivityIcon />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          {badge && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className={`flex-1 ${bodyClass}`}>{children}</div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [chartMode, setChartMode] = useState('funnel') // 'funnel' | 'bar'

  const chipTones = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-emerald-50 text-emerald-600',
  }

  const pillTones = {
    up: 'text-emerald-700 bg-emerald-50',
    down: 'text-amber-700 bg-amber-50',
    urgent: 'bg-red-50 text-red-700',
    neutral: 'bg-sky-50 text-sky-700',
  }

  // Sample KPI metrics directly from BRD specs
  const kpis = [
    { label: 'Total Leads', value: '5,736', trend: 'up', change: '+12%', tone: 'blue', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Calls Today', value: '42', trend: 'up', change: '+8%', tone: 'violet', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { label: 'Hot Leads', value: '18', trend: 'urgent', change: 'Urgent', tone: 'red', isHighlight: true, icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
    { label: 'Follow-ups Due', value: '24', trend: 'down', change: '8 Overdue', tone: 'amber', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Open Quotations', value: '680', trend: 'neutral', change: '₹ 1.2Cr', tone: 'orange', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Orders Won', value: '198', trend: 'up', change: '+15%', tone: 'green', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  ]

  // Priority hot leads
  const hotLeads = [
    {
      id: 'LEAD-005627',
      company: 'NEW LIFE MATERNITY HOSPITAL',
      category: 'Hospital',
      phone: '8714546783',
      status: 'Interested',
      priority: 'Hot',
      assignedTo: 'Shanu',
      nextAction: 'Create Quotation',
      due: 'Today 11:30 AM',
    },
    {
      id: 'LEAD-005634',
      company: 'SHADES.IN LUXERY EYEWEAR',
      category: 'Cosmetics Store',
      phone: '9845123991',
      status: 'Quotation Pending',
      priority: 'Hot',
      assignedTo: 'Alex',
      nextAction: 'Send Quotation',
      due: 'Today 02:00 PM',
    },
    {
      id: 'LEAD-005649',
      company: 'MANZOOR SUPER SPECIALITY HOSPITAL',
      category: 'Hospital',
      phone: '9447118234',
      status: 'Interested',
      priority: 'Hot',
      assignedTo: 'Shanu',
      nextAction: 'Call Back',
      due: 'Today 04:30 PM',
    },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Dashboard</h1>
            <p className="text-sm text-slate-500">
              Unified Lead-to-Order sales pipeline and operational overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/raw-leads')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-600/20 hover:from-brand-700 hover:to-brand-800 transition"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              + Add New Lead
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className={`group relative overflow-hidden rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-200 sm:p-4 ${
                kpi.isHighlight
                  ? 'border-brand-200 ring-1 ring-brand-100'
                  : 'border-slate-200/80 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {kpi.isHighlight && (
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 to-brand-400" />
              )}
              <div className="relative flex items-start justify-between">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${chipTones[kpi.tone]}`}>
                  <svg className="h-[18px] w-[18px] sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
                  </svg>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pillTones[kpi.trend]}`}>
                  {kpi.trend === 'up' && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M8 7h9v9" />
                    </svg>
                  )}
                  {kpi.trend === 'down' && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 7l10 10M17 8v9H8" />
                    </svg>
                  )}
                  {kpi.trend === 'urgent' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
                  {kpi.change}
                </span>
              </div>
              <p className="relative mt-3 truncate text-[11px] font-medium text-slate-500 sm:text-xs">
                {kpi.label}
              </p>
              <p className={`relative mt-0.5 text-xl font-bold tracking-tight sm:text-2xl ${kpi.isHighlight ? 'text-brand-700' : 'text-slate-900'}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* ============ LEAD ACQUISITION & SOURCES ROW ============ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Lead Acquisition Trend */}
          <ChartCard
            title="Lead Acquisition Trend"
            subtitle="Inbound leads vs contacted, last 8 months"
            badge="Jan – Aug"
            className="lg:col-span-7"
          >
            <div className="h-64 text-[11px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_TREND} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="contactGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" strokeWidth={2.5} fill="url(#leadGrad)" />
                  <Area type="monotone" dataKey="contacted" name="Contacted" stroke="#10b981" strokeWidth={2.5} fill="url(#contactGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Lead Sources Donut */}
          <ChartCard
            title="Lead Sources"
            subtitle="Acquisition channels breakdown"
            badge="6 Channels"
            className="lg:col-span-5"
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={SOURCE_DATA}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {SOURCE_DATA.map((s, i) => (
                        <Cell key={`source-${i}`} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [`${Number(val).toLocaleString()} leads`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2.5">
                {SOURCE_DATA.map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                      <span className="font-medium">{s.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {s.value.toLocaleString()}
                      <span className="ml-1 text-[10px] font-medium text-slate-400">
                        {Math.round((s.value / 5736) * 100)}%
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ============ CONVERSION FUNNEL & HOT LEADS ROW ============ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sales Funnel Card */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:col-span-7">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <ActivityIcon />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Lead-to-Order Conversion Funnel</h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">5,736 leads → 198 orders won</p>
                </div>
              </div>
              <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartMode('funnel')}
                  className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                    chartMode === 'funnel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Funnel
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('bar')}
                  className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                    chartMode === 'bar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>

            <div className="p-5">
              {chartMode === 'funnel' ? (
                <div className="w-full space-y-3 py-1">
                  {CONVERSION_DATA.map((s) => {
                    const pct = (s.value / CONVERSION_DATA[0].value) * 100
                    return (
                      <div key={s.name} className="grid grid-cols-[92px_1fr_58px] items-center gap-3">
                        <span
                          className="truncate text-right text-[11px] font-semibold text-slate-600"
                          title={s.name}
                        >
                          {s.name}
                        </span>
                        <div className="flex justify-center">
                          <div
                            className="relative flex h-10 items-center justify-center overflow-hidden rounded-lg transition-all duration-300"
                            style={{
                              width: `${Math.max(pct, 7)}%`,
                              background: `linear-gradient(90deg, ${s.color}bb, ${s.color})`,
                              boxShadow: `0 2px 10px ${s.color}40`,
                            }}
                          >
                            <span className="px-2 font-mono text-[11px] font-black tracking-wide text-white drop-shadow-sm">
                              {s.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[10.5px] font-bold text-emerald-600">
                          {s.rate}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CONVERSION_DATA} layout="vertical" margin={{ top: 0, right: 15, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      stroke="#475569"
                      width={100}
                      tick={{ fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name, item) => [`${Number(val).toLocaleString()} leads (${item.payload.rate})`, 'Count']} />
                    <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} barSize={20}>
                      {CONVERSION_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom metrics */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 px-5 py-4 sm:grid-cols-6">
              {CONVERSION_DATA.map((s, i) => (
                <div key={s.name} className={`rounded-lg border bg-slate-50 p-2 text-center ${i === 0 ? 'border-brand-100 bg-brand-50/50' : 'border-slate-100'}`}>
                  <span className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500 truncate" title={s.name}>
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-black text-slate-900">
                    {s.value.toLocaleString()}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-600">{s.rate}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Hot Leads */}
          <div className="rounded-2xl border border-brand-200/90 bg-white p-6 shadow-sm lg:col-span-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-base font-bold text-slate-900">🔥 Hot Leads Requiring Action</h2>
              </div>
              <button
                onClick={() => navigate('/tele-calling')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {hotLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-brand-300 hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block font-mono text-[11px] font-semibold text-brand-600">
                        {lead.id}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {lead.company}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {lead.category} • {lead.phone}
                      </p>
                    </div>
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                      {lead.priority}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                    <div>
                      <span className="text-slate-400">Next: </span>
                      <span className="font-semibold text-slate-700">{lead.nextAction}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => navigate('/tele-calling')}
                        className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition cursor-pointer"
                      >
                        Action
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============ PIPELINE & PERFORMANCE ROW ============ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Quotation → Order Conversion */}
          <ChartCard
            title="Quotation & Order Pipeline"
            subtitle="Quotations created vs orders won, per month"
            badge="Monthly"
            className="lg:col-span-7"
          >
            <div className="h-64 text-[11px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_QUOTATIONS} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="quotations" name="Quotations" fill="#8b5cf6" radius={[5, 5, 0, 0]} barSize={16} />
                  <Bar dataKey="orders" name="Orders Won" fill="#10b981" radius={[5, 5, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Staff Sales Performance */}
          <ChartCard
            title="Team Sales Performance"
            subtitle="Quotations & orders generated by staff"
            badge="Live"
            className="lg:col-span-5"
          >
            <div className="h-64 text-[11px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TEAM_PERFORMANCE} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    stroke="#475569"
                    width={90}
                    tick={{ fontSize: 10.5, fontWeight: 600 }}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="quotations" name="Quotations" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={8} />
                  <Bar dataKey="orders" name="Orders" fill="#10b981" radius={[0, 4, 4, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>
    </Layout>
  )
}
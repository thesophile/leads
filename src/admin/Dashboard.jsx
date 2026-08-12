import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
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

function ActivityIcon() {
  return (
    <svg className="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
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

        {/* Main Grid: Funnel & Hot Leads */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sales Funnel Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.01)] lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ActivityIcon />
                  Lead-to-Order Conversion Funnel
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  Live Pipeline
                </span>
              </div>
              
              <div className="h-56 w-full text-[11px]">
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
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontSize: '11px' }}
                      formatter={(val, name, item) => [`${Number(val).toLocaleString()} leads (${item.payload.rate})`, 'Count']}
                    />
                    <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} barSize={14}>
                      {CONVERSION_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom metrics */}
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 border-t border-slate-100 pt-3 text-center">
              {CONVERSION_DATA.map((s) => (
                <div key={s.name} className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
                  <span className="block text-[10px] font-medium text-slate-500 truncate" title={s.name}>
                    {s.name}
                  </span>
                  <span className="block font-mono text-xs font-bold text-slate-900">
                    {s.value.toLocaleString()}
                  </span>
                  <span className="block text-[9.5px] font-bold text-emerald-600">
                    {s.rate}
                  </span>
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
      </div>
    </Layout>
  )
}

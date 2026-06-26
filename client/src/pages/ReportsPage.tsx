import { useState } from 'react'
import { FileText, Download, Bot, BarChart2, Shield, Rocket } from 'lucide-react'
import { aiApi } from '../lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const REPORT_TYPES = [
  {
    id: 'executive', icon: BarChart2, title: 'Executive Report',
    description: 'AI-generated monthly executive summary with KPI performance, risks, and initiative status.',
    color: 'border-brand-500 bg-brand-50',
    iconColor: 'text-brand-700 bg-brand-100',
  },
  {
    id: 'risk', icon: Shield, title: 'Risk Report',
    description: 'Comprehensive risk register with heat map, mitigation status, and recommendations.',
    color: 'border-red-400 bg-red-50',
    iconColor: 'text-red-700 bg-red-100',
  },
  {
    id: 'initiative', icon: Rocket, title: 'Initiative Status Report',
    description: 'Portfolio summary of all strategic initiatives, completion rates, and budget utilization.',
    color: 'border-purple-400 bg-purple-50',
    iconColor: 'text-purple-700 bg-purple-100',
  },
  {
    id: 'kpi', icon: BarChart2, title: 'KPI Performance Report',
    description: 'Detailed KPI trend analysis with variance, forecasts, and perspective breakdown.',
    color: 'border-green-500 bg-green-50',
    iconColor: 'text-green-700 bg-green-100',
  },
]

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [reports, setReports] = useState<Record<string, string>>({})

  const generate = async (type: string) => {
    setGenerating(type)
    try {
      const { data } = await aiApi.generateReport(type, new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
      setReports(prev => ({ ...prev, [type]: data.report }))
      toast.success('Report generated')
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const downloadReport = (type: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-report-${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">AI-powered reports — generate, review, and export</p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map(({ id, icon: Icon, title, description, color, iconColor }) => (
          <div key={id} className={clsx('card p-5 border-l-4', color)}>
            <div className="flex items-start gap-4">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconColor)}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => generate(id)}
                    disabled={!!generating}
                    className="btn-primary text-sm py-1.5"
                  >
                    <Bot size={13} />
                    {generating === id ? 'Generating…' : 'Generate with AI'}
                  </button>
                  {reports[id] && (
                    <button onClick={() => downloadReport(id, reports[id])} className="btn-secondary text-sm py-1.5">
                      <Download size={13} /> Download
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Report preview */}
            {generating === id && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${80 - i * 10}%` }} />)}
                </div>
              </div>
            )}

            {reports[id] && generating !== id && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2 font-medium">Generated Report Preview</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reports[id]}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scheduled reports info */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Scheduled Reports</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set up automatic report delivery via email on a schedule. Configure recipients and frequency.
        </p>
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <FileText size={20} className="text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Scheduled report delivery coming soon</p>
            <p className="text-xs text-gray-500">Monthly executive reports via email · PDF export · Custom templates</p>
          </div>
        </div>
      </div>
    </div>
  )
}

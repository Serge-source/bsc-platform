import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Clock, Users, CheckSquare } from 'lucide-react'
import { api } from '../lib/api'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format, isToday, isTomorrow, isPast } from 'date-fns'

function MeetingForm({ onSubmit, onCancel, loading }: any) {
  const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', location: '', status: 'SCHEDULED' })
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div><label className="label">Meeting Title *</label><input className="input" value={form.title} onChange={set('title')} required /></div>
      <div><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Start *</label><input type="datetime-local" className="input" value={form.startTime} onChange={set('startTime')} required /></div>
        <div><label className="label">End</label><input type="datetime-local" className="input" value={form.endTime} onChange={set('endTime')} /></div>
      </div>
      <div><label className="label">Location / Link</label><input className="input" value={form.location} onChange={set('location')} placeholder="Room A or https://meet.example.com/…" /></div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Create Meeting'}</button>
      </div>
    </form>
  )
}

function MeetingCard({ meeting, onClick }: { meeting: any; onClick: () => void }) {
  const start = new Date(meeting.startTime)
  const isNow = !isPast(start)
  const label = isToday(start) ? 'Today' : isTomorrow(start) ? 'Tomorrow' : format(start, 'EEE, MMM d')

  return (
    <div onClick={onClick} className="card p-4 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className={clsx('text-xs font-semibold', isToday(start) ? 'text-brand-700' : isTomorrow(start) ? 'text-purple-600' : 'text-gray-500')}>
            {label}
          </span>
          <p className="font-semibold text-gray-900 mt-0.5">{meeting.title}</p>
        </div>
        <StatusBadge status={meeting.status} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={11} /> {format(start, 'h:mm a')}
          {meeting.endTime && ` – ${format(new Date(meeting.endTime), 'h:mm a')}`}
        </span>
        {meeting.location && <span className="flex items-center gap-1 truncate max-w-xs">📍 {meeting.location}</span>}
        {meeting.attendees?.length > 0 && (
          <span className="flex items-center gap-1">
            <Users size={11} /> {meeting.attendees.length} attendees
          </span>
        )}
      </div>
      {meeting.agendaItems?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Agenda ({meeting.agendaItems.length} items)</p>
          <div className="space-y-0.5">
            {meeting.agendaItems.slice(0, 2).map((a: any) => (
              <p key={a.id} className="text-xs text-gray-600 truncate">· {a.title}</p>
            ))}
            {meeting.agendaItems.length > 2 && <p className="text-xs text-gray-400">+{meeting.agendaItems.length - 2} more</p>}
          </div>
        </div>
      )}
      {meeting.actionItems?.length > 0 && (
        <div className="mt-1">
          <span className="text-xs text-orange-600 flex items-center gap-1">
            <CheckSquare size={10} /> {meeting.actionItems.filter((a: any) => a.status === 'OPEN').length} open actions
          </span>
        </div>
      )}
    </div>
  )
}

export default function MeetingsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => api.get('/meetings', { params: { limit: 50, orderBy: 'startTime' } }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (v: any) => api.post('/meetings', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meetings'] }); setShowCreate(false); toast.success('Meeting created') },
    onError: () => toast.error('Failed'),
  })

  const meetings = data?.items || []

  // Group by date
  const groups: Record<string, any[]> = {}
  meetings.forEach((m: any) => {
    const key = format(new Date(m.startTime), 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  })

  const upcoming = meetings.filter((m: any) => !isPast(new Date(m.startTime))).length
  const today = meetings.filter((m: any) => isToday(new Date(m.startTime))).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{today} today · {upcoming} upcoming</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={15} /> Schedule Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Today', value: today, color: 'text-brand-700' },
          { label: 'Upcoming', value: upcoming, color: 'text-purple-700' },
          { label: 'Total', value: meetings.length, color: 'text-gray-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={clsx('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Meeting list grouped by date */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : Object.keys(groups).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groups).sort().map(([dateKey, items]) => {
            const date = new Date(dateKey + 'T12:00:00')
            return (
              <div key={dateKey}>
                <h3 className={clsx('text-sm font-semibold mb-3',
                  isToday(date) ? 'text-brand-700' : isTomorrow(date) ? 'text-purple-700' : 'text-gray-500'
                )}>
                  {isToday(date) ? '📅 Today' : isTomorrow(date) ? '📅 Tomorrow' : format(date, 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((m: any) => <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m)} />)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 flex flex-col items-center text-gray-400">
          <Calendar size={40} className="mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No meetings scheduled</p>
          <p className="text-sm mt-1">Schedule your first strategic review meeting</p>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Schedule Meeting" size="md">
        <MeetingForm onSubmit={createMutation.mutate} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />
      </Modal>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.title} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Start</p><p className="font-medium">{format(new Date(selected.startTime), 'PPPp')}</p></div>
              {selected.endTime && <div><p className="text-gray-500">End</p><p className="font-medium">{format(new Date(selected.endTime), 'p')}</p></div>}
              {selected.location && <div className="col-span-2"><p className="text-gray-500">Location</p><p className="font-medium">{selected.location}</p></div>}
              {selected.description && <div className="col-span-2"><p className="text-gray-500">Description</p><p>{selected.description}</p></div>}
            </div>

            {selected.agendaItems?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Agenda</h4>
                <ol className="space-y-1">
                  {selected.agendaItems.map((a: any, i: number) => (
                    <li key={a.id} className="flex gap-2 text-sm"><span className="text-gray-400">{i + 1}.</span><span>{a.title}</span></li>
                  ))}
                </ol>
              </div>
            )}

            {selected.decisions?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Decisions</h4>
                <ul className="space-y-1">
                  {selected.decisions.map((d: any) => <li key={d.id} className="text-sm text-gray-700">✓ {d.decision}</li>)}
                </ul>
              </div>
            )}

            {selected.actionItems?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Action Items</h4>
                <div className="space-y-1">
                  {selected.actionItems.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm">
                      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', a.status === 'DONE' ? 'bg-green-500' : 'bg-orange-400')} />
                      {a.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Sparkles, FileText, TrendingUp, RefreshCw } from 'lucide-react'
import { aiApi } from '../lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const STARTER_PROMPTS = [
  { icon: TrendingUp, label: 'Performance Overview', prompt: 'Give me a summary of our current KPI performance and which areas need attention.' },
  { icon: FileText,   label: 'Generate Report',     prompt: 'Generate an executive summary report for this month highlighting key achievements and risks.' },
  { icon: Bot,        label: 'Risk Analysis',        prompt: 'Analyze our open risks and tell me which ones are most likely to impact our strategic objectives.' },
  { icon: Sparkles,   label: 'Strategic Insights',   prompt: 'Based on current performance data, what strategic adjustments would you recommend for the next quarter?' },
]

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-3 max-w-4xl', isUser && 'ml-auto flex-row-reverse')}>
      <div className={clsx('w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5',
        isUser ? 'bg-brand-700 text-white' : 'bg-gradient-to-br from-purple-500 to-brand-600 text-white'
      )}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={clsx('rounded-2xl px-4 py-3 max-w-2xl',
        isUser ? 'bg-brand-700 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className={clsx('text-xs mt-1.5 opacity-60', isUser ? 'text-right' : '')}>
          {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Strategic Advisor powered by Claude. I have access to your organization's KPIs, risks, and initiatives. Ask me anything about your performance data, or request an executive report. How can I help you today?",
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [reportLoading, setReportLoading] = useState(false)
  const [report, setReport] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'report'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await aiApi.chat(text, conversationId)
      setConversationId(data.conversationId)
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: new Date() }])
    } catch {
      toast.error('Failed to get response')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const generateReport = async () => {
    setReportLoading(true)
    setActiveTab('report')
    try {
      const { data } = await aiApi.generateReport('monthly', new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
      setReport(data.report)
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setReportLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared. How can I help you with your strategic performance data?",
      timestamp: new Date(),
    }])
    setConversationId(undefined)
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-brand-600 flex items-center justify-center">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Strategic Advisor</h1>
            <p className="text-xs text-gray-500">Powered by Claude · Has access to your live KPI, Risk & Initiative data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={generateReport} disabled={reportLoading} className="btn-secondary text-sm">
            <FileText size={14} />
            {reportLoading ? 'Generating…' : 'Generate Report'}
          </button>
          <button onClick={clearChat} className="btn-secondary text-sm">
            <RefreshCw size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-shrink-0">
        {(['chat', 'report'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab ? 'border-brand-700 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab === 'chat' ? '💬 Chat' : '📄 Executive Report'}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

            {loading && (
              <div className="flex gap-3 max-w-4xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Starter prompts — show when only 1 message (the greeting) */}
          {messages.length === 1 && (
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              {STARTER_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-brand-700" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about KPI trends, risks, performance… (Enter to send, Shift+Enter for new line)"
                className="w-full resize-none input pr-12 py-3 max-h-40"
                style={{ height: 'auto' }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="btn-primary h-11 w-11 p-0 justify-center flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Report tab */
        <div className="flex-1 overflow-y-auto">
          {reportLoading ? (
            <div className="card p-12 flex flex-col items-center text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full mb-4" />
              <p>Generating executive report with AI…</p>
              <p className="text-xs mt-1">Analyzing KPIs, risks, and initiatives</p>
            </div>
          ) : report ? (
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Executive Report</h2>
                  <p className="text-sm text-gray-500 mt-0.5">AI-generated · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <button onClick={() => window.print()} className="btn-secondary text-sm">Print / PDF</button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {report}
              </div>
            </div>
          ) : (
            <div className="card p-12 flex flex-col items-center text-gray-400">
              <FileText size={40} className="mb-3 opacity-30" />
              <p>Click "Generate Report" to create an AI executive report</p>
              <p className="text-xs mt-1">Includes KPI summary, risk analysis, initiative status, and recommendations</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

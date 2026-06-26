import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader, FileText, Zap, ChevronRight, RotateCcw } from 'lucide-react'
import { aiApi } from '../lib/api'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
  type?: 'question' | 'report'
}

const SUGGESTED_QUESTIONS = [
  'Which strategic objectives are currently at risk?',
  'What initiatives will have the greatest impact on customer satisfaction?',
  'Which KPIs are trending below target?',
  'What are our top 5 open risks by score?',
  'How is our Learning & Growth perspective performing?',
  'Which initiatives are behind schedule?',
]

export default function AICopilotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (question: string, type: 'question' | 'report' = 'question') => {
    if (!question.trim() || isLoading) return
    const userMsg: Message = { role: 'user', content: question, type }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    try {
      const { data } = await aiApi.copilot(question, type)
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = () => sendMessage('Generate a comprehensive quarterly executive performance report', 'report')

  return (
    <div className="flex flex-col h-full max-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI Copilot</h1>
            <p className="text-xs text-gray-500">Powered by Claude · Connected to your live performance data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={generateReport} disabled={isLoading}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-violet-300 text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 disabled:opacity-50">
            <FileText size={14} /> Quarterly Report
          </button>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="text-white" size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-gray-500 text-sm">I have access to all your KPIs, objectives, risks, and initiatives. Ask me anything about your organization's performance.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-left text-sm text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-colors group">
                  <Zap size={14} className="text-violet-400 flex-shrink-0 group-hover:text-violet-600" />
                  <span>{q}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <strong>Tip:</strong> I can answer strategic questions, analyze at-risk objectives, compare initiative impacts, and generate executive reports — all based on your live data.
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="text-white" size={14} />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-violet-600 text-white ml-8' : 'bg-white border border-gray-200 text-gray-800'}`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-800 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>p]:text-sm [&>ul]:text-sm [&>ol]:text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bot className="text-white" size={14} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-gray-400">
                  <Loader size={14} className="animate-spin" />
                  <span className="text-sm">Analyzing your performance data...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about your strategy, KPIs, risks, or initiatives..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            disabled={isLoading}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

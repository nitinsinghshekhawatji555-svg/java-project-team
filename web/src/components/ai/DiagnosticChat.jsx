'use client'

import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react'
import { Send, Zap, ChevronDown, Wrench } from 'lucide-react'
import DiagnosticResult from '@/components/ai/DiagnosticResult'
import { useAuth } from '@/hooks/useAuth'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { buildFallbackDiagnosis } from '@/lib/ai/ruleFallback'

const quickPrompts = ["Car won't start", 'Grinding when braking', 'Engine overheating', 'Check engine light']

function subscribeToStorage(callback) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export default function DiagnosticChat({ onDiagnosisComplete }) {
  const { user } = useAuth()
  const isKeyboardOpen = useKeyboardOpen()
  const storageKey = user?.id ? `roadrescue_ai_history_${user.id}` : null

  const getSnapshot = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return '[]'
    return localStorage.getItem(storageKey) || '[]'
  }, [storageKey])

  const rawStored = useSyncExternalStore(subscribeToStorage, getSnapshot, () => '[]')
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [promptsVisible, setPromptsVisible] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const messageIdRef = useRef(0)
  const isHydratedRef = useRef(false)

  // Initialize once on mount with stored messages if local state is empty
  useEffect(() => {
    if (!isHydratedRef.current && rawStored) {
      try {
        const parsed = JSON.parse(rawStored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          isHydratedRef.current = true
          queueMicrotask(() => {
            setMessages(parsed)
            messageIdRef.current = parsed.reduce((max, msg) => Math.max(max, msg.id || 0), 0)
          })
        }
      } catch (e) {
        console.error('Failed to parse stored chat history', e)
      }
    }
  }, [rawStored])

  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const isEmpty = messages.length === 0 || messages.every((m) => !m.text && !m.diagnosisData)

  // Hide quick prompts when keyboard opens to free vertical space
  useEffect(() => {
    const handleFocus = () => setPromptsVisible(false)
    const handleBlur = () => setTimeout(() => setPromptsVisible(true), 200)
    const el = inputRef.current
    if (el) {
      el.addEventListener('focus', handleFocus)
      el.addEventListener('blur', handleBlur)
    }
    return () => {
      if (el) {
        el.removeEventListener('focus', handleFocus)
        el.removeEventListener('blur', handleBlur)
      }
    }
  }, [])



  async function handleSendMessage(textToSend) {
    const currentInput = (textToSend || input).trim()
    if (!currentInput || loading) return

    messageIdRef.current += 1
    setMessages((prev) => [...prev, { id: messageIdRef.current, sender: 'user', text: currentInput }])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: currentInput }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        const fallbackDiagnosis = data?.diagnosis || buildFallbackDiagnosis(currentInput, data?.error || 'Diagnostic service error. Showing standard checks.')
        messageIdRef.current += 1
        setMessages((prev) => [...prev, { id: messageIdRef.current, sender: 'ai', diagnosisData: fallbackDiagnosis }])
        if (onDiagnosisComplete) onDiagnosisComplete(fallbackDiagnosis)
        return
      }

      const diagnosis = data.diagnosis || buildFallbackDiagnosis(currentInput)
      messageIdRef.current += 1
      setMessages((prev) => [...prev, { id: messageIdRef.current, sender: 'ai', diagnosisData: diagnosis }])
      if (onDiagnosisComplete) onDiagnosisComplete(diagnosis)
    } catch {
      const fallback = buildFallbackDiagnosis(currentInput, 'Network connection interrupted. Showing standard preliminary checks.')
      messageIdRef.current += 1
      setMessages((prev) => [...prev, { id: messageIdRef.current, sender: 'ai', diagnosisData: fallback }])
      if (onDiagnosisComplete) onDiagnosisComplete(fallback)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#FFF8EA]">

      {/* ── MESSAGE HISTORY (MIDDLE): The ONLY scrollable region ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-4 overscroll-contain">
        {isEmpty && !loading ? (
          <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5EDD0] text-[#7A261E] shadow-sm">
                <Wrench size={22} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-[#1F1B10]">How can I help diagnose your vehicle?</h3>
              <p className="max-w-xs text-sm text-[#6B5F4A]">Tell me what&#39;s happening — describe symptoms, sounds, or warning lights and I&#39;ll analyze possible causes and recommendations.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%]">
                  <div className={`mb-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    msg.sender === 'user'
                      ? 'bg-[#1F1B10] text-white'
                      : 'bg-[#F5EDD0] text-[#7A261E]'
                  }`}>
                    {msg.sender === 'user' ? 'You' : 'RoadRescue'}
                  </div>
                  <div
                    className={`wrap-break-word rounded-[28px] px-4 py-4 text-[14px] leading-7 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#1F1B10] text-white shadow-[0_10px_20px_-14px_rgba(27,23,12,0.7)] rounded-tr-[18px] rounded-bl-[18px]'
                        : 'bg-white border border-[#E5D0A7] text-[#2A261C] rounded-tl-[18px] rounded-br-[18px]'
                    }`}>
                    {msg.text && <p>{msg.text}</p>}
                    {msg.sender === 'ai' && msg.diagnosisData && (
                      <div className={msg.text ? 'mt-4 pt-4 border-t border-[#F3E6C5]' : ''}>
                        <DiagnosticResult diagnosis={msg.diagnosisData} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="max-w-[88%]">
                  <div className="mb-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] bg-[#F5EDD0] text-[#7A261E]">
                    RoadRescue
                  </div>
                  <div className="rounded-[28px] rounded-tl-[18px] rounded-br-[18px] border border-[#E5D0A7] bg-white px-5 py-3.5 shadow-sm flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#B8A060] animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-[#B8A060] animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-[#B8A060] animate-bounce" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8F7B45]">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── INPUT FOOTER (BOTTOM): Fixed group containing divider, suggestion chips, input bar ── */}
      <div className={`chat-has-bottom-nav shrink-0 z-40 bg-[#F6F2E7]/95 backdrop-blur-md border-t border-[#E0D5B7] shadow-[0_-4px_10px_rgba(0,0,0,0.04)] px-4 pt-3 transition-all duration-200 ${
        isKeyboardOpen ? 'pb-3 md:pb-4' : 'pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-4'
      }`}>

        {/* Suggestion Chips Row */}
        {promptsVisible && (
          <div className="relative mb-3">
            <div className="flex gap-2 overflow-x-auto px-0.5 pb-1 scrollbar-none">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendMessage(prompt)}
                  className="whitespace-nowrap rounded-full border border-[#D8C99A] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#4A4330] shadow-2xs transition hover:bg-[#F5EDD0] hover:border-[#C0A860] disabled:opacity-40 active:scale-95 shrink-0 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Input Bar */}
        <div className="flex items-center gap-2 rounded-[28px] border border-[#DCCDA9] bg-white px-4 py-2 shadow-sm focus-within:border-[#B8A060] transition-colors">
  <textarea
    ref={inputRef}
    rows={1}
    value={input}
    disabled={loading}
    onChange={(e) => {
      setInput(e.target.value)
      e.target.style.height = 'auto'
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
        if (inputRef.current) {
          inputRef.current.style.height = 'auto'
        }
      }
    }}
    placeholder={loading ? "Diagnosing..." : "Describe your car's symptoms..."}
    className="min-w-0 flex-1 resize-none bg-transparent p-0 text-[16px] leading-6 text-[#2A261C] placeholder:text-[#A19258] outline-none disabled:opacity-50 max-h-[120px] overflow-y-auto block"
    style={{ height: '24px' }}
  />
  {/* send button */}
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => {
              handleSendMessage()
              if (inputRef.current) {
                inputRef.current.style.height = 'auto'
              }
            }}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A1609] text-white transition hover:bg-[#2C2410] disabled:opacity-30 active:scale-95 cursor-pointer mb-0.5"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>

    </div>
  )
}
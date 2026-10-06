'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Send, X, Shield, Wrench, User, Lock, MessageSquare } from 'lucide-react'
import { useRescueChat } from '@/hooks/useRescueChat'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import Spinner from '@/components/ui/Spinner'

export default function RescueChatPanel({
  requestId,
  contactName,
  contactRole = 'Mechanic',
  statusText,
  statusTone = 'success',
  initialStatus = null,
  onClose = null,
  isModal = false,
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const pathname = usePathname()
  const isKeyboardOpen = useKeyboardOpen()

  const {
    messages,
    requestStatus,
    driverId,
    mechanicId,
    currentUserId,
    isTerminal,
    isCompleted,
    isCancelled,
    loading,
    sending,
    sendMessage,
  } = useRescueChat(requestId, initialStatus)

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim() || !requestId || isTerminal || sending) return

    const messageText = input.trim()
    setInput('')
    const success = await sendMessage(messageText)
    if (!success) {
      // Restore input on failure so user doesn't lose their typed message
      setInput(messageText)
    }
  }

  // Format message time
  const formatMsgTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const hasMobileNav = !pathname?.startsWith('/dashboard/admin') && !isModal

  // Determine helper status pill
  const activeStatus = requestStatus || initialStatus || 'active'
  const isStatusCompleted = isCompleted || activeStatus === 'completed'
  const isStatusCancelled = isCancelled || activeStatus === 'cancelled'

  return (
    <div
      className={`flex flex-1 w-full flex-col overflow-hidden bg-[#F6F2E7] ${
        isModal ? 'h-[75dvh] max-h-[640px] rounded-2xl' : 'h-full'
      } ${hasMobileNav && !isKeyboardOpen ? 'has-mobile-nav' : ''}`}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 border-b border-[#DCCDA9] bg-[#FFFBF4]/95 backdrop-blur-md px-4 py-3.5 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-black text-[#1E1B15]">
                {contactName || (contactRole === 'Mechanic' ? 'Assigned Mechanic' : 'Assigned Driver')}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#1E1B15] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary shrink-0">
                {contactRole === 'Mechanic' ? <Wrench size={9} /> : <User size={9} />}
                {contactRole}
              </span>
            </div>
            <p className="truncate text-[11px] font-mono text-[#7C6B44]">
              {statusText || `Job #${requestId?.slice?.(0, 8)?.toUpperCase?.() || requestId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isStatusCompleted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Completed
            </span>
          ) : isStatusCancelled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-800 border border-red-200">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              Cancelled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             Online 
            </span>
          )}
        </div>
      </div>

      {/* ── MESSAGES VIEWPORT ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[#F6F2E7]/60">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-xs font-semibold text-[#7C6B44]">
            <Spinner />
            <span>Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFFBF4] border border-[#DCCDA9] text-[#7C6B44] mb-2 shadow-xs">
              <MessageSquare size={20} />
            </div>
            <p className="text-xs font-bold text-[#1E1B15]">No messages yet</p>
            <p className="text-[11px] text-[#7C6B44] mt-0.5 max-w-xs">
              Direct, real-time coordination between driver and mechanic for this rescue operation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = currentUserId ? msg.sender_id === currentUserId : false
            
            // Determine role of the message sender
            let senderRoleLabel = 'Participant'
            if (msg.sender_id === driverId) {
              senderRoleLabel = 'Driver'
            } else if (msg.sender_id === mechanicId) {
              senderRoleLabel = 'Mechanic'
            } else if (isMine) {
              senderRoleLabel = contactRole === 'Mechanic' ? 'Driver' : 'Mechanic'
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Sender badge */}
                <div className="flex items-center gap-1.5 px-1 text-[10px] font-mono font-bold text-[#7C6B44]">
                  <span>{isMine ? 'You' : senderRoleLabel}</span>
                  <span className="text-[9px] opacity-60">·</span>
                  <span className="text-[9px] opacity-75">{formatMsgTime(msg.created_at)}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                    isMine
                      ? 'bg-[#1E1B15] text-[#EFE8D4] rounded-tr-xs border border-white/10'
                      : 'bg-[#FFFBF4] text-[#1E1B15] rounded-tl-xs border border-[#DCCDA9]'
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            )
          })
        )}

        {/* ── TERMINAL NOTICE BANNER (COMPLETED / CANCELLED) ── */}
        {isTerminal && (
          <div className="my-3 rounded-xl border border-[#DCCDA9] bg-[#FFF9EF] p-3 text-center shadow-xs">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#7C6B44]">
              <Lock size={13} className="text-[#A29A84]" />
              <span>
                {isStatusCompleted
                  ? 'This job has been completed. Chat is closed.'
                  : 'This job has been cancelled. Chat is closed.'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT DOCK ── */}
      <div className="border-t border-[#DCCDA9] bg-[#FFFBF4]/90 backdrop-blur-md p-3 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isTerminal
                ? isStatusCompleted
                  ? 'This job has been completed. Chat is closed.'
                  : 'This job has been cancelled. Chat is closed.'
                : 'Type a message...'
            }
            disabled={!requestId || isTerminal || sending}
            className="flex-1 rounded-xl border border-[#DCCDA9] bg-white px-3.5 py-2.5 text-xs text-[#1E1B15] placeholder:text-[#A29A84] outline-none focus:border-[#1E1B15] focus:ring-1 focus:ring-[#1E1B15] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 transition-colors"
            style={{ fontSize: '14px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || !requestId || isTerminal || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E1B15] text-primary transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-xs"
            aria-label="Send message"
          >
            {sending ? <Spinner className="h-4 w-4 text-primary" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  )
}
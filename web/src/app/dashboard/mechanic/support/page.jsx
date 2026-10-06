'use client'

import { useState } from 'react'
import Link from 'next/link'
import PageWrapper from '@/components/layout/PageWrapper'
import Card from '@/components/ui/Card'
import { LifeBuoy, History, User, LayoutDashboard, PhoneCall, ChevronDown, ShieldAlert, FileText } from 'lucide-react'

export default function MechanicSupportPage() {
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    {
      id: 1,
      question: "How do I update my location tracking coordinates?",
      answer: "Location syncing is handled automatically while your browser tab is open and your status is toggled 'Go Online' on the main console. Ensure your mobile browser has granted exact location permissions to RoadRescue."
    },
    {
      id: 2,
      question: "What should I do if a driver cancels mid-route?",
      answer: "If a driver cancels a request while you are en route, your console state will automatically update, clear your navigation line, and return you immediately to the live dispatch pool."
    },
    {
      id: 3,
      question: "My verification status is still pending. How long does it take?",
      answer: "The administrative review team manually screens submitted licenses and garage metrics. Verifications typically complete within 24 to 48 business hours."
    }
  ]

  return (
    <PageWrapper 
      title="Support Center" 
      description="Access immediate dispatch help documentation, system troubleshooting tools, and emergency communication logs."
    >
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        
        {/* ================= PRIMARY HERO CALLOUT ================= */}
        <Card className="rounded-2xl border-slate-200 bg-slate-900 p-6 text-white shadow-sm relative overflow-hidden">
          <div className="max-w-xl relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <LifeBuoy size={14} /> Desk Operator Online
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight">Encountering an issue on a live scene?</h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Review standard operating guidelines below, jump to profile parameter logs, or call the automated dispatch line if you are stranded.
            </p>
          </div>
          {/* Subtle background graphic design touch */}
          <div className="absolute right-[-20px] bottom-[-20px] text-slate-800 opacity-20 pointer-events-none hidden md:block">
            <LifeBuoy size={160} />
          </div>
        </Card>

        {/* ================= QUICK INTERACTION ACTION COLUMNS ================= */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/dashboard/mechanic" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-all active:scale-98">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 group-hover:bg-primary group-hover:text-slate-900 transition-colors">
              <LayoutDashboard size={18} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">Return to Console</p>
            <p className="mt-1 text-xs text-slate-400 font-medium leading-normal">Go back to your active radar map and job cards.</p>
          </Link>

          <Link href="/dashboard/mechanic/account" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-all active:scale-98">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 group-hover:bg-primary group-hover:text-slate-900 transition-colors">
              <User size={18} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">Update Parameters</p>
            <p className="mt-1 text-xs text-slate-400 font-medium leading-normal">Modify coverage ranges, specialties, or contact data.</p>
          </Link>

          <Link href="/dashboard/mechanic/history" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-all active:scale-98">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 group-hover:bg-primary group-hover:text-slate-900 transition-colors">
              <History size={18} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">Review Activity Logs</p>
            <p className="mt-1 text-xs text-slate-400 font-medium leading-normal">Inspect past historical tickets and performance data.</p>
          </Link>
        </div>

        {/* ================= HOTLINE & FAQS SPLIT INTERFACE ================= */}
        <div className="grid gap-6 md:grid-cols-12">
          
          {/* ACCORDION FAQS WRAPPER */}
          <div className="space-y-3 md:col-span-7">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <FileText size={14} /> Frequently Asked Questions
            </h3>
            
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.id
              return (
                <div key={faq.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50/60"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={16} className={`text-slate-400 shrink-0 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`transition-all duration-200 ease-in-out ${isOpen ? 'max-h-40 border-t border-slate-100 bg-slate-50/30' : 'max-h-0'}`}>
                    <p className="p-4 text-xs font-medium leading-relaxed text-slate-500">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CRITICAL HOTLINE BOX SIDEBAR */}
          <div className="md:col-span-5">
            <Card className="rounded-2xl border-red-100 bg-red-50/40 p-5 shadow-sm border">
              <span className="text-[10px] bg-red-50 border border-red-200/60 font-bold uppercase tracking-wider text-red-700 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                <ShieldAlert size={12} /> Emergency Protocols
              </span>
              <h4 className="mt-3 text-sm font-black text-slate-900">Need Immediate Backup?</h4>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                If you encounter safety threats, fraudulent breakdown scenes, or severe vehicle system accidents, bypass the platform logs and route directly to local responders.
              </p>
              
              {/* Simulated operational mock telephone anchor callout */}
              <a 
                href="tel:+2330000000" 
                onClick={(e) => e.preventDefault()} 
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <PhoneCall size={14} /> Call Dispatch Line
              </a>
            </Card>
          </div>

        </div>

      </div>
    </PageWrapper>
  )
}
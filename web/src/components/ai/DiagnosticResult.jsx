import { AlertTriangle, Sparkles, CheckCircle2, Wrench } from 'lucide-react'
import Badge from '@/components/ui/Badge'

export function decodeHtmlEntities(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;|&#38;/g, '&')
    .replace(/&lt;|&#60;/g, '<')
    .replace(/&gt;|&#62;/g, '>')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#x2F;|&#47;/g, '/')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
}

const severityVariantMap = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
}

export default function DiagnosticResult({ diagnosis }) {
  if (!diagnosis) return null

  const { problem, severity, recommendations = [], estimated_causes = [], isFallback } = diagnosis

  const cleanProblem = decodeHtmlEntities(problem)
  const cleanCauses = (estimated_causes || []).map(decodeHtmlEntities)
  const cleanRecommendations = (recommendations || []).map(decodeHtmlEntities)

  return (
    <div className="space-y-3.5 text-[#1E1B15]">
      {isFallback && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 block">
              Basic Guidance (Offline / Fallback)
            </span>
            <p className="text-[11px] text-amber-800 leading-snug font-medium">
              AI diagnosis temporarily unavailable. Showing standard preliminary checks.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-[#DCCDA9]/60">
        <div className="flex items-center gap-1.5">
          {!isFallback && <Sparkles size={14} className="text-amber-600 shrink-0" />}
          <span className="text-xs font-black text-[#1E1B15] uppercase tracking-wider">
            {isFallback ? 'Preliminary Assessment' : 'AI Diagnosis'}
          </span>
        </div>
        <Badge label={severity} variant={severityVariantMap[severity] || 'default'} dot />
      </div>

      <div>
        <h4 className="text-sm font-black text-[#1E1B15] leading-snug">{cleanProblem}</h4>
      </div>

      {cleanCauses.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C6B44]">Likely Causes</p>
          <ul className="space-y-1.5">
            {cleanCauses.map((cause, idx) => (
              <li key={idx} className="text-xs text-[#1E1B15] font-semibold leading-relaxed flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cleanRecommendations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7C6B44]">Recommendations</p>
          <ul className="space-y-1.5">
            {cleanRecommendations.map((rec, idx) => (
              <li key={idx} className="text-xs text-[#1E1B15] font-semibold leading-relaxed flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


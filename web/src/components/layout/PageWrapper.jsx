export default function PageWrapper({
  title,
  description,
  children,
}) {
  return (
    <div className="space-y-6 lg:space-y-7 w-full max-w-full min-w-0 box-border overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-12">
      {/* The magic fix is in the bottom padding:
        - pb-[calc(env(safe-area-inset-bottom)+5.5rem)]: Gives ample breathing room on mobile so content clears the fixed navigation bar and the raised floating button smoothly.
        - md:pb-12: Standard, clean padding on desktop layout views where the bottom nav is hidden.
      */}
      
      {(title || description) && (
        <div className="flex flex-col gap-1.5 pt-4 md:pt-0 w-full max-w-full min-w-0">
          {title && (
            <h1 className="font-display text-2xl font-black tracking-tight text-[#1E1B15] lg:text-3xl break-words">
              {title}
            </h1>
          )}
          {description && (
            <p className="max-w-2xl text-xs lg:text-sm font-medium leading-relaxed text-[#7C7767] break-words">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Main page content node */}
      <div className="w-full max-w-full min-w-0 box-border">
        {children}
      </div>
    </div>
  )
}
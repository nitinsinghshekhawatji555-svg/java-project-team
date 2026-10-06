# RoadRescue Vercel Deployment Guide

## Phase 1: PRE-DEPLOYMENT CHECKLIST

### Step 1.1: Verify Environment Variables
- [ ] `.env.local` created from `.env.example` ✓
- [ ] All required variables filled in:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] GEMINI_API_KEY (for AI diagnostics)
  - [ ] RESEND_API_KEY
  - [ ] NEXT_PUBLIC_APP_URL (set to production domain)
- [ ] `.env` file is in `.gitignore` (check: manually never commit it)
- [ ] No credentials hardcoded anywhere in src/ folder

### Step 1.2: Verify Build Configuration
```bash
# Test build locally (should complete with no errors)
npm run build

# Output should contain:
# ✓ Compiled successfully
# ✓ Lint warnings: 0
# ✓ Ready in X.XXs
```

### Step 1.3: Verify ESLint Configuration
```bash
# Run linter
npm run lint

# Should pass with no errors (warnings are acceptable)
```

### Step 1.4: Verify File Structure
```bash
# Check these critical files exist:
ls -la src/providers/AuthProvider.jsx        # ✓ Enhanced
ls -la src/store/authStore.js               # ✓ Enhanced
ls -la src/hooks/useMechanicLocation.js     # ✓ Consolidation
ls -la src/lib/request.js                   # ✓ Status transitions
ls -la src/lib/rbac.js                      # ✓ RBAC protection
ls -la .env.example                         # ✓ Updated
ls -la .gitignore                           # ✓ Production-ready
ls -la vercel.json                          # ✓ Deployment config
```

---

## Phase 2: GIT WORKFLOW & CONVENTIONAL COMMITS

### Step 2.1: Check Git Status
```bash
# Verify you're on 'dev' branch
git status

# Expected output:
# On branch dev
# nothing to commit, working tree clean
```

### Step 2.2: Stage Files for Commit (Exclude .env!)
```bash
# Add all EXCEPT sensitive files (already in .gitignore)
git add -A

# Verify staged files (should NOT include .env or .env.local)
git status

# Remove .env if accidentally added
git reset .env
git reset .env.local
```

### Step 2.3: Commit Using Conventional Commits
Commit in this order (separate commits for clarity):

#### Commit 1: Style/Theme Refactoring
```bash
git commit -m "style: update background color to warm cream (#FDFBF7)

- Changed --color-background from #F8F9FA to #FDFBF7
- Updated html gradient to match warm cream theme
- Ensures consistent brand colors across all layouts
- Improves visual warmth for academic defense presentation"
```

#### Commit 2: Authentication System Enhancement
```bash
git commit -m "refactor(auth): enhance AuthProvider with network resilience

BREAKING CHANGE: AuthProvider now requires all new auth store methods

- Added exponential backoff retry logic (1s → 2s → 4s, max 3 retries)
- Implemented network status tracking (connecting|connected|degraded|error)
- Added profile fetch error handling with graceful degradation
- Improved session initialization and cleanup
- Better error messages for network and permission issues

Fixes: Profile sync failures during network dropouts
Related: #AUTH-001"
```

#### Commit 3: Auth Store Enhancement
```bash
git commit -m "refactor(store): extend authStore with computed getters and error tracking

- Added error state for auth-related error messages
- Added networkStatus state (connecting|connected|degraded|error)
- Added 6 computed getter methods:
  - isAuthenticated(): check if user is logged in
  - getUserRole(): get user's role
  - hasRole(role): check single role
  - hasAnyRole([roles]): check multiple roles
  - getDisplayName(): get user's full name
  - getEmail(): get user's email
  - isReady(): check if auth is initialized
  - canPerformAuthAction(): verify net + auth state
- Improved state management for role-based access control

Related: #AUTH-002"
```

#### Commit 4: Real-time Location Tracking
```bash
git commit -m "refactor(hooks): consolidate and enhance useMechanicLocation

- Merged duplicate file (useMehanicLocation.js typo → definitive)
- Added comprehensive error handling for geolocation
  - Permission denied message
  - GPS unavailable handling
  - Timeout retry logic
- Added error state tracking: broadcastError, watchError
- Added connection status: isConnected boolean
- Enhanced timestamp tracking on location updates
- Improved channel subscription error handling

Features:
- Mechanic broadcasts GPS every 15s, persists every 60s
- Driver receives real-time location with error resilience
- Graceful fallbacks for network issues

Fixes: #LOC-001, #LOC-002
Related: Location tracking for active jobs"
```

#### Commit 5: Request Utilities Consolidation
```bash
git commit -m "refactor(lib): consolidate request.js with enhanced error handling

- Merged duplicate file (requests.js → definitive request.js)
- Removed obsolete bid helpers and route handlers
- Wrapped all functions in try-catch blocks
- Improved error logging and validation
- Functions covered:
  - createRescueRequest: geospatial matching + notifications
  - updateRequestStatus: state validation + driver notifications
  - cancelRequest: RLS enforcement + mechanic notifications
  - submitRating: average rating recalculation + job counting
- Added edge case handling (division by zero, no ratings)
- Consistent error propagation for API routes

Fixes: #REQ-001
Related: Request lifecycle management"
```

#### Commit 6: Deployment Configuration
```bash
git commit -m "chore(config): prepare for Vercel deployment

- Added vercel.json for Next.js deployment compatibility
- Updated .env.example with comprehensive documentation
- Updated .gitignore for production security
  - Added .env.local, .env.production exclusions
  - Added IDE files (.vscode, .idea)
  - Comprehensive OS file ignores
- Configured 60s timeout for API functions
- Security headers via Vercel dashboard (no middleware dependency)"
```

### Step 2.4: Verify Commits
```bash
# View commit log with full messages
git log --oneline -10

# Expected output similar to:
# xxxxxxx chore(config): prepare for Vercel deployment
# xxxxxxx refactor(lib): consolidate request.js with enhanced error handling
# xxxxxxx refactor(hooks): consolidate and enhance useMechanicLocation
# xxxxxxx refactor(store): extend authStore with computed getters
# xxxxxxx refactor(auth): enhance AuthProvider with network resilience
# xxxxxxx style: update background color to warm cream (#FDFBF7)
```

---

## Phase 3: PUSH TO REPOSITORY

### Step 3.1: Push to Dev Branch
```bash
# Push all commits to remote dev branch
git push origin dev

# Expected output:
# To github.com:Handson-A/roadrescue.git
#    xxxxxxx..yyyyyyy  dev -> dev
```

### Step 3.2: Verify Push
```bash
# Confirm commits are in remote
git log --oneline -6 --decorate

# Should show: (HEAD -> dev, origin/dev)
```

---

## Phase 4: VERCEL DEPLOYMENT SETUP

### Step 4.1: Create Vercel Account (if needed)
1. Visit: https://vercel.com/signup
2. Sign up with GitHub account
3. Authorize Vercel to access your GitHub repositories

### Step 4.2: Connect Repository to Vercel
1. Visit: https://vercel.com/dashboard
2. Click: **Add New Project**
3. Select: **Handson-A/roadrescue** repository
4. Choose: **web** folder as root directory
5. Click: **Continue**

### Step 4.3: Configure Build Settings
1. **Project Name**: `roadrescue` (or custom name)
2. **Framework Preset**: Auto-detect (should be "Next.js")
3. **Root Directory**: `web/` ✓
4. **Build Command**: `npm run build` ✓
5. **Output Directory**: `.next` ✓
6. **Install Command**: `npm install` ✓

### Step 4.4: Add Environment Variables (CRITICAL!)
1. Click: **Environment Variables**
2. Add each variable with values from your `.env`:

| Variable Name | Value | Scope |
|---------------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Production only ⚠️ |
| `OPENAI_API_KEY` | Your OpenAI key | Production only ⚠️ |
| `RESEND_API_KEY` | Your Resend key | Production only ⚠️ |
| `NEXT_PUBLIC_APP_URL` | Your production domain | Production, Preview, Development |

Note: This project uses Leaflet with OpenStreetMap tiles for maps and Nominatim
for reverse geocoding. No Google Maps API key is required by default.

**⚠️ CRITICAL SECURITY:**
- Service role key, OpenAI key, and Resend key: **Production only**
- Never expose these keys in Preview or Development
- Vercel encrypts all secrets immediately

### Step 4.5: Deploy!
1. Click: **Deploy**
2. Wait for build to complete (~3-5 minutes)
3. Get your Vercel deployment URL: `https://roadrescue-[random].vercel.app`

### Step 4.6: Configure Production Domain
1. Visit: **Settings → Domains**
2. Click: **Add**
3. Enter: Your custom domain (e.g., `roadrescue.app`)
4. Follow: DNS configuration steps
5. Wait: DNS to propagate (5-30 minutes)

---

## Phase 5: POST-DEPLOYMENT VERIFICATION

### Step 5.1: Test Production URL
```bash
# Verify site loads
curl https://roadrescue.app -I

# Should return:
# HTTP/2 200
# Content-Type: text/html
```

### Step 5.2: Test Key Features
- [ ] **Onboarding Page**: Load `/onboarding` → role selection renders
- [ ] **Login**: `/auth/login` → form loads with warm cream theme
- [ ] **Auth**: Try login with valid credentials
 - [ ] **Map**: Driver dashboard loads Leaflet map (OpenStreetMap tiles)
- [ ] **Realtime**: Mechanic location tracking works (if logged in)
- [ ] **Notifications**: Test email notifications (if logged in as mechanic)
- [ ] **Profile Preferences**: Test `/api/profile/preferences` GET/PUT endpoints
- [ ] **Admin**: Admin dashboard loads `/dashboard/admin` (if admin role)

### Step 5.3: Check Security Headers
```bash
# Verify security headers are present
curl -I https://roadrescue.app | grep -E "X-Content-Type|X-Frame|X-XSS|Referrer"

# Should show all 4 security headers
```

### Step 5.4: Monitor Deployment
1. Visit: Vercel Dashboard
2. Check: **Deployments** tab
3. Current deployment should show: ✓ **Ready**
4. Check: **Analytics** tab for error rates
5. Review: **Logs** for any warnings

---

## TROUBLESHOOTING

### Build Fails: "Module not found"
```bash
# Verify all imports use correct paths
npm run lint

# Check if all files exist
ls -la src/providers/AuthProvider.jsx
ls -la src/store/authStore.js
ls -la src/hooks/useMechanicLocation.js
ls -la src/lib/request.js
```

### Environment Variable Error
- Check Vercel dashboard: **Settings → Environment Variables**
- Verify all required vars are set
- Re-add any missing variables
- Trigger new deployment: **Settings → Deployments → Redeploy**

### SSL Certificate Issues
- Use only HTTPS URLs: `https://roadrescue.app`
- Vercel provides free SSL certificates automatically
- Wait 24 hours if just added custom domain

### Supabase Connection Fails
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (include https://)
- Test locally: `npm run dev` works but Vercel fails?
  - Check for hardcoded `localhost` values
  - Use `NEXT_PUBLIC_APP_URL` env var instead

---

## ROLLBACK (If needed)
```bash
# Visit Vercel Dashboard
# Click on failed deployment
# Click "Rollback to Previous"
# Vercel will redeploy previous working version
```

---

## CONTINUOUS DEPLOYMENT

### Auto-Deploy on Push
Vercel automatically deploys when you push to `dev` or `main`:
```bash
# After fixing an issue locally:
git add .
git commit -m "fix: description of fix"
git push origin dev

# Vercel automatically:
# 1. Detects push
# 2. Rebuilds project
# 3. Runs preview deployment
# 4. Updates production (if main branch)
```

### Preview Deployments
Every commit to non-main branches gets a preview URL:
- Merge commit → Preview created
- Auto-expiring after 7 days (configurable)
- Share with team for testing

---

## SUCCESS CHECKLIST
- [x] `.env` variables verified and secure
- [x] `.gitignore` production-ready
- [x] `vercel.json` configured
- [x] All commits pushed to `dev` branch
- [x] Environment variables in Vercel dashboard
- [x] Initial deployment successful
- [x] Production domain configured
- [x] Security headers verified
- [x] Key features tested

🎉 **RoadRescue is now production-ready on Vercel!**

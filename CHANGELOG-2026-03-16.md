# L4mii Money Tracker — Session Log: 16 March 2026

## Overview

รีแฟกเตอร์โปรเจกต์ครั้งใหญ่: เปลี่ยนชื่อจาก "dashboard-mvp" เป็น "L4mii Money Tracker", sync code ทุก version ให้ตรงกัน, ลบ dead code, แก้ bug, และ deploy ขึ้น production

---

## 1. สถานะก่อนเริ่มงาน — Code Version Mismatch

โปรเจกต์มี **3 version** ที่ไม่ sync กัน:

| ที่ | Location | Branch / Commit | สถานะ |
|-----|----------|-----------------|--------|
| 1 | **Local `main`** (`npm run dev`) | `fc35ee7` — cycle selector refactor | ตามหลัง GitHub 2 commits |
| 2 | **GitHub `origin/main`** | `c3e2693` — merge PR #2 KokonutUI redesign | ล่าสุดบน GitHub |
| 3 | **Vercel production** (`app1.l4mii.com`) | deploy จาก `claude/angry-bohr` commit `dc6afa2` (Mar 10) | version เก่าจาก branch ผิด |

### สาเหตุ
- PR #2 (`claude/angry-bohr` → `main`) ถูก merge บน GitHub แต่ local ไม่ได้ `git pull`
- Vercel production branch ถูกตั้งเป็น `claude/angry-bohr` แทนที่จะเป็น `main`
- มี Git worktrees 2 ชุดใน `.claude/worktrees/` (`angry-bohr`, `compassionate-thompson`) ที่สร้าง confusion เพิ่ม

---

## 2. ขั้นตอนที่ทำ

### Step 1: Sync local main กับ origin/main ✅

```
git fetch origin
git stash push -m "normalizeCycleId fix for Dashboard.jsx"
git pull origin main          # Fast-forward: fc35ee7 → c3e2693
git stash pop                 # ⚠️ Conflict ใน Dashboard.jsx
```

**Conflict resolved:** KokonutUI redesign ย้าย `cycleOptions` computation จาก `Dashboard.jsx` ไป `App.jsx` ผม apply `normalizeCycleId` fix ไปที่ `App.jsx` แทน แล้วลบ block เก่าออกจาก `Dashboard.jsx`

### Step 2: Rename โปรเจกต์ → "L4mii Money Tracker" ✅

ไฟล์ที่เปลี่ยน:

| File | เดิม | ใหม่ |
|------|------|------|
| `package.json` | `"name": "dashboard-mvp"` | `"name": "l4mii-money-tracker"` |
| `package-lock.json` | `"name": "dashboard-mvp"` (x2) | `"name": "l4mii-money-tracker"` |
| `index.html` | `<title>Money Trackers Dashboard MVP</title>` | `<title>L4mii Money Tracker</title>` |
| `src/components/Sidebar.jsx` | `Money Trackers` | `L4mii Money Tracker` |
| `src/components/TopNav.jsx` | `Money Trackers` | `L4mii Money Tracker` |
| `src/components/AuthPanel.jsx` | `Money Tracker Login` | `L4mii Money Tracker` |
| `src/App.jsx` | `finance-dashboard-export.json` | `l4mii-money-tracker-export.json` |

**ไม่เปลี่ยน (backward compatibility):**
- `src/persistence/index.js` — `APP_ID` และ `IDB_NAME` ยังคงเป็น `'finance-dashboard'` เพื่อไม่ทำลาย IndexedDB ของ user ที่มีอยู่
- `parsed.app !== 'finance-dashboard'` ใน import check ยังเหมือนเดิม

### Step 3: Codebase Audit — Dead Code ✅

ตรวจพบ **7 dead files** (-984 lines):

| File | เหตุผลที่ลบ |
|------|------------|
| `src/financeReducer.js` (748 lines) | Legacy reducer — `App.jsx` ใช้ `src/reducers/financeReducer.js` แทนแล้ว |
| `src/components/PlanningSection.jsx` | ถูกแทนที่ด้วย `PlanningCostSection.jsx` ไม่มี import ใดๆ |
| `src/components/TimelineSection.jsx` | Stub component (`return null`) ไม่มี import ใดๆ |
| `src/components/LazyComponents.jsx` | Lazy wrappers ที่ไม่เคยถูก import |
| `src/hooks/usePerformance.js` | Hook ที่ไม่เคยถูก import |
| `src/ui/layout/useTheme.ts` | Duplicate ของ `src/ui/theme/useTheme.ts` — imports ทั้งหมดชี้ไป `theme/useTheme` |
| `MVP-NOTES.md` | ไฟล์ RTF ที่ปลอมเป็น markdown, ข้อมูลเก่าไม่ relevant |

### Step 4: Rename GitHub Repo + Local Folder ✅

| สิ่งที่เปลี่ยน | เดิม | ใหม่ |
|---------------|------|------|
| GitHub repo | `NakarinFK/dashboard-mvp` | `NakarinFK/l4mii-money-tracker` |
| Local folder | `/Users/mac/Documents/Work space/dashboard-mvp` | `/Users/mac/Documents/Work space/l4mii-money-tracker` |
| Git remote | `https://github.com/NakarinFK/dashboard-mvp.git` | `https://github.com/NakarinFK/l4mii-money-tracker.git` |
| Vercel project name | `dashboard-mvp` | `l4mii-money-tracker` |

### Step 5: Build & Test ✅

- `npm install` — เพิ่ม `lucide-react` ที่หายไปหลัง folder rename
- `npm run build` — ✅ สำเร็จ (280 KB main bundle)
- `npm run dev` — ✅ ทำงานที่ `http://127.0.0.1:5173/`

### Step 6: Deploy to Production ✅

```
npx vercel --prod
# ✅ Production: https://app1.l4mii.com
```

---

## 3. Bug ที่เจอและแก้ไข

### Bug 1: Stash Conflict — `cycleOptions` ย้ายที่

**อาการ:** `git stash pop` conflict ใน `Dashboard.jsx`
**สาเหตุ:** KokonutUI redesign (PR#2) ย้าย `cycleOptions` computation จาก `Dashboard.jsx` ไป `App.jsx` แต่ stash มี fix อยู่ใน `Dashboard.jsx`
**แก้:** Apply `normalizeCycleId` fix ไปที่ `App.jsx` แทน, ลบ block เก่าออกจาก `Dashboard.jsx`

### Bug 2: `normalizeCycleId` — Runtime crash จาก malformed cycleId

**อาการ:** App crash เมื่อ cycleId ใน persisted data เป็น number หรือ empty string
**สาเหตุ:** `buildCycleOptions` ไม่ validate ค่า cycleId จาก user data
**แก้:** เพิ่ม `normalizeCycleId()` helper ใน `cycleOptions` useMemo ที่ `App.jsx`:
```javascript
const normalizeCycleId = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}
```

### Bug 3: `useRef` Rules of Hooks Violation — Production Crash 🔴

**อาการ:** `app1.l4mii.com` แสดง "Something went wrong" (ErrorBoundary catch)
**สาเหตุ:** `useRef(null)` ถูกเรียกหลัง conditional `return` ใน `App.jsx` line 109:
```javascript
// ❌ BEFORE — useRef อยู่หลัง conditional returns
if (!authReady) return <Loading />
if (isSupabaseConfigured && !session) return <AuthPanel />

const fileInputRef = useRef(null)  // ← Rules of Hooks violation!
```
React ต้องการให้ Hooks ถูกเรียกในลำดับเดียวกันทุก render ถ้า authReady เป็น false แล้ว return ก่อน useRef จะไม่ถูกเรียก → crash

**แก้:** ย้าย `useRef(null)` ขึ้นไปก่อน conditional returns:
```javascript
// ✅ AFTER — useRef อยู่ก่อน conditional returns
const fileInputRef = useRef(null)

const cycleOptions = useMemo(() => { ... })

if (!authReady) return <Loading />
if (isSupabaseConfigured && !session) return <AuthPanel />
```

### Bug 4: ErrorBoundary ไม่แสดง error details ใน production

**อาการ:** Production crash แต่ดู console ไม่เห็น error
**สาเหตุ:** `componentDidCatch` มี condition `if (process.env.NODE_ENV === 'development')` ก่อน `console.error`
**แก้:** ลบ condition ออก → log errors ทุก environment

---

## 4. Git Commits

| Commit | Message |
|--------|---------|
| `84fd0fc` | `refactor: rename to L4mii Money Tracker, apply normalizeCycleId fix, remove 7 dead files` |
| `17868ed` | `fix: move useRef above conditional returns (Rules of Hooks), always log ErrorBoundary errors, update .gitignore` |

---

## 5. สถานะหลังจบงาน

### Code ทุก version sync แล้ว ✅

| Location | Commit | สถานะ |
|----------|--------|--------|
| Local `main` | `17868ed` | ✅ ล่าสุด |
| GitHub `origin/main` | `17868ed` | ✅ ล่าสุด |
| Vercel production | deploy จาก `17868ed` | ✅ ล่าสุด |

### Vercel configuration

| Setting | ค่าปัจจุบัน | แนะนำ |
|---------|------------|-------|
| Project Name | `l4mii-money-tracker` | ✅ |
| Git Repository | `NakarinFK/l4mii-money-tracker` | ✅ |
| Production Branch | `claude/angry-bohr` | ⚠️ **ควรเปลี่ยนเป็น `main`** เพื่อ auto-deploy |
| Custom Domain | `app1.l4mii.com` | ✅ |

### Remaining TODO

- [ ] เปลี่ยน Vercel Production Branch จาก `claude/angry-bohr` → `main` (Settings → Environments → Production)
- [ ] พิจารณาลบ worktree branches เก่า (`claude/angry-bohr`, `claude/compassionate-thompson`) ถ้าไม่ใช้แล้ว
- [ ] พิจารณาลบ `src/ui/layout/DashboardLayout.tsx` — orphaned file ที่ไม่มี import ใดๆ (ถูก import ผ่าน `LazyComponents.jsx` ที่ลบไปแล้ว)

---

## 6. File Structure หลัง Cleanup (41 source files)

```
src/
├── App.jsx                          # Root component + state management
├── main.jsx                         # Entry point + bootstrap
├── index.css                        # Global styles + Tailwind
├── components/
│   ├── AccountsSection.jsx          # Account list + opening balances
│   ├── AddAccountForm.jsx           # New account form
│   ├── AppLayout.jsx                # Sidebar + TopNav layout wrapper (PR#2)
│   ├── AuthPanel.jsx                # Supabase auth login
│   ├── BudgetSection.jsx            # Budget plan per category
│   ├── CashFlowSection.jsx          # Inflow/outflow summary
│   ├── CategoryManager.jsx          # CRUD categories
│   ├── Dashboard.jsx                # Main dashboard + grid layout
│   ├── ErrorBoundary.jsx            # Global error boundary
│   ├── KpiGrid.jsx                  # KPI cards row
│   ├── PlanningCostSection.jsx      # Planning costs CRUD
│   ├── SectionHeader.jsx            # Reusable section header
│   ├── Sidebar.jsx                  # Navigation sidebar (PR#2)
│   ├── TopNav.jsx                   # Top navigation bar (PR#2)
│   ├── TransactionForm.jsx          # Add/edit transaction form
│   └── TransactionsTable.jsx        # Transaction history table
├── data/
│   └── mockData.js                  # Seed data + nav items
├── hooks/
│   └── useDerivedData.js            # Derived KPIs, transactions, cashflow
├── lib/
│   └── supabaseClient.js            # Supabase client singleton
├── persistence/
│   ├── index.js                     # Persistence adapter (IndexedDB + SQLite)
│   └── sqliteDriver.js              # SQLite WASM driver
├── reducers/
│   ├── accountUtils.js              # Account balance recalculation
│   ├── categoryUtils.js             # Category/budget/planning helpers
│   ├── financeReducer.js            # Main finance reducer (active)
│   ├── seedData.js                  # Seed data builder
│   └── transactionUtils.js          # Transaction normalization
├── ui/
│   ├── blocks/
│   │   ├── blockCatalog.ts          # Block registry + props mapping
│   │   └── SelectedAccountBanner.tsx # Account selection UI
│   ├── layout/
│   │   ├── DashboardLayout.tsx      # ⚠️ Orphaned — consider removing
│   │   ├── FreeGridLayout.tsx       # Drag-and-drop grid layout
│   │   ├── defaultLayout.ts         # Default block positions
│   │   ├── layoutReducer.ts         # Layout state management
│   │   └── layoutTypes.ts           # Layout TypeScript types
│   └── theme/
│       └── useTheme.ts              # Dark/light theme hook
└── utils/
    ├── cycle.js                     # Billing cycle utilities
    ├── fileValidation.js            # Import file validation
    ├── financeSelectors.js          # Data selectors for UI
    ├── format.js                    # Currency/date formatting
    └── validation.js                # Form input validation
```

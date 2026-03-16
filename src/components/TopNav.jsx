import { Bell, Sun, Moon, ChevronRight, Menu, LogOut, User } from 'lucide-react'
import { useTheme } from '../ui/theme/useTheme'

export default function TopNav({ userEmail, onSignOut, onToggleSidebar }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-3 dark:border-[#212631] dark:bg-[#0A0E15] sm:px-6">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#212631] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden items-center space-x-1 text-sm font-medium sm:flex">
          <span className="text-gray-700 dark:text-gray-300">
            L4mii Money Tracker
          </span>
          <ChevronRight className="mx-1 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-900 dark:text-gray-100">Dashboard</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification bell */}
        <button
          type="button"
          className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#212631] sm:p-2"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#212631] sm:p-2"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>

        {/* User info */}
        {userEmail ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 ring-2 ring-gray-200 dark:bg-[#373F4E] dark:ring-[#373F4E]">
              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
              {userEmail}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#212631] dark:hover:text-gray-200"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 ring-2 ring-gray-200 dark:bg-[#373F4E] dark:ring-[#373F4E]">
            <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </div>
        )}
      </div>
    </header>
  )
}

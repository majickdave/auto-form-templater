import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  return (
    <nav className="w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link 
          href="/" 
          className="text-xl font-bold text-primary-600 dark:text-primary-400"
        >
          Form Templater
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link 
            href="/templates" 
            className="text-slate-700 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
          >
            Templates
          </Link>
          <Link 
            href="/forms" 
            className="text-slate-700 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
          >
            Forms
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
} 
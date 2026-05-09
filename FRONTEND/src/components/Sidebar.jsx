import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: '🍃' },
  { id: 'modelo',    label: 'Modelo',    icon: '🤖' },
]

const EXPANDED_W  = 200
const COLLAPSED_W = 68

export default function Sidebar({ currentPage, onNavigate }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      <button
        className="sidebar-toggle"
        onClick={() => setExpanded(v => !v)}
        title={expanded ? 'Colapsar' : 'Expandir'}
      >
        <motion.span
          className="sidebar-toggle-icon"
          animate={{ rotate: expanded ? 0 : 180 }}
          transition={{ duration: 0.25 }}
        >
          ‹
        </motion.span>
      </button>

      <nav className="sidebar-nav">
        {pages.map(p => {
          const active = currentPage === p.id
          return (
            <button
              key={p.id}
              className={`sidebar-item${active ? ' sidebar-item-active' : ''}`}
              onClick={() => onNavigate(p.id)}
              title={!expanded ? p.label : undefined}
            >
              {active && (
                <motion.div
                  className="sidebar-item-bg"
                  layoutId="sidebar-active-bg"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="sidebar-item-icon">{p.icon}</span>
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    className="sidebar-item-label"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {p.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>
    </motion.aside>
  )
}

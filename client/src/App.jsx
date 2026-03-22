import { Routes, Route, NavLink } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import BankPage from './pages/BankPage'
import AccountingPage from './pages/AccountingPage'

const navClass = ({ isActive }) =>
  `flex items-center px-1 border-b-2 transition-colors ${
    isActive
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-700 hover:text-blue-600'
  }`

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 h-14">
            <NavLink to="/" end className={navClass}>
              对账面板
            </NavLink>
            <NavLink to="/bank" className={navClass}>
              银行流水
            </NavLink>
            <NavLink to="/accounting" className={navClass}>
              记账单
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/bank" element={<BankPage />} />
          <Route path="/accounting" element={<AccountingPage />} />
        </Routes>
      </main>
    </div>
  )
}

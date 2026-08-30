import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { LoginPage } from './pages/Auth/Login';
import { RegisterPage } from './pages/Auth/Register';
import { DashboardPage } from './pages/Dashboard';
import { AccountsPage } from './pages/Accounts';
import { CategoriesPage } from './pages/Categories';
import { TransactionsPage } from './pages/Transactions';
import { BudgetsPage } from './pages/Budgets';
import { SavingsGoalsPage } from './pages/SavingsGoals';
import { AssetsPage } from './pages/Assets';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="savings-goals" element={<SavingsGoalsPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route
              path="calendar"
              element={<Navigate to="/transactions?view=calendar" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { Link } from 'react-router-dom';
import { Logo } from '@/components/common';
import { PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';

const productLinks = [
  { to: PUBLIC_ROUTES.home, label: 'Home' },
  { to: PUBLIC_ROUTES.features, label: 'How it works' },
  { to: PUBLIC_ROUTES.about, label: "What it's about" },
  { to: PUBLIC_ROUTES.contact, label: 'Contact us' },
];

const appLinks = [
  { to: STUDENT_ROUTES.dashboard, label: 'Dashboard' },
  { to: STUDENT_ROUTES.transactions, label: 'Transactions' },
  { to: STUDENT_ROUTES.budgets, label: 'Budgets' },
  { to: STUDENT_ROUTES.reports, label: 'Reports' },
  { to: STUDENT_ROUTES.savingTips, label: 'Saving Tips' },
];

const accountLinks = [
  { to: PUBLIC_ROUTES.login, label: 'Log in' },
  { to: PUBLIC_ROUTES.register, label: 'Create account' },
  { to: PUBLIC_ROUTES.forgotPassword, label: 'Forgot password' },
  { to: STUDENT_ROUTES.profile, label: 'Profile & settings' },
];

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="relative text-sm text-white/70 transition-colors duration-200 hover:text-white after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-[#4ade80] after:transition-all after:duration-200 hover:after:w-full"
      >
        {label}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#122a1f] text-white">
      <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link to={PUBLIC_ROUTES.home} className="inline-block">
              <Logo wordmarkClassName="text-white" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Budgeting built for student life. Track income and expenses, set budgets, and get
              plain-language saving tips — no bank account required.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Product</h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <FooterLink key={link.to} {...link} />
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">App</h3>
            <ul className="mt-4 space-y-3">
              {appLinks.map((link) => (
                <FooterLink key={link.to} {...link} />
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Account</h3>
            <ul className="mt-4 space-y-3">
              {accountLinks.map((link) => (
                <FooterLink key={link.to} {...link} />
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Campus Coin. All rights reserved.</p>
          <p>NextGen BudgetBee &middot; Built for students, by understanding student life.</p>
        </div>
      </div>
    </footer>
  );
}

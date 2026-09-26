import authHero from './auth-hero.webp';
import heroBackground from './herobg.png';
import heroBackgroundDark from './herobg-dark.webp';
import heroPhone from './herophone.png';
import logo from './logo.webp';
import aiAssistantScreenshot from './screenshots/ai-assistant.png';
import budgetsScreenshot from './screenshots/budgets.png';
import dashboardScreenshot from './screenshots/dashboard.png';
import reportsScreenshot from './screenshots/reports.png';

export const assets = {
  authHero,
  heroBackground,
  heroBackgroundDark,
  heroPhone,
  logo,
  screenshots: {
    aiAssistant: aiAssistantScreenshot,
    budgets: budgetsScreenshot,
    dashboard: dashboardScreenshot,
    reports: reportsScreenshot,
  },
} as const;

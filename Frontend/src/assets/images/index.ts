import aboutDeskDark from './about-desk-dark.webp';
import authHero from './auth-hero.webp';
import featuresDesk from './features-desk.webp';
import featuresDeskDark from './features-desk-dark.webp';
import faqIllustration from './faq-illustration.webp';
import heroBackground from './herobg-desk.webp';
import heroPhone from './herophone.png';
import logo from './logo.webp';
import aiAssistantScreenshot from './screenshots/ai-assistant.png';
import aiAssistantScreenshotDark from './screenshots/ai-assistant-dark.png';
import budgetsScreenshot from './screenshots/budgets.png';
import budgetsScreenshotDark from './screenshots/budgets-dark.png';
import dashboardScreenshot from './screenshots/dashboard.png';
import dashboardScreenshotDark from './screenshots/dashboard-dark.png';
import reportsScreenshot from './screenshots/reports.png';
import reportsScreenshotDark from './screenshots/reports-dark.png';

export const assets = {
  aboutDeskDark,
  authHero,
  featuresDesk,
  featuresDeskDark,
  faqIllustration,
  heroBackground,
  heroPhone,
  logo,
  screenshots: {
    aiAssistant: aiAssistantScreenshot,
    aiAssistantDark: aiAssistantScreenshotDark,
    budgets: budgetsScreenshot,
    budgetsDark: budgetsScreenshotDark,
    dashboard: dashboardScreenshot,
    dashboardDark: dashboardScreenshotDark,
    reports: reportsScreenshot,
    reportsDark: reportsScreenshotDark,
  },
} as const;

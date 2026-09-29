import aboutDeskDark from './about-desk-dark.webp';
import authHero from './auth-hero.webp';
import featuresDesk from './features-desk.webp';
import featuresDeskDark from './features-desk-dark.webp';
import faqIllustration from './faq-illustration.webp';
import heroBackground from './herobg-desk.webp';
import heroPhone from './herophone.png';
import heroSlideOne from './herosld1.png';
import heroSlideThree from './herosld3.png';
import logo from './logo.webp';
import aiAssistantScreenshot from './screenshots/ai-assistant.webp';
import aiAssistantScreenshotDark from './screenshots/ai-assistant-dark.webp';
import budgetsScreenshot from './screenshots/budgets.webp';
import budgetsScreenshotDark from './screenshots/budgets-dark.webp';
import dashboardScreenshot from './screenshots/dashboard.webp';
import dashboardScreenshotDark from './screenshots/dashboard-dark.webp';
import reportsScreenshot from './screenshots/reports.webp';
import reportsScreenshotDark from './screenshots/reports-dark.webp';

export const assets = {
  aboutDeskDark,
  authHero,
  featuresDesk,
  featuresDeskDark,
  faqIllustration,
  heroBackground,
  heroPhone,
  heroSlideOne,
  heroSlideThree,
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

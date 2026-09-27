import aboutDeskDark from './about-desk-dark.webp';
import authHero from './auth-hero.webp';
import featuresDesk from './features-desk.webp';
import featuresDeskDark from './features-desk-dark.webp';
import faqIllustration from './faq-illustration.webp';
import heroBackground from './herobg-desk.webp';
import heroPhone from './herophone.png';
import logo from './logo.webp';
import aiAssistantScreenshot from './screenshots/ai-assistant.png';
import budgetsScreenshot from './screenshots/budgets.png';
import dashboardScreenshot from './screenshots/dashboard.png';
import reportsScreenshot from './screenshots/reports.png';

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
    budgets: budgetsScreenshot,
    dashboard: dashboardScreenshot,
    reports: reportsScreenshot,
  },
} as const;

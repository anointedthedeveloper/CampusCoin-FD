# CampusCoin — Match the app (Figma plugin)

Restyles the CampusCoin Figma file so it looks like the live app and adds the app's loader screen.

## Run it (Figma desktop app)

1. Open the CampusCoin file and go to **Page 1**.
2. Go to **Menu → Plugins → Development → Import plugin from manifest…** and pick `manifest.json` from this folder.
3. Go to **Menu → Plugins → Development → CampusCoin — Match the app** and choose one of:
   - **Match the app look (backs up the page first)**: does everything listed below.
   - **Add loader & app style frames only**: leaves the existing screens alone.

If you don't like the result, press **Ctrl/Cmd + Z** once. The page named **"Page 1 — original (backup)"** also keeps an untouched copy.

## What it changes

| Before | After (app) |
| --- | --- |
| Buttons `#007755`, `#05A40F` | Primary `#16A34A` with 10–12px radius |
| Sidebar `#014C37` / `#005238` | App sidebar `#052E16` (brand-950) |
| Mint page backgrounds `#E9F9E8` | App background `#F8FAF8` |
| Pinkish off-white cards | White cards with 14px radius, 1px `#E3EBE6` border and a soft shadow |
| Light green chips | `#DCFCE7` (brand-100) |
| Text `#0F241C`, `#000000`, `#6B8079` | `#0F1712`, muted `#64766C` |
| Inter / Poppins | Plus Jakarta Sans, at the nearest weight |

These are left alone:

- the style guide frame;
- images and illustrations;
- icons;
- layout and wording;
- any colour not listed above.

The ₦ sign keeps its original font, so it keeps its double bar.

## What it adds

A section called **"Loader & app style (added)"** is placed above the existing screens. It contains:

- **Loader — Light / Dark / Mobile.** These copy the app's `index.html` loader: a mint background, the gradient ₦ coin with its rim and shadow, "CAMPUS COIN" and "Getting your campus wallet ready".
- **Loader — Light (flip).** This is the second half of the coin flip. The two light frames Smart Animate into each other, so presenting the "Loader" flow plays the flip.
- **App style — tokens.** The app's colours, font, card and button rules in one frame.

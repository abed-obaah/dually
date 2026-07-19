# Dually — Landing Page

A pixel-crafted, production-ready landing page for **Dually**, a dual-camera live
streaming social app with augmented reality. Built with **React + Vite**,
**Tailwind CSS**, **Framer Motion**, and **Lucide React**.

Inspired by the layout, spacing, and motion feel of modern Framer SaaS templates.

---

## ✨ Features

- Fully responsive (mobile / tablet / desktop)
- Fade-up + staggered scroll animations (Framer Motion)
- Floating phone mockup with live-stream UI, dual-camera PiP & AR overlays
- Parallax hero, animated navbar on scroll, animated FAQ accordion
- Glassmorphism, soft shadows, gradient meshes, floating background orbs
- Accessible HTML (semantic landmarks, `aria` attributes, keyboard-friendly)
- SEO-friendly metadata (Open Graph + Twitter cards) in `index.html`
- No image assets required — all visuals are pure CSS + SVG placeholders
- Respects `prefers-reduced-motion`

---

## 1. How to run it

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# create a production build (outputs to /dist)
npm run build

# preview the production build locally
npm run preview
```

Requires Node 18+.

---

## 2. Where to replace assets

All visuals are **placeholders** built from CSS + SVG so nothing is missing out
of the box. Swap them for real assets when ready:

| Asset | File | What to change |
|-------|------|----------------|
| **iPhone / livestream screen** | `src/components/AppMockup.jsx` | Replace the `.screen` inner markup with an `<img src="..." />` of your real app screenshot. |
| **AR overlays & effect chips** | `src/components/AppMockup.jsx`, `src/sections/AboutSection.jsx` | Swap the gradient blocks / `Sparkles` chips for real overlay images. |
| **Creator profile card** | `src/sections/AboutSection.jsx` | Replace the gradient avatar `div`s with `<img>` avatars. |
| **App icon / logo** | `src/components/BrandMark.jsx` | Replace the inline SVG with `<img src="/logo.png" />`. Used in the navbar, hero, and footer. |
| **QR codes** | `src/components/QRCode.jsx` | Swap the generated SVG for a real QR `<img>` in the Download section. |
| **Favicon** | `public/favicon.svg` | Replace with your brand mark. |
| **OG / social share image** | `index.html` (`og:image`, `twitter:image`) | Add `public/og-image.png` (1200×630) and it will be served at `/og-image.png`. |
| **App name** | `src/components/Navbar.jsx`, `src/sections/Footer.jsx` | Change the “Dually” text. |
| **Copy & content** | `src/sections/*` and the data arrays inside `FeatureCards.jsx`, `ReviewSection.jsx`, `FAQSection.jsx` | All text lives in plain arrays/JSX — easy to edit. |

To use static images, drop them in `public/` and reference them as `/your-image.png`,
or import them from `src/assets/` for hashed/optimized builds.

---

## 3. How to customize colors

The entire palette is driven by Tailwind theme tokens — change them in **one place**:

**`tailwind.config.js` → `theme.extend.colors`**

```js
colors: {
  paper:  '#FBF7EC',                                   // cream page background
  night:  '#0C0B0A',                                   // dark sections (About/Features/Reviews/Download/Footer)
  card:   '#161311',                                   // dark card surfaces
  orange: { 400: '#FB923C', 500: '#F97316', 600: '#EA580C', DEFAULT: '#F2661C' }, // accent
  peach:  { DEFAULT: '#FBEEE1', deep: '#F7E3D0' },     // FAQ card tint
  ink:    { DEFAULT: '#17140E', muted: '#6E665A' },    // text on cream
}
```

- Change `orange` to re-brand the accent (headline gradient, highlights, icons, buttons on dark).
- Change `paper` for the light section background, `night` for the dark sections.
- Change `ink` for body/heading text on the cream sections.

The `.text-orange-grad` helper, `.hero-glow`, shadows (`shadow-soft`, `shadow-card`,
`shadow-glow`, `shadow-btn`), and every section reference these tokens, so they
update automatically.

Fonts: change the Google Fonts `<link>` in `index.html` and the `fontFamily.sans`
array in `tailwind.config.js`.

Animation timing/curves: adjust the shared variants in `src/lib/motion.js`.

---

## Project structure

```
src/
├── components/       # reusable UI: Navbar, Button, Reveal, AppMockup, FeatureCards, BrandMark, QRCode
├── sections/         # page sections: Hero, Stats, About, Feature, Review, FAQ, Download, Footer
├── lib/              # shared Framer Motion variants (motion.js)
├── assets/           # place static images here (optional)
├── App.jsx           # composes all sections
├── main.jsx          # React entry point
└── index.css         # Tailwind layers + global styles
```

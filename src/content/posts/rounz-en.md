---
title: 'Reviewing my latest bootcamp team project - How to optimize web performance'
pubDate: 2026-06-22
description: 'ROUNZ renewal'
lang: 'en'
tags: ['a11y']
draft: false
---

## Breaking Through the 25-Second Barrier - Introduction

What happens when a user visits a mobile shopping site and waits **25 seconds** for products to appear?

For our bootcamp team project, we selected **rounz.co.kr** — a domestic sunglasses e-commerce platform — as our subject of analysis. It's a real, actively operated service with clean design and a solid product lineup. But when we measured its mobile performance with Google PageSpeed Insights, the results were shocking.

| Metric                             | Score           |
| ---------------------------------- | --------------- |
| Performance                        | **40 / 100** 🔴 |
| Accessibility                      | **62 / 100** 🟡 |
| Best Practices                     | 69 / 100 🟡     |
| SEO                                | 85 / 100 🟡     |
| **LCP (Largest Contentful Paint)** | **25.0s** 🔴    |
| FCP (First Contentful Paint)       | 5.4s 🔴         |
| Total Blocking Time                | 680ms 🔴        |
| CLS (Cumulative Layout Shift)      | 0.006 ✅        |

Performance score: 40. LCP: 25 seconds. These numbers aren't just "room for optimization" — they represent a fundamental failure.

When you develop and test on a fast office Wi-Fi connection, everything feels quick. But on real user conditions — LTE networks, mid-range Android devices, weak subway signals — the site completely falls apart.

This article dissects the technical root causes and shares the architectural solutions our team designed.

---

## Section 1. JavaScript Overload — Main Thread Starvation

The core reason for a performance score of 40 is JavaScript.

Here are the numbers from PageSpeed diagnostics:

- **Unused JavaScript: 1,046 KiB** eligible for removal
- **Total network payload: 45,554 KiB (~45.5 MB)**
- **Minimize main thread work: 4.6 seconds**
- **Reduce JavaScript execution time: 1.9 seconds**

There's a key insight many developers miss here. JavaScript optimization isn't simply about "reducing file size."

### What Is Main Thread Starvation?

Browsers have a single main thread that handles all of the following tasks **sequentially**:

```
[JS Parsing] → [Compilation] → [Execution] → [Style Calculation] → [Layout] → [Painting]
```

When 1,046 KiB of JavaScript loads all at once, the main thread **stops everything else** until it has finished parsing, compiling, and executing every byte. To the user, this looks like a blank white screen.

This is exactly what causes the 680ms Total Blocking Time. Tapping the screen, scrolling — the browser responds to nothing. The main thread is completely occupied by JavaScript execution.

Mobile CPUs perform significantly worse than desktop CPUs. The same JavaScript bundle can take **3–5× longer** to parse and compile on mobile. That's where the 25-second LCP comes from.

Additional issues discovered:

- **Render-blocking requests** (estimated savings: 2,550ms)
- **Inefficient cache lifetimes** (estimated savings: 44,520 KiB)
- **Unoptimized image delivery** (estimated savings: 28,916 KiB)
- **Legacy JavaScript usage** (estimated savings: 55 KiB)

In short, scripts are being dropped into the page with no bundling strategy whatsoever.

---

## Section 2. Accessibility Score of 62 — Broken Semantic Structure

Accessibility isn't "consideration for people with disabilities." It's an **indicator of correct HTML structure**.

A low accessibility score means that not only screen readers, but also search engines and the browser's own parsing engine cannot accurately understand the page structure.

Here are the accessibility issues found on the rounz site:

### Name and Label Issues

- **Image elements missing `[alt]` attributes**
- **`<frame>` or `<iframe>` elements without titles**
- **Links with no discernible name**

These three issues are critical for screen reader users. They have no way of knowing what an image depicts or where a link leads.

### DOM Structure Errors

- **`<dl>` elements without proper `<dt>/<dd>` structure**
- **`<li>` elements existing without a `<ul>` or `<ol>` parent**
- **`<ul>` containing elements other than `<li>` and script-supporting elements**

These may look like simple markup mistakes, but the consequences are serious. Assistive technologies (ATs) traversing this broken DOM tree completely lose the context of content. Switch controls, keyboard navigation, voice control — none of it works reliably.

### Contrast Issues

- **Insufficient color contrast ratio between foreground and background**

The WCAG standard for small text requires a contrast ratio of at least 4.5:1. Failing to meet this makes text hard to read not just for users with low vision, but for anyone checking their phone in direct sunlight.

### Best Practices Violations

- **Viewport meta tag contains `user-scalable="no"` or `maximum-scale` less than 5**
- **Document lacks major landmark elements (`<main>`, `<nav>`, `<header>`, `<footer>`)**

Blocking zoom with `user-scalable="no"` isn't just a best practice violation — it's an **accessibility violation**.

A score of 62 isn't just a number. It's a signal that a significant portion of all users cannot properly use this site.

---

## Section 3. Our Architectural Solution

Criticism alone changes nothing. As part of our team project, we pre-designed a framework template that directly addresses these problems and measured the results.

### Performance Comparison (Measured Data)

| Metric                | rounz          | Our Site    |
| --------------------- | -------------- | ----------- |
| Performance           | **40** 🔴      | **100** ✅  |
| Accessibility         | **62** 🟡      | **100** ✅  |
| Best Practices        | 69 🟡          | **100** ✅  |
| SEO                   | 85 🟡          | **100** ✅  |
| **LCP**               | **25.0s** 🔴   | **1.2s** ✅ |
| FCP                   | 5.4s 🔴        | 1.2s ✅     |
| TBT                   | **680ms** 🔴   | **0ms** ✅  |
| CLS                   | 0.006 ✅       | 0 ✅        |
| Total Network Payload | **45,554 KiB** | **130 KiB** |

> Test environment: Moto G Power emulation, slow 4G throttling, Lighthouse 13.3.0, June 19, 2026 at 12:21 AM (GMT+9)

How is this possible?

### Key 1. Vite Multi-Entry Build — Real Code Splitting

Many projects claim to "do code splitting" while actually dynamic-importing chunks from a single bundle. We chose to **split entries at the page level** from the start.

```javascript
// vite.config.js
export default defineConfig({
  base: '/est_fe13_2nd_project/',
  build: {
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // Main page
        notFound: resolve(__dirname, '404.html'), // 404 page
      },
    },
  },
});
```

Each HTML file explicitly references only the JS entry it needs.

```javascript
// src/js/pages/index.js — main page only
import 'modern-normalize';
import '../../css/style.css';
import { renderHeader } from '../modules/header.js';
import Swiper from 'swiper';
import '../../css/pages/index.css';
// ... only what the main page needs

// src/js/pages/404.js — 404 page only
import 'modern-normalize';
import '../../css/style.css';
import { renderHeader } from '../modules/header.js';
import '../../css/pages/404.css';
// Swiper? Not needed. Not imported.
```

Vite analyzes this structure at build time and generates only the chunks each page requires. There's no reason to make 404 page visitors download the Swiper library.

A side benefit: the browser's **native preload scanner** can do its job properly. When everything is buried inside a single `bundle.js`, the scanner has no idea CSS or image resources exist until after JavaScript executes. Explicit per-page entries allow CSSOM and DOM construction to proceed **in parallel** from the HTML parsing stage.

---

### Key 2. Resource Hints for Images — Telling the Browser What Matters

One direct cause of the 25-second LCP is that the browser doesn't know which image is most important. We added `fetchpriority="high"` explicitly to the first hero slider image.

```html
<!-- index.html -->
<div class="swiper-wrapper">
  <!-- First slide — LCP target -->
  <div class="swiper-slide">
    <img
      class="hero__image-1"
      src="/images/2.webp"
      alt=""
      fetchpriority="high" />
  </div>
  <!-- Remaining slides — load when needed -->
  <div class="swiper-slide">
    <img src="/images/3.webp" alt="" loading="lazy" />
  </div>
  <div class="swiper-slide">
    <img src="/images/4.webp" alt="" loading="lazy" />
  </div>
</div>
```

The brand background image was made responsive with `srcset`:

```html
<img
  src="/images/main-brand-bg.webp"
  alt=""
  loading="lazy"
  srcset="
    /images/main-brand-bg-480.webp  480w,
    /images/main-brand-bg-768.webp  768w,
    /images/main-brand-bg.webp     1200w
  " />
```

Sending a 1200w image to mobile users is a classic desktop-biased decision. `srcset` lets the browser choose the right image for the current viewport on its own.

---

### Key 3. Minimizing External Resources

Most websites pull in web fonts and icon packs, which means additional downloads for the browser. Korean fonts in particular are far larger than Latin fonts. We chose `system-ui` instead — using whatever font the system already has installed. System default fonts today are genuinely good, and they cost nothing to load.

For icons, loading something like Material Icons via CDN adds significant resource overhead. We used inline SVG instead. Inline SVG generates zero additional network requests, is easier to customize, and unlike icon fonts, essentially never fails to render. We copied SVGs directly from Lucide.

---

### Key 4. Accessibility Is Not a Separate Layer — It's Built Into the Structure

The accessibility score of 100 wasn't the result of a dedicated "accessibility pass" done at the end. It came from writing correct structure from the beginning.

**Section Labeling with `aria-labelledby`**

```html
<!-- index.html -->
<section class="hero" aria-labelledby="hero-heading">
  <h1 id="hero-heading">ROUNZ — A Different Way to See the World</h1>
</section>

<section class="info" aria-labelledby="info-heading">
  <h2 id="info-heading">Information</h2>
</section>
```

Screen readers announce the label when entering a section. `aria-labelledby` reuses a heading already visible on screen, conveying context without duplication.

**Navigation State Management with `aria-expanded` and `inert`**

The mobile hamburger menu is one of the most commonly missed accessibility areas. We implemented two things explicitly:

```javascript
// src/js/modules/header.js
function showNavigationContent() {
  navButton.setAttribute('aria-expanded', 'true'); // Notify AT of state change
  removeNavInert(); // Menu content: make focusable
  makePageInert(); // Main content: make non-focusable
  navCloseBtn.focus(); // Move focus into the menu
}

function hideNav() {
  navButton.setAttribute('aria-expanded', 'false');
  makeNavInert(); // Menu content: trap focus again
  removePageInert(); // Main content: restore focus
}
```

The `inert` attribute removes an element entirely from the focus tree. When the menu is closed, tab-key navigation cannot reach links inside it. This is far more accurate accessibility handling than simply using `display: none`.

**Tab Component — Full ARIA Pattern Implementation**

```javascript
// src/js/modules/tabs.js — on initialization
tabButtons.forEach((tab, index) => {
  if (index === 0) {
    tab.setAttribute('aria-selected', true); // Active tab state
  } else {
    tab.setAttribute('tabindex', '-1'); // Inactive tabs: excluded from tab order
    tabPanels[index].setAttribute('hidden', '');
  }
});

// Keyboard navigation: move between tabs with arrow keys
tabsContainer.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowLeft':
      moveLeft();
      break;
    case 'ArrowRight':
      moveRight();
      break;
    case 'Home':
      switchTab(tabButtons[0]);
      break;
    case 'End':
      switchTab(tabButtons[tabButtons.length - 1]);
      break;
  }
});
```

This is a direct implementation of the WAI-ARIA Authoring Practices Guide tab pattern: arrow key navigation, `Home`/`End` key support, `aria-selected` state management. Someone using only a keyboard can fully operate the tab UI.

**Icons — Separating Decoration from Meaning**

```javascript
// header.js — icons are visual decoration; meaning is conveyed via visually-hidden <span>
`<button aria-label="Open menu">
  <svg aria-hidden="true"></svg>
  <span class="visually-hidden">Open menu</span>
</button>`;
```

`aria-hidden="true"` removes the icon from the accessibility tree, while the button gets its accessible name via the label. A screen reader announces "Open menu button" — not "menu icon button."

---

## Conclusion

rounz.co.kr is not a bad service. It's a well-run, real-world e-commerce platform. The purpose of this analysis wasn't to criticize it, but to examine the kind of technical debt that commonly accumulates in production environments — with concrete data to back it up.

A 25-second LCP is not an unfixable problem. It's the accumulated result of individual architectural decisions, and it can be reversed through architectural decisions.

---

_This analysis was produced as part of a bootcamp team project and is based on real measurement data from Google PageSpeed Insights. rounz measurements: Moto G Power emulation, Lighthouse 13.3.0, June 19, 2026. Framework measurements: same environment, slow 4G throttling, June 19, 2026 at 12:21:17 AM ([View report](https://pagespeed.web.dev/analysis/https-agw76638-github-io-est_fe13_2nd_project/6mw36hvq0k?form_factor=mobile))._

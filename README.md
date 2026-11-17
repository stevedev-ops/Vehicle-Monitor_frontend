# Vehicle Monitor — Frontend (PWA)

Precision vehicle fleet and fuel consumption management system. Designed with an **Offline-First** architecture powered by client-side IndexedDB, on-device Canvas Vision OCR, SMS transaction parsing, and a Service Worker PWA engine.

---

## 🚀 Features

- **Offline-First Data Engine:** 100% on-device IndexedDB database (`VehicleMonitorDB`) saving fuel fill-ups, vehicle profiles, service records, and expenses with zero network latency.
- **Precision Ground-Truth Analytics:** Accurate KM/L consumption calculations, trip computer accuracy margin (% bias), cost-per-kilometer, and brand efficiency rankings.
- **On-Device Vision AI:** Local HTML5 Canvas computer vision and adaptive Otsu binarization for fuel dispenser pump digit recognition.
- **NLP SMS Parsing:** Extracts merchant, station brand (Rubis, Shell, Total, etc.), and amount from payment alerts.
- **Data Portability:** Instant client-side CSV exports and complete JSON database backup downloads.
- **Progressive Web App (PWA):** Installable on Android, iOS, and Desktop with offline caching via Service Worker.

---

## 🌐 Deploy to Vercel

This frontend is fully configured for **instant deployment to Vercel** as a static site.

### Option 1: 1-Click Import from GitHub
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import the `stevedev-ops/Vehicle-Monitor_frontend` repository.
4. Framework Preset: **Other**.
5. Root Directory: `./` (Leave as default).
6. Build Command: *Leave empty* (no build step needed).
7. Output Directory: *Leave empty*.
8. Click **Deploy**.

Vercel will automatically read `vercel.json` to handle path rewrites and service worker headers.

---

## 💻 Local Development

You can run the frontend locally using any static web server:

```bash
# Using Python
python -m http.server 3000

# Using Node.js (npx)
npx serve .
```

Open `http://localhost:3000` in your browser.

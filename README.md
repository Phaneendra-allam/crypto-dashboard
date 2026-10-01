# Crypto Pulse Dashboard

A modern crypto dashboard with live market data, interactive charts, portfolio tracking, and price alerts.

## Features

- Live prices from CoinGecko and Binance public APIs
- Real-time market cards for top crypto assets
- Interactive price chart for selected coins
- Portfolio tracking with localStorage persistence
- Price alert system with toast notifications
- Responsive, mobile-friendly dashboard layout

## Run locally

Because this app uses browser fetch calls, it can run directly in a browser with a local server.

### Option 1: Quick browser testing
Open `index.html` directly in your browser.

### Option 2: Serve with a local web server
```bash
cd crypto-dashboard
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

## Project files

- `index.html` - app structure
- `styles.css` - dashboard styling
- `app.js` - live market logic and portfolio features

## Notes

- The app uses public APIs and does not require a paid API key for basic functionality.
- For production usage, consider adding rate limiting, caching, and a backend key manager.
- Data refresh interval is set to 60 seconds for the live dashboard.

## Deployment

This static site can be deployed to:

- Vercel
- Netlify
- GitHub Pages

## Example deployment with Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Use the default settings for a static site.
4. Deploy.

The app is ready to go as a front-end-only crypto dashboard.

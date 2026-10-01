const COIN_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin', 'binancecoin', 'tether'];
const COIN_MAP = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT' },
  ethereum: { symbol: 'ETH', name: 'Ethereum', binance: 'ETHUSDT' },
  solana: { symbol: 'SOL', name: 'Solana', binance: 'SOLUSDT' },
  ripple: { symbol: 'XRP', name: 'XRP', binance: 'XRPUSDT' },
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin', binance: 'DOGEUSDT' },
  binancecoin: { symbol: 'BNB', name: 'BNB', binance: 'BNBUSDT' },
  tether: { symbol: 'USDT', name: 'Tether', binance: 'USDTUSDT' },
};

const defaultPortfolio = [
  { symbol: 'BTC', amount: 0.5 },
  { symbol: 'ETH', amount: 2 },
];

const marketCapEl = document.getElementById('marketCap');
const marketVolumeEl = document.getElementById('marketVolume');
const btcDominanceEl = document.getElementById('btcDominance');
const marketCardsEl = document.getElementById('marketCards');
const watchlistTableEl = document.getElementById('watchlistTable');
const coinSelect = document.getElementById('coinSelect');
const chartTitleEl = document.getElementById('chartTitle');
const portfolioSummaryEl = document.getElementById('portfolioSummary');
const portfolioForm = document.getElementById('portfolioForm');
const portfolioListEl = document.getElementById('portfolioList');
const alertForm = document.getElementById('alertForm');
const alertListEl = document.getElementById('alertList');
const refreshBtn = document.getElementById('refreshBtn');
const toastEl = document.getElementById('toast');

let marketData = [];
let chartInstance = null;
let selectedCoinId = 'bitcoin';

const storedPortfolio = JSON.parse(localStorage.getItem('crypto-dashboard-portfolio') || 'null') || defaultPortfolio;
const storedAlerts = JSON.parse(localStorage.getItem('crypto-dashboard-alerts') || '[]');

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value) {
  if (value == null) return '0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function updateToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(updateToast.timeoutId);
  updateToast.timeoutId = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2600);
}

function getCoinIcon(name) {
  const icons = {
    bitcoin: '₿',
    ethereum: 'Ξ',
    solana: 'S',
    ripple: 'X',
    dogecoin: 'D',
    binancecoin: 'B',
    tether: 'T',
  };
  return icons[name] || 'C';
}

async function fetchMarketData() {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load market data');
  }
  const data = await response.json();
  marketData = data;

  const totalMarketCap = data.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  const totalVolume = data.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
  const btc = data.find((coin) => coin.id === 'bitcoin');

  marketCapEl.textContent = formatCompactCurrency(totalMarketCap);
  marketVolumeEl.textContent = formatCompactCurrency(totalVolume);
  btcDominanceEl.textContent = btc ? `${((btc.market_cap / totalMarketCap) * 100).toFixed(1)}%` : '0%';

  renderMarketCards();
  renderWatchlist();
  renderPortfolio();
  checkAlerts();
}

function renderMarketCards() {
  marketCardsEl.innerHTML = marketData
    .slice(0, 4)
    .map((coin) => {
      const trendClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
      return `
        <article class="coin-card" data-coin="${coin.id}">
          <div class="coin-top">
            <div class="coin-name">
              <span class="coin-icon">${getCoinIcon(coin.id)}</span>
              <span>${coin.name}</span>
            </div>
            <span class="coin-symbol">${coin.symbol.toUpperCase()}</span>
          </div>

          <div class="price">${formatCurrency(coin.current_price)}</div>
          <div class="movement ${trendClass}">${formatPercent(coin.price_change_percentage_24h || 0)}</div>

          <div class="coin-meta">
            <span>Cap</span>
            <strong>${formatCompactCurrency(coin.market_cap)}</strong>
          </div>
        </article>
      `;
    })
    .join('');

  document.querySelectorAll('.coin-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedCoinId = card.dataset.coin;
      coinSelect.value = selectedCoinId;
      renderChart();
    });
  });
}

function renderWatchlist() {
  watchlistTableEl.innerHTML = marketData
    .map((coin) => {
      const trendClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
      return `
        <tr data-coin="${coin.id}">
          <td>
            <div class="coin-cell">
              <span class="coin-icon">${getCoinIcon(coin.id)}</span>
              <div>
                <div>${coin.name}</div>
                <span class="coin-symbol">${coin.symbol.toUpperCase()}</span>
              </div>
            </div>
          </td>
          <td>${formatCurrency(coin.current_price)}</td>
          <td class="${trendClass}">${formatPercent(coin.price_change_percentage_24h || 0)}</td>
          <td>${formatCompactCurrency(coin.market_cap)}</td>
        </tr>
      `;
    })
    .join('');

  watchlistTableEl.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', () => {
      selectedCoinId = row.dataset.coin;
      coinSelect.value = selectedCoinId;
      renderChart();
    });
  });
}

async function fetchChartData(coinId) {
  const coinInfo = COIN_MAP[coinId];
  if (!coinInfo) return [];

  if (coinId === 'tether') {
    return [];
  }

  const url = `https://api.binance.com/api/v3/klines?symbol=${coinInfo.binance}&interval=1h&limit=24`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch chart data');
  }
  const data = await response.json();
  return data.map((entry) => ({
    time: entry[0] / 1000,
    value: Number(entry[4]),
  }));
}

async function renderChart() {
  const coin = marketData.find((item) => item.id === selectedCoinId) || marketData[0];
  chartTitleEl.textContent = coin ? `${coin.name} (${coin.symbol.toUpperCase()})` : 'Market';

  try {
    const chartData = await fetchChartData(selectedCoinId);

    const labels = chartData.map((point) => new Date(point.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const values = chartData.map((point) => point.value);

    const ctx = document.getElementById('priceChart');
    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return `Price: ${formatCurrency(context.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8ea3bb', maxTicksLimit: 8 },
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.08)' },
            ticks: {
              color: '#8ea3bb',
              callback: (value) => formatCurrency(value),
            },
          },
        },
      },
    });
  } catch (error) {
    console.error(error);
    updateToast('Chart data could not be loaded right now.');
  }
}

function renderPortfolio() {
  const tracked = marketData.length ? marketData : [];
  const map = new Map(tracked.map((entry) => [entry.symbol.toUpperCase(), entry]));

  const holdings = storedPortfolio.map((item) => {
    const match = map.get(item.symbol.toUpperCase());
    const price = match ? match.current_price : 0;
    const value = item.amount * price;
    return { ...item, price, value };
  });

  const total = holdings.reduce((sum, item) => sum + item.value, 0);
  portfolioSummaryEl.textContent = `Total value: ${formatCurrency(total)}`;

  if (!holdings.length) {
    portfolioListEl.innerHTML = '<div class="portfolio-item"><div><strong>No holdings yet</strong><div class="item-sub">Add a coin and amount to begin.</div></div></div>';
    return;
  }

  portfolioListEl.innerHTML = holdings
    .map((item) => `
      <div class="portfolio-item">
        <div>
          <strong>${item.symbol}</strong>
          <div class="item-sub">${item.amount} @ ${formatCurrency(item.price)}</div>
        </div>
        <div>
          <strong>${formatCurrency(item.value)}</strong>
          <button class="delete-btn" data-remove="${item.symbol}" aria-label="Remove ${item.symbol}">×</button>
        </div>
      </div>
    `)
    .join('');

  portfolioListEl.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const symbol = button.dataset.remove;
      const updated = storedPortfolio.filter((entry) => entry.symbol.toUpperCase() !== symbol.toUpperCase());
      localStorage.setItem('crypto-dashboard-portfolio', JSON.stringify(updated));
      renderPortfolio();
    });
  });
}

function renderAlerts() {
  if (!storedAlerts.length) {
    alertListEl.innerHTML = '<div class="alert-item"><div><strong>No alerts set</strong><div class="item-sub">Create a trigger when a coin reaches your target.</div></div></div>';
    return;
  }

  alertListEl.innerHTML = storedAlerts
    .map((alert) => `
      <div class="alert-item">
        <div>
          <strong>${COIN_MAP[alert.coin]?.name || alert.coin}</strong>
          <div class="item-sub">Above ${formatCurrency(alert.target)}</div>
        </div>
        <button class="delete-btn" data-alert-remove="${alert.id}" aria-label="Remove alert">×</button>
      </div>
    `)
    .join('');

  alertListEl.querySelectorAll('[data-alert-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.alertRemove;
      const updated = storedAlerts.filter((alert) => alert.id !== id);
      localStorage.setItem('crypto-dashboard-alerts', JSON.stringify(updated));
      renderAlerts();
      checkAlerts();
    });
  });
}

function checkAlerts() {
  const map = new Map(marketData.map((coin) => [coin.id, coin.current_price]));
  const alerts = JSON.parse(localStorage.getItem('crypto-dashboard-alerts') || '[]');

  alerts.forEach((alert) => {
    const price = map.get(alert.coin);
    if (typeof price === 'number' && price >= Number(alert.target)) {
      updateToast(`${COIN_MAP[alert.coin]?.name || alert.coin} reached ${formatCurrency(alert.target)}!`);
      const updated = alerts.filter((item) => item.id !== alert.id);
      localStorage.setItem('crypto-dashboard-alerts', JSON.stringify(updated));
      renderAlerts();
    }
  });
}

portfolioForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const symbol = document.getElementById('portfolioSymbol').value.trim().toUpperCase();
  const amount = Number(document.getElementById('portfolioAmount').value);

  if (!symbol || !amount || amount <= 0) {
    updateToast('Please enter a valid coin symbol and amount.');
    return;
  }

  const current = JSON.parse(localStorage.getItem('crypto-dashboard-portfolio') || '[]');
  const existing = current.find((item) => item.symbol.toUpperCase() === symbol);

  if (existing) {
    existing.amount += amount;
  } else {
    current.push({ symbol, amount });
  }

  localStorage.setItem('crypto-dashboard-portfolio', JSON.stringify(current));
  portfolioForm.reset();
  renderPortfolio();
  updateToast(`${symbol} successfully added to portfolio.`);
});

alertForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const coin = document.getElementById('alertCoin').value;
  const target = Number(document.getElementById('alertTarget').value);

  if (!coin || !target || target <= 0) {
    updateToast('Please set a valid price target.');
    return;
  }

  const alerts = JSON.parse(localStorage.getItem('crypto-dashboard-alerts') || '[]');
  alerts.push({
    id: `${coin}-${Date.now()}`,
    coin,
    target,
  });

  localStorage.setItem('crypto-dashboard-alerts', JSON.stringify(alerts));
  alertForm.reset();
  renderAlerts();
  updateToast('Alert added successfully.');
});

coinSelect.addEventListener('change', (event) => {
  selectedCoinId = event.target.value;
  renderChart();
});

refreshBtn.addEventListener('click', async () => {
  updateToast('Refreshing data...');
  await fetchMarketData();
  await renderChart();
});

async function init() {
  try {
    await fetchMarketData();
    coinSelect.value = selectedCoinId;
    renderAlerts();
    await renderChart();
    setInterval(async () => {
      await fetchMarketData();
      await renderChart();
    }, 60000);
  } catch (error) {
    console.error(error);
    updateToast('Unable to connect to crypto data sources.');
  }
}

init();

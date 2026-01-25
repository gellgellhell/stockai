const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance';

/**
 * GET /api/market/crypto/top
 * 인기 코인 목록
 */
router.get('/crypto/top', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const response = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error('CoinGecko API error');
    }

    const data = await response.json();

    const coins = data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h?.toFixed(2),
      marketCap: coin.market_cap,
      volume: coin.total_volume,
      image: coin.image
    }));

    res.json({
      success: true,
      count: coins.length,
      data: coins
    });
  } catch (error) {
    console.error('Crypto top error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/crypto/:id
 * 코인 상세 정보
 */
router.get('/crypto/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await fetch(
      `${COINGECKO_BASE}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!response.ok) {
      throw new Error('CoinGecko API error');
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        id: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        price: data.market_data.current_price.usd,
        marketCap: data.market_data.market_cap.usd,
        volume24h: data.market_data.total_volume.usd,
        change24h: data.market_data.price_change_percentage_24h,
        change7d: data.market_data.price_change_percentage_7d,
        change30d: data.market_data.price_change_percentage_30d,
        high24h: data.market_data.high_24h.usd,
        low24h: data.market_data.low_24h.usd,
        ath: data.market_data.ath.usd,
        atl: data.market_data.atl.usd,
        image: data.image?.large
      }
    });
  } catch (error) {
    console.error('Crypto detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/stock/:symbol
 * 주식 정보
 */
router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    const response = await fetch(
      `${YAHOO_FINANCE_BASE}/chart/${symbol}?interval=1d&range=5d`
    );

    if (!response.ok) {
      throw new Error('Yahoo Finance API error');
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error('No data found');
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const closes = quote?.close || [];
    const currentPrice = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = prevClose ? ((currentPrice - prevClose) / prevClose * 100) : 0;

    res.json({
      success: true,
      data: {
        symbol: meta.symbol,
        name: meta.shortName || meta.symbol,
        price: currentPrice,
        prevClose,
        change: parseFloat(change.toFixed(2)),
        currency: meta.currency,
        exchange: meta.exchangeName,
        high: closes.filter(Boolean).length > 0 ? Math.max(...closes.filter(Boolean)) : currentPrice,
        low: closes.filter(Boolean).length > 0 ? Math.min(...closes.filter(Boolean)) : currentPrice
      }
    });
  } catch (error) {
    console.error('Stock detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/search
 * 종목 검색
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    // CoinGecko 검색
    const cryptoResponse = await fetch(
      `${COINGECKO_BASE}/search?query=${encodeURIComponent(q)}`
    );
    const cryptoData = await cryptoResponse.json();

    // Yahoo Finance 검색
    const stockResponse = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`
    );
    const stockData = await stockResponse.json();

    const cryptos = (cryptoData.coins || []).slice(0, 5).map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      type: 'crypto',
      image: coin.thumb
    }));

    const stocks = (stockData.quotes || [])
      .filter(q => q.quoteType === 'EQUITY')
      .slice(0, 5)
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.shortname || stock.longname,
        type: 'stock',
        exchange: stock.exchange
      }));

    res.json({
      success: true,
      data: {
        cryptos,
        stocks,
        total: cryptos.length + stocks.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

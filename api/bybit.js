// api/bybit.js - Vercel Serverless Function (гибридная версия)
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Проверяем какой API запрошен
    const { symbol, interval, limit } = req.query;
    
    // Если есть параметры для kline - возвращаем kline данные
    if (symbol && interval) {
        return await handleKlineRequest(req, res, symbol, interval, limit);
    }
    
    // Иначе возвращаем ticker данные (все монеты)
    return await handleTickerRequest(req, res);
}

// Обработка ticker запросов (24h данные для всех монет)
async function handleTickerRequest(req, res) {
    const BYBIT_API = 'https://api.bybit.com/v5/market/tickers?category=linear';
    
    try {
        console.log('[Vercel] Fetching tickers...');
        
        const response = await fetch(BYBIT_API, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Bybit API error',
                status: response.status
            });
        }
        
        const data = await response.json();
        
        if (data.retCode !== 0) {
            return res.status(500).json({
                error: 'Bybit API error',
                retCode: data.retCode,
                message: data.retMsg
            });
        }
        
        const marketCount = data.result?.list?.length || 0;
        console.log(`[Vercel] Tickers success: ${marketCount} markets`);
        
        return res.status(200).json({
            ...data,
            _source: 'Bybit Ticker API (24h)',
            _timestamp: new Date().toISOString(),
            _markets: marketCount
        });
        
    } catch (error) {
        console.error('[Vercel] Ticker error:', error);
        return res.status(500).json({
            error: 'Serverless function error',
            message: error.message
        });
    }
}

// Обработка kline запросов (свечи для конкретной монеты)
async function handleKlineRequest(req, res, symbol, interval, limit = 1) {
    const BYBIT_KLINE_API = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    try {
        console.log(`[Vercel] Fetching kline: ${symbol} ${interval}`);
        
        const response = await fetch(BYBIT_KLINE_API, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Bybit kline API error',
                status: response.status,
                symbol: symbol
            });
        }
        
        const data = await response.json();
        
        if (data.retCode !== 0) {
            return res.status(500).json({
                error: 'Bybit kline API error',
                retCode: data.retCode,
                message: data.retMsg,
                symbol: symbol
            });
        }
        
        console.log(`[Vercel] Kline success: ${symbol}`);
        
        return res.status(200).json({
            ...data,
            _source: 'Bybit Kline API',
            _symbol: symbol,
            _interval: interval,
            _timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`[Vercel] Kline error for ${symbol}:`, error);
        return res.status(500).json({
            error: 'Serverless kline error',
            message: error.message,
            symbol: symbol
        });
    }
}

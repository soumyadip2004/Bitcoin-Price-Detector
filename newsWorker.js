// News Worker
const NEWS_API_KEY = 'your_news_api_key';
const CACHE_NAME = 'bitcoin-news-cache';

self.addEventListener('message', async (e) => {
    if (e.data.type === 'fetchNews') {
        try {
            const news = await fetchNews();
            self.postMessage(news);
        } catch (error) {
            self.postMessage({ error: 'Failed to fetch news' });
        }
    }
});

async function fetchNews() {
    const response = await fetch(
        `https://newsapi.org/v2/everything?q=bitcoin&apiKey=${NEWS_API_KEY}&pageSize=6&language=en`
    );
    const data = await response.json();
    return data.articles;
} 
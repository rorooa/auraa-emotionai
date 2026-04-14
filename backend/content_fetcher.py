"""
ContentFetcher — Modular trending content aggregator.
Sources: YouTube Data API, NewsAPI, Reddit public JSON.
Includes TTL caching and per-session deduplication.
"""

import os
import random
import time
import requests
from typing import Optional

# --------------- CACHE ---------------
_cache: dict = {}
_CACHE_TTL = 600  # 10 minutes

def _get_cached(key: str) -> Optional[list]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None

def _set_cache(key: str, data: list):
    _cache[key] = {"data": data, "ts": time.time()}

# --------------- YOUTUBE ---------------
def fetch_youtube_trending(max_results: int = 10) -> list[dict]:
    """Fetch trending YouTube videos (most popular)."""
    cached = _get_cached("youtube")
    if cached:
        return cached

    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        print("[ContentFetcher] YOUTUBE_API_KEY not set, skipping YouTube.")
        return []

    try:
        url = "https://www.googleapis.com/youtube/v3/videos"
        params = {
            "part": "snippet",
            "chart": "mostPopular",
            "regionCode": "US",
            "maxResults": max_results,
            "videoCategoryId": "0",  # All categories
            "key": api_key,
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for item in data.get("items", []):
            snippet = item["snippet"]
            video_id = item["id"]
            results.append({
                "type": _classify_youtube(snippet),
                "title": snippet["title"],
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "source": "youtube",
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
            })

        _set_cache("youtube", results)
        return results
    except Exception as e:
        print(f"[ContentFetcher] YouTube error: {e}")
        return []


def _classify_youtube(snippet: dict) -> str:
    """Classify a YouTube video into funny/news/educational based on metadata."""
    title = (snippet.get("title", "") + " " + snippet.get("description", "")).lower()
    category = snippet.get("categoryId", "")

    funny_keywords = ["funny", "comedy", "laugh", "meme", "hilarious", "prank", "fail", "lol"]
    edu_keywords = ["learn", "tutorial", "explained", "how to", "science", "education", "course"]
    news_keywords = ["breaking", "news", "update", "report", "politics", "election", "crisis"]

    if any(k in title for k in funny_keywords) or category == "23":  # Comedy
        return "funny"
    elif any(k in title for k in edu_keywords) or category in ("27", "28"):  # Education/Science
        return "educational"
    elif any(k in title for k in news_keywords) or category == "25":  # News
        return "news"
    return random.choice(["funny", "news", "educational"])


# --------------- NEWS API ---------------
def fetch_news(max_results: int = 10) -> list[dict]:
    """Fetch top headlines from NewsAPI."""
    cached = _get_cached("news")
    if cached:
        return cached

    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        print("[ContentFetcher] NEWS_API_KEY not set, skipping News.")
        return []

    try:
        url = "https://newsapi.org/v2/top-headlines"
        params = {
            "country": "us",
            "pageSize": max_results,
            "apiKey": api_key,
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for article in data.get("articles", []):
            if not article.get("title") or article["title"] == "[Removed]":
                continue
            results.append({
                "type": "news",
                "title": article["title"],
                "url": article.get("url", ""),
                "source": "news",
                "thumbnail": article.get("urlToImage", ""),
            })

        _set_cache("news", results)
        return results
    except Exception as e:
        print(f"[ContentFetcher] News error: {e}")
        return []


# --------------- REDDIT ---------------
def fetch_reddit_trending(max_results: int = 10) -> list[dict]:
    """Fetch trending posts from r/popular (no API key needed)."""
    cached = _get_cached("reddit")
    if cached:
        return cached

    try:
        url = "https://www.reddit.com/r/popular.json"
        headers = {"User-Agent": "AURAA-Companion/1.0"}
        resp = requests.get(url, headers=headers, params={"limit": max_results}, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for child in data.get("data", {}).get("children", []):
            post = child.get("data", {})
            subreddit = post.get("subreddit", "").lower()
            title = post.get("title", "")

            # Classify based on subreddit
            content_type = "funny"
            if subreddit in ("worldnews", "news", "politics", "technology"):
                content_type = "news"
            elif subreddit in ("todayilearned", "science", "explainlikeimfive", "askscience", "space"):
                content_type = "educational"
            elif subreddit in ("funny", "memes", "dankmemes", "unexpected", "facepalm"):
                content_type = "funny"

            results.append({
                "type": content_type,
                "title": title,
                "url": f"https://reddit.com{post.get('permalink', '')}",
                "source": "reddit",
                "thumbnail": post.get("thumbnail", "") if post.get("thumbnail", "").startswith("http") else "",
            })

        _set_cache("reddit", results)
        return results
    except Exception as e:
        print(f"[ContentFetcher] Reddit error: {e}")
        return []


# --------------- MAIN INTERFACE ---------------
class ContentFetcher:
    """
    Aggregates content from all sources, filters by emotion context,
    and tracks already-sent content to prevent repetition.
    """

    def __init__(self):
        self._sent_urls: set = set()

    def get_content_for_emotion(self, emotion: str) -> Optional[dict]:
        """
        Pick a single piece of content appropriate for the user's current emotion.
        
        Mapping:
          sad/angry/fear → funny (to cheer them up)
          neutral → trending (news or reddit)
          happy/surprise → educational or funny
        """
        emotion = emotion.lower()

        # Decide what type of content to fetch
        if emotion in ("sad", "angry", "fear"):
            desired_type = "funny"
        elif emotion in ("happy", "surprise"):
            desired_type = random.choice(["funny", "educational"])
        else:  # neutral, disgust, etc.
            desired_type = random.choice(["news", "funny", "educational"])

        # Gather all content from all sources
        all_content = []
        all_content.extend(fetch_youtube_trending())
        all_content.extend(fetch_news())
        all_content.extend(fetch_reddit_trending())

        # Filter by desired type and exclude already-sent
        candidates = [
            c for c in all_content
            if c["type"] == desired_type and c["url"] not in self._sent_urls
        ]

        # Fallback: if no candidates of desired type, try any unsent
        if not candidates:
            candidates = [c for c in all_content if c["url"] not in self._sent_urls]

        if not candidates:
            return None

        chosen = random.choice(candidates)
        self._sent_urls.add(chosen["url"])
        return chosen

    def reset(self):
        """Clear sent history (call on new session)."""
        self._sent_urls.clear()

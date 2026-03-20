// src/utils/contentModeration.js
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-sonnet-20240620"; // Updated to the latest fast model

// ─────────────────────────────────────────────────────────────
// YOUTUBE HELPERS
// ─────────────────────────────────────────────────────────────
export function extractYoutubeId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&\n?#]{11})/);
  return match ? match[1] : null;
}

export function getYoutubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export async function fetchYoutubeMetadata(url) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (!res.ok) throw new Error("oEmbed failed");
    const data = await res.json();
    return {
      title:      data.title       || "Unknown Title",
      channel:    data.author_name || "Unknown Channel",
      thumbnail:  data.thumbnail_url,
    };
  } catch {
    const id = extractYoutubeId(url);
    return {
      title:     "YouTube Video",
      channel:   "Unknown",
      thumbnail: id ? getYoutubeThumbnail(id) : null,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// LINK MODERATION
// ─────────────────────────────────────────────────────────────
const BLOCKED_DOMAINS = [
  "instagram.com", "tiktok.com", "snapchat.com", "twitter.com",
  "x.com", "facebook.com", "reddit.com", "twitch.tv",
  "onlyfans.com", "pornhub.com", "xvideos.com",
];

const STUDY_DOMAINS_ALLOWLIST = [
  "youtube.com", "youtu.be",
  "arxiv.org", "scholar.google.com", "researchgate.net",
  "khanacademy.org", "coursera.org", "edx.org", "udemy.com",
  "mit.edu", "stanford.edu", "wikipedia.org",
  "nptel.ac.in", "brilliant.org", "wolframalpha.com",
  "github.com", "stackoverflow.com", "geeksforgeeks.org",
  "docs.google.com", "drive.google.com",
  "sciencedirect.com", "jstor.org", "springer.com", "nature.com",
];

function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return ""; }
}

export function quickCheckUrl(url) {
  const domain = getDomain(url);
  if (BLOCKED_DOMAINS.some((b) => domain.includes(b))) {
    return { allowed: false, reason: "Social media and adult sites are not allowed in study rooms.", category: "blocked_domain" };
  }
  if (STUDY_DOMAINS_ALLOWLIST.some((a) => domain.includes(a))) {
    return { allowed: true, reason: "Trusted study resource.", category: "allowlisted" };
  }
  return { allowed: null, reason: "Needs review", category: "unknown" };
}

// API Call Headers Helper
const getAnthropicHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerously-allow-browser": "true" // Required for React client-side calls
});

export async function moderateUrlWithAI(url, title = "", description = "") {
  const prompt = `You are a content moderator for CLOCKEDIN, a collaborative study app used by university students. A user wants to add this link: URL: ${url} Title: ${title}. Decide if this link is appropriate. Block if it is social media, adult, piracy, or non-educational entertainment. Respond ONLY with valid JSON: { "allowed": true/false, "confidence": "high/medium/low", "category": "educational/entertainment/social_media/adult/piracy/other", "reason": "one sentence explanation" }`;

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: getAnthropicHeaders(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    return { allowed: true, confidence: "low", category: "other", reason: "Could not verify. Proceed with caution." };
  }
}

export async function moderateDocument(filename, description = "", subject = "") {
  const ext = filename.split(".").pop().toLowerCase();
  const BLOCKED_EXTS = ["exe", "bat", "sh", "cmd", "msi", "apk", "dmg", "js", "php", "py", "rb"];
  
  if (BLOCKED_EXTS.includes(ext)) {
    return { allowed: false, reason: `File type .${ext} is not allowed for security reasons.` };
  }

  const ALLOWED_EXTS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "md", "png", "jpg", "jpeg", "csv"];
  if (!ALLOWED_EXTS.includes(ext)) {
    return { allowed: false, reason: `File type .${ext} is not supported.` };
  }

  const prompt = `You are a content moderator for CLOCKEDIN. A student wants to upload: Filename: ${filename} Subject: ${subject}. Reject if the filename strongly suggests pirated media, malware, adult content, or completely irrelevant personal files. Respond ONLY with valid JSON: { "allowed": true/false, "reason": "one sentence shown if rejected" }`;

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: getAnthropicHeaders(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { allowed: true, reason: "" }; 
  }
}

export async function summarizeYoutubeVideo({ title, channel, url, subject = "" }) {
  const prompt = `You are a study assistant for CLOCKEDIN. A student shared this video: Title: "${title}" Channel: "${channel}" URL: ${url}. Generate a helpful study summary. Respond ONLY with valid JSON: { "overview": "2-3 sentence description", "keyPoints": ["point 1", "point 2", "point 3"], "noteTip": "one practical tip", "estimatedLevel": "Beginner | Intermediate | Advanced", "studyRelevance": "High | Medium | Low" }`;

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: getAnthropicHeaders(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    return null;
  }
}
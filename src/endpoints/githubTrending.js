// Endpoint: GitHub trending repositories (GitHub search API, no auth)
import { fetchJson } from "../util.js";

const daysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const URL = `https://api.github.com/search/repositories?q=created:>${daysAgo}&sort=stars&order=desc&per_page=20`;

export async function githubTrending() {
  const data = await fetchJson(URL, { Accept: "application/vnd.github+json" });
  return {
    generated_at: new Date().toISOString(),
    source: "api.github.com search (created last 7 days, by stars)",
    repos: (data?.items || []).map((r) => ({
      full_name: r.full_name,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      url: r.html_url,
      created_at: r.created_at,
    })),
  };
}

export const meta = {
  description: "GitHub trending repositories created in the last 7 days, sorted by stars (top 20).",
};

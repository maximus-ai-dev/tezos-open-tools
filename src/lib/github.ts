// Public GitHub API (rate-limited unauthenticated; 60/hr). We cache 5 min.
// No tokens here — the repo URL is public anyway.

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

export interface RecentCommit {
  sha: string;
  subject: string;
  url: string;
  date: string;
}

const REPO_API = "https://api.github.com/repos/maximus-ai-dev/tezos-open-tools";

export async function getRecentCommits(limit = 5): Promise<RecentCommit[]> {
  try {
    const res = await fetch(`${REPO_API}/commits?per_page=${limit}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as GitHubCommit[];
    return data.map((c) => ({
      sha: c.sha,
      subject: c.commit.message.split("\n")[0],
      url: c.html_url,
      date: c.commit.author.date,
    }));
  } catch {
    return [];
  }
}

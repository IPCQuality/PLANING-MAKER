import { CONFIG } from '../config.js';

export class GitHubSync {
  static async fetchCurrentState() {
    try {
      const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/planning.json`, {
        headers: { 'Authorization': `token ${CONFIG.GITHUB_TOKEN}` }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return {
        sha: data.sha,
        content: JSON.parse(atob(data.content))
      };
    } catch (e) {
      console.error("Gagal memuat state dari GitHub repository", e);
      return null;
    }
  }

  static async commitState(payload, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
      const currentState = await this.fetchCurrentState();
      const sha = currentState ? currentState.sha : null;
      
      const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/planning.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: "⚠️ System Auto-Plan Factory State Update",
          content: btoa(JSON.stringify(payload, null, 2)),
          sha: sha,
          branch: CONFIG.BRANCH
        })
      });

      if (response.ok) return true;
      if (response.status !== 409) break; // Keluar jika bukan error konflik SHA
      console.warn(`Benturan SHA terdeteksi. Melakukan retry putaran ke-${i+1}...`);
    }
    return false;
  }
}
import {
  createAppJwt,
  getInstallationToken,
  isGithubAppConfigured,
} from "../apps/web/src/lib/github-app.ts";

const configured = isGithubAppConfigured();
console.log(`github_app_configured=${configured}`);
if (!configured) process.exit(0);

const res = await fetch("https://api.github.com/app", {
  headers: {
    Authorization: `Bearer ${createAppJwt()}`,
    Accept: "application/vnd.github+json",
  },
});
console.log(`app_auth_status=${res.status}`);
if (res.ok) {
  const data: any = await res.json();
  console.log(`app_slug=${data.slug ?? "unknown"}`);
}

for (const repo of ["meet-web", "problem1", "test1"]) {
  const token = await getInstallationToken("arjundsingh", repo);
  console.log(`installation_${repo}=${token ? "present" : "missing"}`);
}

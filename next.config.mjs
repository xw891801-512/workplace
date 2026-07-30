const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/workplace" : "",
  assetPrefix: isGitHubPages ? "/workplace/" : "",
  images: {
    unoptimized: true
  }
};

export default nextConfig;

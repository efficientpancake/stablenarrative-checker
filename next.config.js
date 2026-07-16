/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Stamped into support reports so a bug names the exact build it came from.
    // Netlify sets COMMIT_REF at build time; locally there's no commit, so fall
    // back to the package version.
    NEXT_PUBLIC_BUILD: process.env.COMMIT_REF
      ? process.env.COMMIT_REF.slice(0, 7)
      : `v${require("./package.json").version}-local`,
  },
};

module.exports = nextConfig;

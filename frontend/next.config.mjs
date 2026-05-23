/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/tools/jwt-decoder", destination: "/tools/jwt", permanent: true },
      { source: "/tools/jwt-builder", destination: "/tools/jwt", permanent: true },
      { source: "/tools/jwt-verifier", destination: "/tools/jwt", permanent: true },
      { source: "/tools/regex-tester", destination: "/tools/regex", permanent: true },
      { source: "/tools/java-regex", destination: "/tools/regex", permanent: true },
      { source: "/tools/regex-escape", destination: "/tools/regex", permanent: true },
      { source: "/tools/regex-replace", destination: "/tools/regex", permanent: true },
      { source: "/tools/openapi-viewer", destination: "/tools/openapi", permanent: true },
      { source: "/tools/redoc-viewer", destination: "/tools/openapi", permanent: true },
      { source: "/tools/openapi-validator", destination: "/tools/openapi", permanent: true },
      { source: "/tools/openapi-schema-explorer", destination: "/tools/openapi", permanent: true },
      { source: "/tools/toml-formatter", destination: "/tools/toml", permanent: true },
      { source: "/tools/toml-validator", destination: "/tools/toml", permanent: true },
      { source: "/tools/toml-to-json", destination: "/tools/toml", permanent: true },
      { source: "/tools/ssl-checker", destination: "/tools/ssl", permanent: true },
      { source: "/tools/ssl-chain", destination: "/tools/ssl", permanent: true },
      { source: "/tools/color-picker", destination: "/tools/css-color", permanent: true },
      { source: "/tools/hex-rgb-hsl-converter", destination: "/tools/css-color", permanent: true },
      { source: "/tools/contrast-checker", destination: "/tools/css-color", permanent: true },
      { source: "/tools/css-gradient", destination: "/tools/css-color", permanent: true },
      { source: "/tools/css-box-shadow", destination: "/tools/css-color", permanent: true },
      { source: "/tools/css-clamp-calculator", destination: "/tools/css-color", permanent: true },
      { source: "/tools/css-formatter", destination: "/tools/css-color", permanent: true },
      { source: "/tools/password-generator", destination: "/tools/generators", permanent: true },
      { source: "/tools/passphrase-generator", destination: "/tools/generators", permanent: true },
      { source: "/tools/random-token-generator", destination: "/tools/generators", permanent: true },
      { source: "/tools/uuid-generator", destination: "/tools/generators", permanent: true },
      { source: "/tools/nanoid-generator", destination: "/tools/generators", permanent: true },
      { source: "/tools/ulid-generator", destination: "/tools/generators", permanent: true },
      { source: "/tools/qr-generator", destination: "/tools/generators", permanent: true },
      { source: "/tools/lorem-ipsum", destination: "/tools/generators", permanent: true },
      { source: "/tools/slug-generator", destination: "/tools/generators", permanent: true },
    ];
  },
};

export default nextConfig;

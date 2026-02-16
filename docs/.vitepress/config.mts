import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Virto Signers",
  description: "Documentation for Virto Signer packages",
  base: "/papi-signers/",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/substrate" },
      { text: "API", link: "/api/README" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Substrate Authenticator", link: "/guide/substrate" },
          { text: "WebAuthn Authenticator", link: "/guide/webauthn" },
          { text: "Kreivo Signer", link: "/guide/signer" },
        ],
      },
      {
        text: "API Reference",
        items: [
          {
            text: "Substrate Authenticator",
            link: "/api/authenticators/substrate/src/README",
          },
          {
            text: "WebAuthn Authenticator",
            link: "/api/authenticators/webauthn/src/README",
          },
          { text: "Kreivo Signer", link: "/api/signer/src/README" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/virto-network/papi-signers" },
    ],
  },
});

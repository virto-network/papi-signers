import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Virto Signers",
  description: "Documentation for Virto Signer packages",
  base: "/papi-signers/",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/examples" },
      { text: "API", link: "/api/modules" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Substrate Authenticator", link: "/guide/examples" },
          { text: "WebAuthn Authenticator", link: "/guide/webauthn" },
          { text: "Kreivo Signer", link: "/guide/signer" },
        ],
      },
      {
        text: "API Reference",
        items: [
          { text: "Modules", link: "/api/modules" },
          {
            text: "Substrate Authenticator",
            link: "/api/classes/SubstrateKey",
          },
          { text: "WebAuthn Authenticator", link: "/api/classes/WebAuthn" },
          { text: "Kreivo Signer", link: "/api/classes/KreivoPassSigner" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/virto-network/papi-signers" },
    ],
  },
});

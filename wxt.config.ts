import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    permissions: ["storage", "tabs"],
    web_accessible_resources: [
      {
        resources: ["graph.html"],
        matches: [],
      },
    ],
  },
});

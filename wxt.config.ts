import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    name: "ChangeNarrator",
    permissions: ["storage", "tabs"],
    web_accessible_resources: [
      {
        resources: ["graph.html"],
        matches: [],
      },
    ],
    host_permissions: ["http://localhost:8080/*"],
  },
});

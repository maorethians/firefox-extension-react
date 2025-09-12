import { defineConfig } from "wxt";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  vite: () => ({
    plugins: [svgr()],
  }),
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
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
    host_permissions: ["http://localhost:8080/*", "http://127.0.0.1:11434/*"],
  },
});

import { defineConfig } from "wxt";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  vite: () => ({
    plugins: [svgr()],
  }),
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
    host_permissions: ["http://localhost:8080/*", "http://127.0.0.1:11434/*"],
    icons: {
      16: "/icon.png",
      24: "/icon.png",
      48: "/icon.png",
      96: "/icon.png",
      128: "/icon.png",
    },
  },
});

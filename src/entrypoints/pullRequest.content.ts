import { contentMain } from "@/entrypoints/content/main.ts";

export default defineContentScript({
  matches: [
    "*://github.com/*/pull/*/files*", // pull request
  ],
  main: contentMain,
});

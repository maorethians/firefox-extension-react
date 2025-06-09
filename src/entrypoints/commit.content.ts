import { contentMain } from "@/entrypoints/content/main.ts";

export default defineContentScript({
  // login is split and logout is merged
  matches: [
    "*://github.com/*/commit/*", // commit
    "*://github.com/*/pull/*/commits/*", // pull request commit
  ],
  main: contentMain,
});

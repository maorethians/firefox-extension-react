import { contentMain } from "@/entrypoints/content/main.ts";
import "./content/style.css";

export default defineContentScript({
  // login is split and logout is merged
  matches: [
    "*://github.com/*/commit/*", // commit
    "*://github.com/*/pull/*/commits/*", // pull request commit
  ],
  main: contentMain,
});

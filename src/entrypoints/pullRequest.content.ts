import { contentMain } from "@/entrypoints/content/main.ts";
import "./content/style.css";

export default defineContentScript({
  matches: [
    "*://github.com/*/pull/*/files*", // pull request
  ],
  main: contentMain,
});

import { create } from "zustand";
import { Chapter } from "@/services/content/Chapterize.ts";

type SubjectChapterState = {
  chapter: Chapter | null;
  setChapter: (chapterId: Chapter | null) => void;
};

export const useSubjectChapter = create<SubjectChapterState>((set) => ({
  chapter: null,
  setChapter: (chapter: Chapter | null) => {
    set(() => {
      return {
        chapter,
      };
    });
  },
}));

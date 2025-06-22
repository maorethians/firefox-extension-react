import { create } from "zustand";

export const SUBJECT_ID_MESSAGE = "SubjectId";

type SubjectIdState = {
  subjectId: string;
  setSubjectId: (subjectId: string) => void;
};

export const useSubjectId = create<SubjectIdState>((set) => ({
  subjectId: "root",
  setSubjectId: (subjectId: string) => {
    window.postMessage({
      type: SUBJECT_ID_MESSAGE,
    });

    set(() => ({
      subjectId,
    }));
  },
}));

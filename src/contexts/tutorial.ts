import { createContext, useContext } from "react";

interface TutorialContextValue {
  isTutorialOn: boolean;
  toggleTutorial: () => void;
  setTutorialOn: (value: boolean) => void;
}

export const TutorialContext = createContext<TutorialContextValue>({
  isTutorialOn: false,
  toggleTutorial: () => {},
  setTutorialOn: () => {},
});

export function useTutorial() {
  return useContext(TutorialContext);
}

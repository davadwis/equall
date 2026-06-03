import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { TutorialContext } from "./tutorial";

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isTutorialOn, setTutorialOn] = useState(() => {
    return localStorage.getItem("equall_tutorial") === "on";
  });

  useEffect(() => {
    localStorage.setItem("equall_tutorial", isTutorialOn ? "on" : "off");
  }, [isTutorialOn]);

  const toggleTutorial = () => setTutorialOn((prev) => !prev);

  return (
    <TutorialContext.Provider
      value={{ isTutorialOn, toggleTutorial, setTutorialOn }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

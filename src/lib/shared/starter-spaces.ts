export type StarterSpacePreset = {
  id: string;
  title: string;
  subtitle: string;
  generation: number;
  branchKey: string;
  positionClassName: string;
};

export const STARTER_SPACE_PRESETS: StarterSpacePreset[] = [
  {
    id: "grandparent-left",
    title: "Grandparent branch",
    subtitle: "Start with an older generation",
    generation: 0,
    branchKey: "roots",
    positionClassName: "left-[12%] top-[16%]",
  },
  {
    id: "grandparent-right",
    title: "Grandparent branch",
    subtitle: "Add another elder branch beside it",
    generation: 0,
    branchKey: "roots",
    positionClassName: "right-[12%] top-[16%]",
  },
  {
    id: "parent-left",
    title: "Parent or guardian",
    subtitle: "Build the middle generation",
    generation: 1,
    branchKey: "trunk",
    positionClassName: "left-[22%] top-[42%]",
  },
  {
    id: "parent-right",
    title: "Parent or guardian",
    subtitle: "Add a second person on this row",
    generation: 1,
    branchKey: "trunk",
    positionClassName: "right-[22%] top-[42%]",
  },
  {
    id: "self",
    title: "Start with you",
    subtitle: "Anchor the newest generation here",
    generation: 2,
    branchKey: "blossom",
    positionClassName: "left-1/2 top-[69%] -translate-x-1/2",
  },
];

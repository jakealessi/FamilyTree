export type StarterSpacePreset = {
  id: string;
  title: string;
  subtitle: string;
  generation: number;
  branchKey: string;
  classicPositionClassName: string;
  artisticPositionClassName: string;
};

export const STARTER_SPACE_PRESETS: StarterSpacePreset[] = [
  {
    id: "grandparent-left",
    title: "Grandparent branch",
    subtitle: "An older branch near the roots",
    generation: 0,
    branchKey: "roots",
    classicPositionClassName: "left-[14%] top-[14%]",
    artisticPositionClassName: "left-[14%] top-[56%]",
  },
  {
    id: "grandparent-right",
    title: "Grandparent branch",
    subtitle: "Another elder branch to begin the story",
    generation: 0,
    branchKey: "roots",
    classicPositionClassName: "right-[14%] top-[14%]",
    artisticPositionClassName: "right-[14%] top-[56%]",
  },
  {
    id: "parent-left",
    title: "Parent or guardian",
    subtitle: "Build the middle branch of the family",
    generation: 1,
    branchKey: "trunk",
    classicPositionClassName: "left-[24%] top-[40%]",
    artisticPositionClassName: "left-[24%] top-[34%]",
  },
  {
    id: "parent-right",
    title: "Parent or guardian",
    subtitle: "Add another branch beside it",
    generation: 1,
    branchKey: "trunk",
    classicPositionClassName: "right-[24%] top-[40%]",
    artisticPositionClassName: "right-[24%] top-[34%]",
  },
  {
    id: "self",
    title: "Start with you",
    subtitle: "Plant the first leaf in the canopy",
    generation: 2,
    branchKey: "blossom",
    classicPositionClassName: "left-1/2 top-[70%] -translate-x-1/2",
    artisticPositionClassName: "left-1/2 top-[14%] -translate-x-1/2",
  },
];

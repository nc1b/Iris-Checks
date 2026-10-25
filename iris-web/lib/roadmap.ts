export type RoadmapStatus = "Now" | "Next" | "Planned";

export type RoadmapEntry = {
  title: string;
  status: RoadmapStatus;
  heading: string;
  body: string;
  items: string[];
};

export const ROADMAP: RoadmapEntry[] = [
  {
    title: "Fall 2026",
    status: "Now",
    heading: "Research and concept",
    body: "Choosing what to check and learning what the science can and can't support.",
    items: [
      "Picked three checks that share one phone scan: diabetes, glaucoma and cataracts",
      "Reviewed the published studies behind each one",
      "Built this website, the app preview and the Ask Iris assistant",
    ],
  },
  {
    title: "Winter 2026",
    status: "Next",
    heading: "Phone prototype",
    body: "Turning the plan into a scan that runs on a real phone, with images processed on the device.",
    items: [
      "Track both pupils with the front camera",
      "Run the full scan: one flash for both eyes, then one per eye",
      "Measure lens haze in the flash photos",
      "Try it on different phones, rooms and eye colors",
    ],
  },
  {
    title: "Early 2027",
    status: "Planned",
    heading: "Accuracy checks",
    body: "Checking the phone against the tools eye doctors already trust.",
    items: [
      "Compare pupil readings with a clinic pupillometer",
      "Compare left vs right results with the swinging flashlight test",
      "Compare haze scores with an eye doctor's exam",
      "Repeat scans to see how consistent they are",
    ],
  },
  {
    title: "Spring 2027",
    status: "Planned",
    heading: "Pilot study",
    body: "A small study with volunteers, run with permission and adult supervision.",
    items: [
      "People with and without diabetes, matched by age",
      "People with glaucoma or cataracts diagnosed by a doctor",
      "Share what worked and what didn't, openly",
    ],
  },
  {
    title: "Later 2027",
    status: "Planned",
    heading: "Free beta app",
    body: "Only if the pilot shows the checks are useful and reliable.",
    items: [
      "Plain-language results and when to see a doctor",
      "Help finding low-cost care in Jacksonville",
      "Images stay on your phone",
    ],
  },
];

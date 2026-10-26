import { Activity, Droplet, Eye, ScanEye, type LucideIcon } from "lucide-react";

export type Check = {
  id: "diabetes" | "glaucoma" | "cataract";
  name: string;
  icon: LucideIcon;
  signal: string;
  measures: string;
  why: string;
  evidence: string;
  stage: string;
  limits: string;
  nextStep: string;
  image: { src: string; alt: string; caption: string };
};

export const NEI_CREDIT = "Simulation: National Eye Institute, NIH";

export const CHECKS: Check[] = [
  {
    id: "diabetes",
    name: "Diabetic retinopathy",
    icon: Droplet,
    signal: "Pupil light reflex",
    measures: "How big your pupils are at rest, and how far, how fast and how soon they shrink after a flash.",
    why: "Diabetic retinopathy affects the retina in people with diabetes. Iris is exploring this as a research focus.",
    evidence: "Clinic pupillometer studies found differences in people with diabetes. These findings do not establish that Iris can detect diabetic retinopathy.",
    stage: "Research question",
    limits: "A pupil response cannot diagnose or rule out diabetic retinopathy. Iris does not capture a clinical retinal image.",
    nextStep: "An eye exam with retinal assessment",
    image: { src: "/checks/diabetes.jpg", alt: "Two boys holding balls, with dark blotches covering parts of the picture, as someone with diabetic retinopathy might see them", caption: "How diabetic eye damage (retinopathy) can look" },
  },
  {
    id: "glaucoma",
    name: "Glaucoma",
    icon: Eye,
    signal: "Left vs right reaction",
    measures: "How strongly your pupils react when only your left eye is lit, compared with only your right eye.",
    why: "More than half of people with glaucoma don't know they have it. It steals side vision slowly and without pain.",
    evidence: "It's the phone version of a test eye doctors use (the swinging flashlight test). Early studies with phone pupillometers are promising but small.",
    stage: "Known test, new device",
    limits: "It only notices damage that's worse in one eye, and other optic-nerve problems can look the same.",
    nextStep: "An eye exam (eye pressure and optic nerve)",
    image: { src: "/checks/glaucoma.jpg", alt: "Two boys holding balls, clear in the middle but dark around the edges, as someone with glaucoma might see them", caption: "How glaucoma can narrow your side vision" },
  },
  {
    id: "cataract",
    name: "Cataracts",
    icon: ScanEye,
    signal: "Lens cloudiness",
    measures: "Whether the pupil looks hazy or gray in the close-up instead of clear and dark.",
    why: "Cataracts are very common with age and the leading cause of blindness worldwide, and surgery can fix them.",
    evidence: "Several phone + AI studies matched eye doctors about 90% of the time, mostly with controlled lighting. Iris reuses the same close-ups as the other two checks.",
    stage: "Best studied",
    limits: "Works best for advanced cataracts; glare and lighting can look like haze, and early ones may be missed.",
    nextStep: "An eye exam",
    image: { src: "/checks/cataract.jpg", alt: "Two boys holding balls, blurry and hazy all over, as someone with cataracts might see them", caption: "How cataracts can blur and dim your vision" },
  },
];

export const SCAN_STEPS = [
  { title: "Get close", body: "Soft light, screen brightness up. Cover one eye and bring the phone close to the other.", icon: ScanEye },
  { title: "Right eye, one flash", body: "Iris locks onto your eye and records how your pupil reacts to the flash.", icon: Activity },
  { title: "Left eye, one flash", body: "The same for your other eye, so the two can be compared.", icon: Eye },
  { title: "Three results", body: "Each check says “looks typical” or “see a doctor”, in plain words.", icon: Droplet },
] as const;

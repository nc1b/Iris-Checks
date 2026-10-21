import { PUBLISHED_PUPIL_IRIS_RATIO, STUDIES } from "./reference";

/**
 * Facts the Iris assistant answers from. The chat route embeds these with the
 * free NVIDIA Nemotron embedding model and sends the closest matches to the
 * chat model with each question.
 */
export const KNOWLEDGE: string[] = [
  "Iris is a student research project building a 10-second eye check that uses only a phone's camera and screen light. The screen flashes, the camera records how the pupils react (the pupillary light reflex), and the result is compared with published research and explained in plain language.",
  "Status: eye scanning is COMING SOON and is not live yet. The team is testing on real phones and checking measurements against published studies first. There are no accounts or sign-ups yet. The home page shows a concept preview of the planned app with example data.",
  "How the scan will work: 1) hold the phone at eye level in a dim room and line up both eyes; 2) the screen flashes once while the camera films the pupils; 3) Iris measures resting pupil size, how much the pupil shrinks, how fast, and the delay before it reacts; 4) an AI explains the result in plain language and suggests seeing a doctor when the response looks weaker or slower than typical.",
  "Why diabetes: diabetes can slowly damage the autonomic nerves that control the pupil. Studies with special pupillometers found smaller resting pupils and weaker, slower reactions to light in people with diabetes, sometimes before any eye damage is visible. About 40 million Americans have diabetes and about 11 million don't know it (CDC, 2023 data). A doctor can confirm diabetes with an A1c blood test.",
  `Pupil-to-iris ratio in darkness from a 2010 pilot study: healthy ${PUBLISHED_PUPIL_IRIS_RATIO.healthy}, diabetes ${PUBLISHED_PUPIL_IRIS_RATIO.diabetes}, diabetes with nerve damage ${PUBLISHED_PUPIL_IRIS_RATIO.diabetesWithNeuropathy}. ${PUBLISHED_PUPIL_IRIS_RATIO.note}`,
  ...STUDIES.map((s) => `Research: ${s.title} (${s.short}). Device: ${s.device}. Finding: ${s.finding}`),
  "What's new about Iris: to the team's knowledge, no one has published a phone-only version of this pupil test for diabetes. Phone pupil apps exist for concussion, and pupil-diabetes studies used special clinic devices. Iris wants to test whether an ordinary phone, with no attachment, can do it.",
  "Privacy: camera images are planned to be processed on the phone and never uploaded. Chat messages are sent to Hack Club AI and an AI model provider to write replies; the site doesn't store chat content on its server. Chat history, the chat's position and the light/dark choice are saved only in the visitor's browser and can be removed with 'New chat' or 'Clear saved data' in the footer. Full details are on the Privacy Policy page (/privacy).",
  "Iris is not a medical device and does not diagnose anything. It is meant to help people decide when to get checked by a doctor. The Terms of Service are at /terms.",
  "Website: the home page has an interactive 3D eye (press 'Flash the light' to watch a pupil react), How it works, a Coming soon app preview, quotes, Supporters, and About. The Research page (/research) lists the studies. The team is looking for its first sponsors and supporters (clinics, schools and mentors, local organizations). Contact details are coming soon.",
  "The AI assistant can be dragged anywhere on the screen. It can make mistakes and is not medical advice.",
];

export interface FAQItem {
  question: string;
  answer: string;
}

export const IRIS_FAQS: FAQItem[] = [
  {
    question: "What are the three checks Iris is working on?",
    answer:
      "Iris is exploring three checks in one phone scan: pupil responses linked to diabetes, differences between the two eyes that may relate to glaucoma, and lens cloudiness associated with cataracts. All three are in development. The goal is to help people understand when to seek professional care, and each check needs its own testing.",
  },
  {
    question: "How will one scan cover all three?",
    answer:
      "The plan is to line up both eyes in a dim room, record their response to the screen light, then light each eye separately while the other is covered. Iris would use the pupil response for the diabetes research, compare the separate responses for the glaucoma research, and examine captured images for cataract-related cloudiness. We're aiming for a short scan of around 30 seconds; the final steps and timing still need phone testing.",
  },
  {
    question: "Can the pupil check tell me if I have diabetes?",
    answer:
      "A pupil response cannot confirm or rule out diabetes. Studies with specialized devices found average differences between people with and without diabetes, but the groups overlap. Iris is investigating whether a phone can measure useful differences. Doctors diagnose diabetes with blood tests such as A1C or blood glucose.",
  },
  {
    question: "How will the glaucoma check work?",
    answer:
      "Iris plans to compare the pupil responses when each eye is lit separately. A weaker response from one eye can occur with optic-nerve problems, including glaucoma, but it can have other causes too. Early glaucoma, or damage affecting both eyes similarly, may be missed. This check would suggest an eye exam; it won't measure eye pressure or diagnose glaucoma.",
  },
  {
    question: "What will Iris look for with cataracts?",
    answer:
      "A cataract is cloudiness in the eye's lens. Iris plans to examine images captured during the scan for visible haze or changes in the light reflected through the pupil. Glare and lighting can look similar, and early cataracts may not be visible in a phone photo. An eye doctor would need to confirm any finding with an eye exam.",
  },
  {
    question: "Is eye scanning available yet?",
    answer:
      "All three checks are coming soon. The website currently shows a concept preview with example data, not a live health assessment. We still need to test capture quality, repeatability, different phones and eye colors, and compare each check with appropriate clinical assessments. There isn't a confirmed launch date yet.",
  },
  {
    question: "Will I need extra equipment or a special phone?",
    answer:
      "The goal is to use only a phone's camera and screen light, with no lens attachment or separate device. We haven't confirmed which phones and browsers will support all three checks reliably. Dim lighting, a steady phone, and clear pupil images are part of the planned capture process.",
  },
  {
    question: "Will my eye images be uploaded?",
    answer:
      "The plan is to process eye images on your phone without uploading them. The AI explanation may use measurement numbers rather than images. The separate Ask Iris chat sends your messages to an AI provider, and chat history is saved in your browser. The Privacy Policy explains the current website's data handling.",
  },
  {
    question: "What would a typical or flagged result mean?",
    answer:
      "A typical result would only describe what the prototype measured; it wouldn't rule out diabetes, glaucoma, or cataracts. A flagged or unclear result would be a reason to discuss appropriate testing with a healthcare professional. Iris is a research prototype and cannot replace blood tests, regular eye exams, or medical advice.",
  },
  {
    question: "How could Iris help the Jacksonville community?",
    answer:
      "We're exploring whether an accessible phone check could encourage people to seek diabetes testing or an eye exam sooner, especially when cost, transportation, or time make care harder to reach. The plan includes listening to local residents and healthcare workers and helping people find care resources. That community benefit depends on demonstrating that the checks are useful and reliable.",
  },
];

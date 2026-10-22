# Iris research notebook

Updated October 21, 2026.

Working research notes and source leads. Published numbers describe their original studies, not Iris. Earlier directions and unresolved evidence are labelled.

# The three-check research plan

The science, proposed capture method, limits, and pilot plan for diabetes, glaucoma, and cataracts.

> Current research scope: diabetes, glaucoma, and cataracts. All three are in development. Study results below describe other systems; they are not clinical accuracy results for Iris. A typical result cannot rule out disease.

## The idea in one sentence
The proposed phone capture flow (camera and screen light, without an attachment) is intended to support **three research checks**:
1. **Diabetes**, from how the pupil reacts to light.
2. **Glaucoma**, from how evenly the two eyes react when each is lit on its own.
3. **Cataract**, from how cloudy the pupil looks in a flash photo.

Each result can only say **"looks typical"** or **"see a doctor"**, never "you have X".

## Quick comparison

| | Diabetes | Glaucoma | Cataract |
|---|---|---|---|
| **What's wrong** | High blood sugar slowly damages nerves, including the ones that control the pupil | Damage to the optic nerve, often with high eye pressure; side vision is lost slowly | The eye's lens turns cloudy |
| **Why it matters** | ~40 million Americans have diabetes; ~11 million don't know it (CDC, 2023 data) | More than half of people with glaucoma don't know they have it | Very common with age (about half of people by their late 70s); the leading cause of blindness worldwide, but fixable with surgery |
| **Does the person notice?** | Often not for years | Not until a lot of vision is gone ("silent thief of sight") | Usually yes (blur, glare), but slowly |
| **What the phone measures** | Pupil reaction: resting size, how much and how fast it shrinks, the delay | Left vs right: pupil reaction when only one eye is lit (cover the other) | Flash photo of the pupil: gray/white haze instead of a clear dark pupil and red glow |
| **Extra steps in the scan** | 1 flash (both eyes) | 2 short flashes (one per eye) | None; it reuses the flash frames |
| **How proven on phones** | **Not proven.** Only clinic devices so far | **Early.** A few small phone studies | **Best proven.** Several phone + AI studies at about 90% accuracy |
| **How new it is** | **New** (our original part) | Partly new (phone version of an old doctor's test) | Not new (many apps and papers) |
| **Next step if flagged** | Blood test (A1C) | Eye exam: eye pressure + optic nerve | Eye exam |

## 1. Diabetes (the original part)

**How it works:** diabetes can damage the autonomic nerves that control the pupil. Studies with clinic pupillometers found smaller resting pupils and weaker, slower reactions to light in people with diabetes, sometimes before any damage in the retina.

**What the evidence really says (be honest about this):**
- The studies found **average differences between groups**, and the groups **overlap**. A pupil test can't say yes or no for one person, and it will miss some people who have diabetes.
- Example: Tan et al. 2022, *Clin Exp Ophthalmol* ([PubMed 35616273](https://pubmed.ncbi.nlm.nih.gov/35616273/)). It tested 82 people with diabetes and 93 controls, around age 60, using a custom handheld blue/red-light pupillometer. Reactions were weaker in diabetes, even without retinopathy. A "detected about 76%" number was quoted to us, but it **isn't in the abstract**, so check the full paper before using it.
- **The collected notes do not establish how well the Iris phone method performs.** That is our experiment.
- Only blood tests (A1C, blood glucose) diagnose diabetes ([NIDDK](https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis)). Looking at the back of the eye only finds diabetic damage once it has happened ([MedlinePlus](https://medlineplus.gov/diabeticeyeproblems.html)).

**How to say it:** "Iris tests whether a phone can measure a pupil change that research links to diabetes, as a nudge to get a blood test."

More detail: [Top Idea - Diabetes Pupil Check](/research#note-diabetes-pupil).

## 2. Glaucoma

**How it works:** glaucoma damages the optic nerve, so that eye sends a weaker "light" signal to the brain. If one eye is more damaged, the pupils shrink less when that eye is lit than when the other eye is lit. Doctors call this a **relative afferent pupillary defect (RAPD)** and find it with the **swinging flashlight test**.

**Phone version:** after the main flash, one quick flash with the left eye uncovered (right eye covered by a hand), then one with the right eye uncovered. Compare how much the pupils shrink each time.
- **Even:** the weaker eye reacts at 80% or more of the stronger one.
- **Borderline:** 65–80%.
- **See an eye doctor:** below 65%.
- These are team-set experimental placeholders, not clinical cutoffs.

**Important correction:** this does *not* come free from the main scan. When one flash lights both eyes, each pupil reacts to the light from *both* eyes together, so a one-sided nerve problem doesn't make the pupils uneven. Each eye has to be lit on its own.

**Evidence:**
- **AI phone pupillometer and glaucoma** ([Frontiers in Neurology 2024](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2024.1426205/full); [PMC copy](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11754064/)). The study first compared the phone with a clinic pupillometer (NPi-200) in 20 healthy people, then tested 24 people with open-angle glaucoma and 22 controls. Constriction amplitude and relative pupil size change differed significantly between the groups; light-corrected measures did not. A larger follow-up with 387 people was reported.
- **Portable RAPD detector:** a trial of the "O-Glass" device against the swinging flashlight test in 44 people with RAPD ([ClinicalTrials.gov NCT02772666](https://clinicaltrials.gov/study/NCT02772666)). No published results were found.
- **US patent** on screening for glaucoma and RAPD at home with visible light and pupil latency ([USPTO 11564566](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11564566)). This shows the idea exists; it isn't a validation study.
- **Another approach from the team's research:** eye-movement tracking. People with glaucoma show different, delayed "saccades" (quick eye jumps) when following a moving target ([Brain Communications](https://academic.oup.com/braincomms/article/8/2/fcag102/8530624); [Review of Optometry](https://www.reviewofoptometry.com/article/eye-movement-analysis-may-serve-as-biomarker-for-glaucoma-diagnosis)). A possible future add-on with a moving dot on the screen.
- **Background:** glaucoma as the "silent thief of sight" ([WashU Ophthalmology](https://ophthalmology.wustl.edu/glaucoma-awareness-detecting-and-managing-the-silent-thief-of-sight/); [UNT Health](https://www.unthealth.edu/newsroom/story/glaucoma-the-silent-thief-of-sight.html)).
- **How many people don't know:** the Baltimore Eye Survey found 56% of people with glaucoma were undiagnosed; a 2025 European study found 56.4%, and over 80% under age 55 ([IAPB Vision Atlas](https://visionatlas.iapb.org/news/glaucoma-burden-in-europe-projected-to-exceed-13-million-by-2050/); [HealthDay](https://www.healthday.com/healthpro-news/eye-care/physician-s-briefing-glaucoma-2665205622.html); [Healio](https://www.healio.com/news/ophthalmology/20160720/undiagnosed-overdiagnosed-glaucoma-cases-may-have-major-repercussions)).

**Limits:**
- It only catches glaucoma that's **worse in one eye**. Glaucoma that affects both eyes about equally may look "even".
- A hand doesn't block all light.
- Other problems (an optic-nerve inflammation, an old injury) can also cause RAPD, so the message is "see an eye doctor", not "glaucoma".

## 3. Cataract

**How it works:** a healthy lens is clear, so a camera flash goes straight through and the pupil looks black, with a red glow (the "red-eye" effect). A cataract scatters the light, so the pupil looks **gray, white or yellowish**, and the red glow gets dim or patchy.

**Phone version:** reuse the flash frames from the main scan. Inside each pupil, measure:
- **Haze:** how bright and gray the pupil is compared with a clear pupil.
- **Patchiness:** uneven bright spots inside the pupil.
- **Red-glow strength:** how much red comes back.
- **Left vs right:** the same measures compared between the eyes.

Later, a small AI model trained on public cataract photo sets could score the image.

**Evidence (phone + AI studies):**
- **Prospective clinical trial at AIIMS Bibinagar, India:** an AI app scored phone photos taken under a set method and was compared with doctors' slit-lamp exams. With 990 eye images from 495 patients, it got 90.0% accuracy, 89.5% sensitivity and 89.7% specificity ([Cureus](https://assets.cureus.com/uploads/original_article/pdf/290461/20241014-647668-t67j8q.pdf)). This is the strongest result found.
- **ESCRS 2025 conference abstract:** a Samsung Galaxy S23 under standard lighting got 93.2% accuracy, 91.2% sensitivity and 94.5% specificity. It was a small sample and not peer-reviewed ([ESCRS](https://www.escrs.org/abstracts-2025-43rd-escrs-congress-copenhagen/fp2908-the-role-of-deep-learning-algorithms-in-cataract-detection-and-surgical-planning-just-through-smartphone-eye-images)).
- **medRxiv 2025 preprint:** a low-cost phone lighting add-on plus AI, tested on 210 patients at Aravind Eye Hospital. Not peer-reviewed ([medRxiv](https://www.medrxiv.org/content/10.1101/2025.11.14.25340278.full.pdf)).
- **Smaller studies:** a rural India poster got 80% accuracy with 400 images ([Asia Tele-Ophthalmology 2026](https://2026.asiateleophth.org/e-poster-detail?id=12)). Others: [IET Cyber-Physical Systems 2024](https://doaj.org/article/95d9c926ba474f3c85732dc3b062dd06), [EUDL](https://eudl.eu/doi/10.4108/eetpht.10.5525), [Telkom University capstone](https://repositori.telkomuniversity.ac.id/pustaka/files/237943/abstract/sistem-deteksi-katarak-menggunakan-deep-learning-capstone.pdf).
- **How common it is:** about 20.5 million Americans over 40 (17.2%) have a cataract in at least one eye, and women are about 40% more likely than men. One source citing NEI data gives about 25% at ages 65–69, 37% at 70–74, 50% at 75–79 and 68% at 80+ ([ScienceInsights](https://scienceinsights.org/what-percentage-of-seniors-get-cataracts/); [AudiologyOnline](https://www.audiologyonline.com/releases/prevalence-cataracts-expected-to-increase-5471)). **Check these numbers on the NEI site before using them.**

**Limits:**
- It works best for **advanced** cataracts. Early ones and cataracts at the back of the lens are hard to see in a photo.
- Most studies used **controlled lighting**, not a flash at home. The flash setup needs its own testing.
- A big pupil-flash reflection or a light iris can fool a simple brightness measure.
- **Not new:** many apps already do this. Our angle is that it comes free with the same scan.

## Related: the same flash and white pupils in children
**Retinoblastoma** (an eye cancer in young kids) shows up as a **white pupil glow (leukocoria)** in flash photos instead of the red reflex. The CRADLE / "White Eye Detector" app scans family photos for it ([WUNC 2019](https://www.wunc.org/2019-10-07/an-app-that-can-catch-early-signs-of-eye-disease-in-a-flash)). The cataract measure is close to this, but Iris targets adults. It would only go on a "future" slide.

## Other conditions the team looked at (not chosen)
- **Diabetic retinopathy and macular degeneration (AMD):** these need a view of the back of the eye (the retina), which a bare phone camera can't get. They need a **lens adapter** (e.g. D-Eye, Peek Vision) plus AI that looks for leaking vessels or fatty deposits (drusen) ([Hillcrest Vision](https://www.hillcrestvision.com/8-eye-conditions-retinal-imaging-can-diagnose-and-monitor/)). This breaks the "no extra hardware" idea.
- **Retinal detachment:** the phone can't detect it with its camera. An on-screen vision test (a digital Amsler grid) could show a missing patch of vision, but detachment is an **emergency**: sudden flashes, floaters or a "dark curtain" mean go to urgent care now, not run an app.

## How one scan would run (about 30 seconds)
1. **Line up:** dim room, phone at eye level, both eyes in view.
2. **Main flash (both eyes):** gives the diabetes reflex measures, the pupil size difference and the cataract flash frames.
3. **Left eye flash** (cover the right eye), wait about 5 seconds.
4. **Right eye flash** (cover the left eye): gives the glaucoma reflex balance.
5. **Three results**, each "looks typical", "borderline" or "see a doctor", explained by the AI in plain language.

## Pilot study plan
- **Diabetes:** the main experiment. At least 10 people with diabetes and 10 without, matched by age. Compare the pupil measures between groups.
- **Glaucoma:** no new diagnosis needed. Check that the phone's left/right balance **matches** a doctor's swinging flashlight result, or test people who already know they have glaucoma in one eye.
- **Cataract:** check that the haze score **matches** what an eye doctor sees, or compare people before and after cataract surgery.
- **Everyone:** include **older adults** (all three conditions are more common with age), test 2–3 phones, and repeat each scan twice to see how consistent it is.

## All sources
- Diabetes: [PubMed 35616273 (Tan 2022)](https://pubmed.ncbi.nlm.nih.gov/35616273/) · [NIDDK tests and diagnosis](https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis) · [MedlinePlus diabetic eye problems](https://medlineplus.gov/diabeticeyeproblems.html)
- Glaucoma: [Frontiers in Neurology 2024](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2024.1426205/full) · [PMC11754064](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11754064/) · [NCT02772666](https://clinicaltrials.gov/study/NCT02772666) · [USPTO 11564566](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11564566) · [Brain Communications](https://academic.oup.com/braincomms/article/8/2/fcag102/8530624) · [Review of Optometry](https://www.reviewofoptometry.com/article/eye-movement-analysis-may-serve-as-biomarker-for-glaucoma-diagnosis) · [WashU](https://ophthalmology.wustl.edu/glaucoma-awareness-detecting-and-managing-the-silent-thief-of-sight/) · [UNT Health](https://www.unthealth.edu/newsroom/story/glaucoma-the-silent-thief-of-sight.html) · [IAPB Vision Atlas](https://visionatlas.iapb.org/news/glaucoma-burden-in-europe-projected-to-exceed-13-million-by-2050/) · [HealthDay](https://www.healthday.com/healthpro-news/eye-care/physician-s-briefing-glaucoma-2665205622.html) · [Healio](https://www.healio.com/news/ophthalmology/20160720/undiagnosed-overdiagnosed-glaucoma-cases-may-have-major-repercussions)
- Cataract: [Cureus (AIIMS trial)](https://assets.cureus.com/uploads/original_article/pdf/290461/20241014-647668-t67j8q.pdf) · [ESCRS 2025](https://www.escrs.org/abstracts-2025-43rd-escrs-congress-copenhagen/fp2908-the-role-of-deep-learning-algorithms-in-cataract-detection-and-surgical-planning-just-through-smartphone-eye-images) · [medRxiv 2025](https://www.medrxiv.org/content/10.1101/2025.11.14.25340278.full.pdf) · [Asia Tele-Ophthalmology poster](https://2026.asiateleophth.org/e-poster-detail?id=12) · [IET 2024](https://doaj.org/article/95d9c926ba474f3c85732dc3b062dd06) · [ScienceInsights](https://scienceinsights.org/what-percentage-of-seniors-get-cataracts/) · [AudiologyOnline](https://www.audiologyonline.com/releases/prevalence-cataracts-expected-to-increase-5471)
- Other conditions: [WUNC (retinoblastoma app)](https://www.wunc.org/2019-10-07/an-app-that-can-catch-early-signs-of-eye-disease-in-a-flash) · [Hillcrest Vision (retinal imaging)](https://www.hillcrestvision.com/8-eye-conditions-retinal-imaging-can-diagnose-and-monitor/)

---

# Diabetes and the pupil light reflex

The diabetes pupil-response hypothesis, phone measurement challenges, study design, and source papers.

> Research question: can an ordinary phone measure pupil-response differences that published studies associate with diabetes? Blood tests establish diabetes status; a phone pupil result cannot confirm or rule it out.

## How it would work
1. Sit in a dim room. The app guides you to hold the phone at the right distance.
2. **Flash fires.** The camera records your pupil for about 5 seconds.
3. AI (MediaPipe + a pupil segmentation model) tracks pupil size frame by frame and plots the **light-reflex curve**: starting size, how far it shrinks, **how fast**, and how quickly it recovers.
4. It compares the curve to healthy ranges for your age and to **your own past checks**.
5. Result: "Your pupil reaction is slower than expected for your age. This can be an early sign of nerve changes linked to diabetes. **Ask your doctor for an A1c test.**" Plus a link to free testing.
6. On-device only, so no eye videos leave the phone.

### Second result: left vs right eye (added 2026-10-21)
- The same scan also compares the two pupils' **size**.
- One extra quick flash per eye, with the other eye covered, compares **how each eye senses light**. This is the phone version of the doctor's "swinging flashlight test".
- An uneven result can point to optic-nerve problems such as **glaucoma**, so Iris says "see an eye doctor".
- Diabetes stays the main claim. See [Multi-Condition Check - Decision](/research#note-multiple-conditions).

## What we'd test (a real science experiment)
- Volunteers **with diabetes** (family, neighbors, a community health event, with consent) vs. **without diabetes**, matched by age.
- **Question:** does the phone pupil curve differ between the groups the way clinic studies say it should?
- Also test **repeatability** (same person, same day), **different phones**, and **eye color**.
- Even a small, honest pilot (e.g., 15 vs 15 people) is a strong student result, because **nobody has published this on a phone yet**.

## Risks (and how we answer them)
| Risk | Answer |
|---|---|
| Phone flash is weaker than a clinic light, so **constriction speed is less accurate** (MindMirror 2024 found exactly this) | Use a longer flash or screen-brightness stimulus. Focus on measures that phones capture well (size change, recovery). Report it honestly |
| **Dark brown eyes** make the pupil hard to see | Dim room + flash helps. Test across eye colors. Cite UCSD's far-red work as future hardware |
| One published phone pupillometer **failed** (needed many retries) | Build a strong guided capture and quality check. Learn from their failure analysis |
| Many things affect pupils (age, light, caffeine, medicines) | Age-matched comparison, fixed dim-light protocol, a short questionnaire |
| It's not a diagnosis | Wording is always "get an A1c test", never "you have diabetes" |

## Other original ideas checked (for comparison)
| Idea | Popular disease? | Done before? | Verdict |
|---|---|---|---|
| **High blood pressure from eye-white blood vessels** (phone photo) |  about half of US adults | ❌ **No prior work found.** Researchers use eye-white vessel *videos* for blood counts, not blood pressure | 🌙 Moonshot: very original but **weak science backing**. Could be a "Phase 2" |
| **High cholesterol from the grey ring around the iris** (arcus) |  | Needs verification: **Done:** Gdańsk 2022 CNN app, 88% accuracy, about 4,000 images | Not original enough |
| **Blood sugar from external eye photo** |  | Needs verification: Done by Google (AUC about 0.7) | Not original |
| **Concussion pupil check** | Medium | Needs verification: Done (PupilScreen, JMIR 2024) | Not original |

## Sources
- Diabetes stats: [CDC National Diabetes Statistics Report](https://www.cdc.gov/diabetes/data/statistics-report/index.html)
- Pupil + diabetes (clinic devices): [2010 pilot, dynamic pupillometry for autonomic neuropathy](https://pubmed.ncbi.nlm.nih.gov/20565794/) · [Dynamic pupillometry in type 2 diabetes (Dove Press)](https://www.dovepress.com/dynamic-pupillometry-in-type-2-diabetes-pupillary-autonomic-dysfunctio-peer-reviewed-fulltext-article-OPTH) · [Pupillography refines diagnosis of diabetic autonomic neuropathy](https://www.sciencedirect.com/science/article/abs/pii/S0022510X0400111X) · [2024 pupillometry device for T2D](https://www.sciencedirect.com/science/article/pii/S2213398424003397) · [Frontiers Neurology 2026](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2026.1785905/full)
- Phone pupillometry: [iPhone pupillometry r=0.91 (PubMed)](https://pubmed.ncbi.nlm.nih.gov/30234829/) · [MindMirror vs NPi 200 (medRxiv 2024)](https://www.medrxiv.org/content/10.1101/2024.10.18.24315266v1.full) · [SmartPLR 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12613743/) · [PuRe ambient-light score](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11037402/) · [Failed prototype analysis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11875590/) · [PupilScreen mTBI (JMIR 2024)](https://neuro.jmir.org/2024/1/e58398) · [Low-resource review 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12391761) · [UCSD far-red](https://www.nature.com/articles/s41598-023-40796-0)
- Patent mentioning diabetic neuropathy in a phone PLR filing (not validated): [US 12,551,097](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12551097)
- Comparisons: [Gdańsk corneal arcus CNN for FH](https://pub.pg.edu.pl/en/publication/156046/using-convolutional-neural-networks-for-corneal-arcus-detection-towards-familial-hypercholesterolemi) · [Conjunctiva video blood count (npj 2026)](https://www.nature.com/articles/s41746-026-02598-2)

---

# AI eye scanning: the overview

How retina AI, external-eye photography, and phone pupil measurements fit together.

**Question:** Can AI scan the eye and tell if you have a disease? How did this field happen, and what's already been built?

**Short answer:** Yes. It started with AI reading **retina photos** for diabetic eye disease (2016), which became the **first FDA-cleared autonomous AI** (2018). Researchers then found the eye reveals **heart, kidney, blood, liver, thyroid and brain** health. The newest work does it with **ordinary phone photos and videos**, which is exactly Iris's space. Phone-only results are real but less accurate than clinic cameras, mainly because of lighting, phone differences and skin and eye color bias.

---

# The full AI eye studies catalog

Retinal disease, whole-body biomarkers, external-eye images, pupil videos, and vision-screening studies.

> This is the full working catalog recorded in the research notes. Numerical results describe individual source studies, using different cameras, populations, and protocols. Items marked “Needs verification” remain research leads.

## A. Retina AI → eye diseases
| Study | Year | Detects | Data | Result | 📱 |
|---|---|---|---|---|---|
| Gulshan et al., *JAMA*  | 2016 | Diabetic retinopathy (DR) | Retina photos (EyePACS + India) | Specialist-level grading | ❌ |
| Ting et al., *JAMA*  | 2017 | DR, glaucoma, AMD | Multiethnic retina photos | Validated across ethnic groups | ❌ |
| Abramoff et al., *npj Digit Med* (IDx-DR)  | 2018 | More-than-mild DR | 900 patients, 10 US primary-care sites | 87.2% sensitivity / 90.7% specificity → FDA cleared | ❌ |
| De Fauw et al., *Nature Medicine*  | 2018 | Referral for 50+ retinal conditions | 14,884 OCT scans, tested on 997 | About 94.5% correct referral, 0 urgent cases missed | ❌ |
| EyeArt with Remidio *Fundus on Phone*  | 2018 | DR | Smartphone + optics adapter | 95.8% sensitivity (any DR), 99.1% (sight-threatening), about 80% specificity | 📱+adapter |
| Eyeagnosis (student)  | 2017 | DR | Phone + 3D-printed lens | Prototype, no clinical trial | 📱+adapter |

## B. Retina AI → body diseases ("oculomics")
| Study | Year | Detects | Data | Result |
|---|---|---|---|---|
| Poplin et al., *Nat Biomed Eng*  | 2018 | Age, sex, BP, smoking, heart events | 284,335 patients (UK Biobank + EyePACS) | Sex AUC 0.97, age ±3.26 yr, BP ±11.2 mmHg, smoking AUC 0.71, heart events AUC 0.70 |
| Mitani et al., *Nat Biomed Eng*  | 2019/20 | **Anemia** | UK Biobank, 11,388 validation patients | Hemoglobin MAE 0.63 g/dL, AUC 0.88 |
| Zhang et al., *Nat Biomed Eng*  | 2021 | **Chronic kidney disease, type 2 diabetes** | 115,344 photos, 57,672 patients | AUC 0.85–0.93 |
| Cheung et al., *Lancet Digit Health*  | 2022 | **Alzheimer's dementia** | 11 studies, multi-country | AUC 0.93 internal, 0.73–0.91 external |
| RETFound, Zhou et al., *Nature*  | 2023 | Eye diseases plus **heart failure, heart attack**, Parkinson's (press) | 1.6M unlabelled images | Beat other models with about 10% of the labels. Open-source |
| Meng et al. (DeepDKD), *Lancet Digit Health*  | 2025 | Diabetic kidney disease | Retina photos | Screens DKD vs other kidney disease |
| Oculomics review  | 2026 | Summary | — | Heart events AUC 0.70–0.89, CKD 0.85–0.94, Alzheimer's 0.73–0.91 external, Parkinson's 0.77–0.92 |

## C. Front-of-eye photos → eye and body diseases (📱 phone-only, closest to Iris)
| Study | Year | Detects | Data | Result |
|---|---|---|---|---|
| **BiliScreen** (UW)  | 2017 | **Jaundice** (bilirubin) | 70 people, phone + box or glasses | 89.7% sensitivity / 96.8% specificity, r=0.89 |
| Neonatal sclera jaundice, *PLOS ONE*  | 2019 | Newborn jaundice | 51 infants, phone, ambient light subtracted | Feasible without a box |
| Cirrhosis sclera tool, *J Gastro Hepatol*  | 2023 | Jaundice in liver disease | Phone, U-Net sclera segmentation | Segmentation F1 0.88 |
| **CRADLE / White Eye Detector** (Baylor), *Science Advances*  | 2019 | **White pupil** (retinoblastoma, other disorders) | About 53k family photos of 40 kids | About 80% detected, about 1.3 yr before diagnosis |
| **Purdue / HemaChrome** (Kim), *Optica*  | 2020 | **Hemoglobin / anemia** from the inner eyelid | 153 patients (Kenya) | Comparable to a blood test (per the authors). Won an NIH challenge phase |
| Brown (Suner), *PLOS ONE* Needs verification: | — | Anemia from the inner eyelid | 142 patients | Accuracy and skin-tone results **not verified** |
| Eyes-defy-anemia dataset  | — | Anemia | 218 phone + macro-lens images with lab Hb | Public dataset (see [Datasets for Iris](/research#note-datasets)) |
| Vision transformer on conjunctiva + sclera, *Sci Reports*  | 2025 | Anemia | Conjunctiva and sclera | Explainable attention maps |
| **Babenko et al. (Google)**, *Nat Biomed Eng*  | 2022 | Diabetic eye disease, **poor blood sugar (HbA1c)** | External eye photos, about 145k patients | About 0.70 AUC for HbA1c. **Not phone-validated** |
| Google external eye → systemic markers, *Lancet Digit Health*  | 2023 | Kidney, liver, blood count, thyroid markers | 123k images, 38k patients | Moderate. Not phone-validated |
| Thyroid eye disease phone AI, *Thyroid*  | 2024 | Active thyroid eye disease | 100 patients, **6 phone models** | Average 71.4% sensitivity / 81.6% specificity (best phones 74.5% / 84.8%) |
| Glandy CAS (Korea), *BMJ Open Ophth*  | 2025 | Active thyroid eye disease | 756 facial photos | 87.9% sensitivity / 95.8% specificity (not confirmed as phone photos) |
| **IDS / Eye-YOLO**, *BMC Medicine*  | 2026 | Multiple front-of-eye diseases | 24,671 images (6,818 phone) | Real-world validation via a WeChat app. Needs verification: May be the "8 conditions / 310 users" study from our brainstorm, not confirmed |
| CaT ocular surface tumors  | 2026 | Eye-surface cancers | 614 at-home users | Phone AUC 0.905 vs slit lamp 0.945 |
| Smartphone slit-lamp cataract  | 2020/26 | Cataract severity | Phone + slit attachment | 74–81% accuracy |
| **EyeSpy** (India, student)  | 2026 | 7 eye diseases incl. DR | Offline Android | 90.1% vs ophthalmologists, 1,650+ screened |

## D. Pupil video → brain and nerve health (📱)
| Study | Year | Detects | Data | Result |
|---|---|---|---|---|
| **PupilScreen** (UW)  | 2017 | Traumatic brain injury / concussion | Phone flash + CNN + box | Median error 0.30 mm. Clinicians near-perfect in a 6-patient pilot |
| Follow-up, *Frontiers Neurosci*  | 2022 | TBI | 42 healthy + 6 TBI | 93% accuracy, 94% sensitivity, 92% specificity (clinician raters) |
| UCSD at-home pupillometry (CHI)  | 2022 | Cognitive load / MCI research | iPhone **infrared** Face ID camera | Feasible at home for older adults |
| UCSD far-red, *Sci Reports*  | 2023 | Fair pupillometry across eye colors | RGB + far-red filter | Works on dark irises |
| Neurodegenerative pilot (*Neurology* abstract)  | 2023 | Alzheimer's / MCI and others | 7 patients vs 141 controls | Smaller pupils, less change in patients |
| PuRe score, medRxiv  | 2023/24 | Pupil reactivity | ML corrects for **ambient light** | Light-corrected scoring |
| **SmartPLR**, *BMC Ophthalmology*  | 2025 | Pupil reflex | 336 exams, 158 people, **no infrared or extra device** | High agreement with the NPi-300 clinical device |
| Frontiers 2024 iPhone + flash study Needs verification: | 2024 | Pupil reflex | — | From our brainstorm, **not found in search**. Verify |

## E. Vision-function and screening apps
| Project | Result |
|---|---|
| **Peek Acuity** (Kenya), *Lancet Global Health* 2018  | A school phone screening trial **more than doubled follow-up attendance**. Also found more kids with impairment (5% vs 3.6%), with more false referrals |
| **GoCheck Kids**  | Phone photoscreener for amblyopia risk factors (ages about 1–6). 358-child trial registered. For doctors only |

---

# How AI reads the eye

Image types, the measurement pipeline, sensitivity, specificity, AUC, and sources of bias.

## Why the eye can reveal disease in the rest of the body
- The **retina** (back of the eye) is neural tissue and allows doctors to inspect small blood vessels and nerve tissue using eye-imaging equipment. That makes the eye a "window" to the heart, brain and kidneys. Researchers call this **"oculomics"**.
- The **front of the eye** shows blood and chemistry:
  - The **white of the eye (sclera)** turns yellow when **bilirubin** builds up. That's jaundice, from liver, gallbladder or pancreas problems.
  - The **inner eyelid (conjunctiva)** is full of tiny blood vessels. It looks **pale when hemoglobin is low**, which is anemia. Skin color doesn't cover it.
  - **Eye shape and eyelids** change with thyroid eye disease (bulging, swelling) and nerve problems (droopy lid).
  - **Lens and pupil** show cataract (cloudy lens) and **leukocoria**, a white pupil in photos that can be a sign of retinoblastoma.
- The **pupil** is controlled by the nervous system. **How fast and how far it shrinks under a flash** (the pupillary light reflex) changes with concussion and brain injury, some neurodegenerative diseases, drugs and opioids, and diabetes-related nerve damage.

## The three kinds of eye images AI uses
| Image | Camera needed | What it can show | Phone-only? |
|---|---|---|---|
| **Retina photo (fundus)** | Special fundus camera, or a phone with a lens adapter | Diabetic retinopathy, glaucoma, macular degeneration, **heart risk, kidney disease, anemia, Alzheimer's signals** | ❌ needs an adapter |
| **OCT scan** | Clinic machine ($$$) | 3D layers of the retina, 50+ retinal conditions | ❌ |
| **External / front-of-eye photo** | **Any phone camera** | Jaundice, anemia, cataract, red eye, crossed eyes, droopy lid, thyroid signs, white pupil; in research, also blood sugar, kidney and liver markers |  |
| **Pupil video under flash** | Phone camera plus flash (infrared helps) | Pupillary light reflex (concussion, neuro disease) | , but dark irises are harder |

 **Iris explores the bottom two image types.** That's what makes it accessible, and also why it's harder to get high accuracy.

## How the AI actually works (step by step)
1. **Collect labelled data.** Thousands of eye images, each paired with a **confirmed answer** from a doctor or a lab test (for example, a hemoglobin blood test or a doctor's diabetic retinopathy grade). The label is the hardest part to get.
2. **Check quality.** A first model rejects blurry, dark or glare-filled images. Real deployments failed when this step was weak (see the Google Thailand study in [AI Eye History Timeline](/research#note-timeline)).
3. **Find the eye.** A detector or segmentation model outlines the sclera, iris, pupil or eyelid, so only the relevant pixels are analysed. Tools: MediaPipe Iris, U-Net, YOLO.
4. **Classify or measure.** A **convolutional neural network (CNN)** such as EfficientNet, MobileNet or ResNet, or a newer **vision transformer**, outputs either a **class** (disease / no disease) or a **number** (estimated hemoglobin in g/dL, bilirubin level, pupil diameter in mm).
   - **Transfer learning:** start from a model already trained on millions of everyday photos, then fine-tune it on eye images. This is how small teams get good results with little data.
   - **Foundation models:** RETFound (2023) first learned from **1.6 million unlabelled** retina images (self-supervised), then needed only about **10% of the usual labels** for each disease.
5. **Explain.** **Heatmaps** (Grad-CAM, attention maps) show *which part* of the eye drove the decision, for example the optic disc or blood vessels. This builds doctor trust.
6. **Decide on a threshold and refer.** Choose a cutoff that favours catching disease (high sensitivity), and send positives to a doctor.

## How to read the accuracy numbers
- **Sensitivity:** of the people who **have** the disease, what % did the AI catch? *Most important for screening.*
- **Specificity:** of the **healthy** people, what % did the AI correctly clear? Low specificity means lots of false alarms.
- **AUC (AUROC):** 0.5 = coin flip, 0.7 = moderate, 0.8 = good, 0.9+ = excellent. It measures overall ranking ability.
- **MAE (mean absolute error):** for numbers, e.g., "hemoglobin within 0.63 g/dL".
- **Quadratic weighted kappa:** agreement on graded severity (used in Kaggle diabetic retinopathy contests).
- Needs verification: **Lab numbers ≠ real-world numbers.** Always ask whether the model was tested on **new hospitals or phones** (external validation) and on **real users**.

## Known pitfalls
- **Lighting and color.** Phone color shifts with room light, which is why BiliScreen needed a box. Color reference cards or white paper help.
- **Different phones.** A thyroid AI dropped to about 71% sensitivity when tested across 6 phone models.
- **Bias.** Open eye datasets come mostly from Asia, North America and Europe. Darker retinas and dark irises are under-represented. One experiment showed DR accuracy of 73% on lighter skin vs 60.5% on darker skin when data was missing.
- **Shortcut learning.** The model may learn the camera or hospital instead of the disease. Test on outside data.
- **Clinical evaluation.** A research prototype needs appropriate validation before it can support care decisions.

---

# A decade of eye AI: 2015–2026

The research timeline from EyePACS and early retina models to smartphone screening and pupil tracking.

**The short story:** Before about 2015, computers measured eye features with hand-written rules. Then **deep learning** plus **large public datasets** (Kaggle, EyePACS, UK Biobank) made AI match eye specialists on retina photos (2016). That led to the **first FDA-cleared autonomous AI of any kind** (2018). Researchers then discovered the retina also reveals **heart, kidney, blood and brain** health ("oculomics"). The newest wave moves the whole thing **onto smartphones**, using ordinary photos of the **front of the eye** and **pupil videos**.

| Year | What happened | Why it mattered |
|---|---|---|
| **2016** | **Gulshan et al., JAMA** (Google): deep learning grades diabetic retinopathy from retina photos at about specialist level | The landmark "AI equals eye doctor" paper |
| **2017** | **Ting et al., JAMA:** validated across multiethnic populations (DR, glaucoma, AMD) | Showed it works beyond one population |
| 2017 | **BiliScreen** (UW): jaundice from **phone selfies of the sclera**, 89.7% sensitivity / 96.8% specificity, n=70, with a 3D-printed box | The first strong "phone photo of the eye → body disease" result |
| 2017 | **PupilScreen** (UW): phone flash plus CNN tracks the pupil reflex for brain injury, median error 0.30 mm | The first smartphone AI pupillometry |
| 2017 | **Eyeagnosis**: a 16-year-old (Kavya Kopparapu) builds a phone + 3D-printed lens + AI diabetic retinopathy screener | **A student precedent** |
| **2018** | **IDx-DR cleared by the FDA (April):** 900 patients, 10 primary-care sites, 87.2% sensitivity / 90.7% specificity | **First FDA-cleared autonomous AI diagnostic.** No doctor needed to read the result |
| 2018 | **De Fauw et al., Nature Medicine** (DeepMind + Moorfields): OCT scans → correct referral about 94.5% of the time, no urgent cases missed | Matched top retina specialists on 3D scans |
| 2018 | **Poplin et al., Nature Biomed Eng** (Google): retina photo predicts **age** (±3.26 yr), **sex** (AUC 0.97), **blood pressure**, smoking, **heart events** (AUC 0.70) | **The birth of oculomics.** The eye reveals body-wide health |
| 2018 | **Peek** trial (Kenya, Lancet Global Health): a phone vision test in schools **more than doubled** follow-up attendance | Showed the referral **follow-through** is the real win |
| **2019** | **CRADLE / White Eye Detector** (Baylor): AI scans family photos for white pupil, catching about 80% of affected kids about 1.3 years before diagnosis | Ordinary phone photos, no special capture |
| 2019/20 | **Mitani et al.** (Google): **anemia from retina photos**, hemoglobin MAE 0.63 g/dL, AUC 0.88 | Blood disease from the eye |
| **2020** | **EyeArt** FDA clearance (detects mild and vision-threatening DR) | Second autonomous DR AI |
| 2020 | **Google in Thailand (Beede et al., CHI):** about 90% accuracy in the lab but **struggled in 11 real clinics** (bad lighting, rejected images, slow internet) | **The famous lesson:** lab ≠ real world |
| 2020 | **Purdue** (Young Kim): phone photo of the **inner eyelid → hemoglobin** using spectral super-resolution, trained in Kenya | Phone-only anemia |
| **2021** | **Zhang et al., Nature Biomed Eng:** **chronic kidney disease and type 2 diabetes** from retina photos, AUC 0.85–0.93 | Kidney disease from the eye |
| 2021 | **Khan et al., Lancet Digital Health:** review of **94 open eye datasets**, showing geographic and disease gaps | Exposed data bias |
| **2022** | **Babenko et al., Nature Biomed Eng** (Google): **external eye photos** (no retina camera) detect diabetic eye disease and **poor blood sugar (HbA1c)** | **Front-of-eye photos carry body signals** |
| 2022 | **Cheung et al., Lancet Digital Health:** **Alzheimer's** from retina photos, AUC 0.93 internal, 0.73–0.91 external | Brain disease from the eye |
| 2022 | **AEYE Health** FDA clearance (93% sensitivity / 91.4% specificity) | Third DR AI, with a billing code (CPT 92229) |
| **2023** | **RETFound** (Nature, Moorfields/UCL): a foundation model on 1.6M retina images, predicts eye diseases plus heart failure and heart attack with far fewer labels. **Open-source** | The "ChatGPT moment" for eye AI |
| 2023 | Google: external eye photos also predict **kidney, liver, blood count, thyroid** markers (Lancet Digital Health) | Broadened the external-eye results |
| 2023 | **Toku CLAiR** gets FDA Breakthrough designation (heart risk from the retina) | Oculomics heads toward real products |
| 2023 | **UCSD far-red pupillometry:** "racially fair" pupil tracking for **dark irises** on RGB phones | Tackled the dark-eye problem |
| **2024** | Thyroid eye disease phone AI tested across **6 phone models**: 71.4% sensitivity / 81.6% specificity on average | Proved phone-to-phone variation is real |
| **2025** | **SmartPLR:** deep-learning phone pupillometry with **no infrared or extra device**, 336 exams from 158 people, matched the clinical NPi-300 pupillometer | Phone-only pupil reflex is feasible |
| 2025 | **DeepDKD** (Lancet Digital Health): retina AI screens diabetic kidney disease | Kidney oculomics continues |
| **2026** | **IDS / Eye-YOLO** (BMC Medicine): a lightweight phone AI for **multiple front-of-eye diseases**, 24,671 images (6,818 from smartphones), deployed via a WeChat mini-program | Real-world phone screening at scale |
| 2026 | **EyeSpy** (India, a 17-year-old): offline Android AI screens 7 eye diseases, 90.1% vs ophthalmologists, 1,650+ people screened | **Student precedent, the closest to Iris** |

---

# Datasets, licenses, and camera compatibility

Public image collections, on-request datasets, licensing cautions, and mismatches between clinic and phone images.

Rules: check each license. Credit the authors. **Never upload volunteers' photos anywhere.** Web-scraped sets are fine for a first model, not for final accuracy claims.

##  Usable now
| Dataset | For | Size | Image type | Labels | License | Link | Watch out |
|---|---|---|---|---|---|---|---|
| **Eyes-defy-anemia** | Anemia | 218 | Phone + **macro lens** | Conjunctiva masks + **lab Hb**, age, sex | CC BY-SA 4.0 | [Kaggle](https://www.kaggle.com/datasets/harshwardhanfartale/eyes-defy-anemia) · [IEEE](https://ieee-dataport.org/documents/eyes-defy-anemia) | Lens ≠ our phone photos |
| **CP-AnemiC** | Anemia (children) | 710 kids | Conjunctiva photos | Anemia labels | Check paper | [Paper](https://opus.lib.uts.edu.au/rest/bitstreams/07dedc98-8171-4aeb-80b7-701185825bb6/retrieve) | Ages 6–59 months, Ghana |
| **Eye Conjunctiva Segmentation** | Finding the inner eyelid | 547 | **Plain smartphone** (OnePlus 9R / 9 Pro) | Conjunctiva masks | CC BY 4.0 | [Mendeley](https://data.mendeley.com/datasets/yxwjgcndg2/1) | No Hb labels. Use it to train the "find the eyelid" step |
| **Eye Diseases Classification + Symptoms** (Bitto & Ahmed 2024) | Cataract, conjunctivitis, uveitis, drooping eyelid, normal | 2,298 real (544 / 357 / 223 / 525 / 649) | Web images | Class + symptom text checked by an eye professor | CC BY 4.0 | [Mendeley](https://data.mendeley.com/datasets/n9zp473wfw/1) | Google-search images. **Ignore the SMOTE "balanced" copies** and use the originals |
| **Eye Disease Dataset** (tejpal123) | Bulging eyes, cataract, crossed eyes, glaucoma, uveitis | Small | Web images | Class | Check page | [Kaggle](https://www.kaggle.com/datasets/tejpal123/eye-disease-dataset) | "Glaucoma" from an outside photo is not reliable, so drop that class |
| **STRABISMUS** | Eso-, exo-, hyper-, hypotropia, normal | About 500 | Face/eye photos | Class | MIT | [Kaggle](https://www.kaggle.com/datasets/ananthamoorthya/strabismus) | Small |
| **Cataract v01** (Roboflow) + IIT Delhi | Cataract grading | 799 | Smartphone external | 3 stages | Check | via the [MDPI 2025 paper](https://www.mdpi.com/2076-3417/16/12/5844) | ResNet-50 reached 94% |
| **Eye Detection Dataset** | Locating eyes | About 2,000 | Faces | Boxes | Check | [Kaggle](https://www.kaggle.com/datasets/icebearogo/eye-detection-dataset) | MediaPipe may make this unnecessary |
| **MOBIUS**, **SMD+SLD** | Sclera segmentation | 16.7k / about 490 | Smartphone | Sclera masks | Research license | [SSBC 2025](https://arxiv.org/pdf/2508.10737) | For the jaundice beta |

## Needs verification: Maybe, check first
| Dataset | Issue |
|---|---|
| Kaggle **JAUNDICE IMAGE DATA** (aiolapo), 760 (200 jaundice / 560 normal) | Probably **baby skin**, not eyes. Open samples before using. [Link](https://www.kaggle.com/datasets/aiolapo/jaundice-image-data) |
| Neonatal jaundice (Mendeley), 300 infants with bilirubin | **Forehead and sternum skin**, not eyes. [Link](https://data.mendeley.com/datasets/yfsz6c36vc/1) |
| Conjunctivitis sets (Kaggle + Shutterstock, 2,250) | Stock photos, possible licensing issues |

##  Available on request (email the authors)
| Dataset | For | Why it's valuable |
|---|---|---|
| **KidsVisionCheck** (arXiv 2509.09808) | Red-reflex abnormal vs normal | 2,403 real school phone photos of kids, AUC 0.96 |
| **CRADLE** (Baylor) | White pupil | About 53k family photos |
| Smartphone keratitis (J Ophthalmic Inflamm Infect 2025) | Keratitis | Real phone photos |
| Phone ptosis / MRD sets (411 volunteers, iPhone) | Eyelid | Measurement ground truth |

## ❌ Wrong camera (not for us)
- Retina/fundus: EyePACS, APTOS, ODIR-5K, Mendeley "Eye Disease Image Dataset" (5,335 fundus images), RETFound data
- Slit lamp / dye: SLID, SUSTech-SYSU corneal ulcers, AS-OCT keratitis

## Needs no dataset at all
- **Blink rate / incomplete blinks:** MediaPipe eye-aspect-ratio, validated by counting blinks on video by hand
- **Droopy eyelid (MRD1):** landmark distance, using iris diameter (about 11.7 mm) as a built-in ruler
- **Pupil reflex:** a personal baseline can support repeatability research, but disease-related claims still need clinically labelled comparison data.

## Our own data (the most valuable)
Consented photos of classmates, family and volunteers on 3 phones, with and without the white paper. Ask a school nurse or clinic for **finger-prick Hb** to label anemia photos. **This is what turns a demo into a science project.**

---

# Existing products, research apps, and open tools

LumineticsCore, EyeArt, AEYE, BiliScreen, SmartPLR, CRADLE, RETFound, and other precedents.

> Products, prototypes, and research tools have different hardware and evidence requirements. Regulatory descriptions are historical notes, not a current clearance review. They do not apply to Iris.

## FDA-cleared or regulated products (all need a retina camera)
| Product | Company | What | Status |
|---|---|---|---|
| **LumineticsCore** (formerly IDx-DR) | Digital Diagnostics | Autonomous diabetic retinopathy test in primary care | FDA 2018, the first autonomous AI diagnostic |
| **EyeArt** | Eyenuk | Autonomous DR (mild and vision-threatening) | FDA 2020, expanded to more cameras in 2023 |
| **AEYE-DS** | AEYE Health | Autonomous DR, 93% sensitivity / 91.4% specificity | FDA 2022, billable (CPT 92229) |
| **CLAiR** | Toku | Heart disease risk from a retina photo | FDA Breakthrough designation 2023, CE/UKCA marked. US clearance not confirmed |
| **Fundus on Phone** | Remidio | Smartphone + optics retina camera, works offline | FDA-registered camera |
| **GoCheck Kids** | Gobiquity | Phone photoscreening for amblyopia risk | Used by pediatricians |
| **Peek Vision** | Peek (UK nonprofit) | Phone visual-acuity test and school referral system | Scaled across Kenya and other countries |

## Research apps (phone, no regulatory clearance)
- **BiliScreen** (Univ. of Washington): jaundice from eye selfies
- **PupilScreen** (UW): concussion from a pupil video
- **CRADLE / White Eye Detector** (Baylor): white pupil in family photos. Free on Android and iOS
- **HemaChrome** (Purdue): hemoglobin from an inner-eyelid photo. NIH maternal health challenge
- **SmartPLR**: pupil reflex with no extra hardware
- **UCSD Digital Health Lab:** Face ID infrared pupillometry, far-red "racially fair" pupillometry
- **IDS / Eye-YOLO** (China): multi-disease front-of-eye screening via WeChat
- **CaT:** at-home eye-surface tumor screening app
- **Google external eye research:** blood sugar, kidney, liver markers from front-of-eye photos (research only)

## Open-source models and code
- **RETFound**: open retina foundation model (Moorfields/UCL)
- **MediaPipe Iris / Face Landmarker** (Google): iris and face landmarks in the browser; measuring the pupil requires an additional method
- **Blink-To-Live**: eye-gesture communication, on GitHub

| Who | Project | Notes |
|---|---|---|
| Kavya Kopparapu (US, 16) | **Eyeagnosis**: phone + 3D-printed lens + AI for diabetic retinopathy | Presented at the O'Reilly AI Conference 2017. An NIH doctor said it needs a lot of clinical data |
| Gurugram student (India, 17) | **EyeSpy**: offline Android AI for 7 eye diseases | 90.1% vs ophthalmologists, 1,650+ screened, silver at IRIS and INSEF |
| NUS students | Low-cost glaucoma screener | James Dyson Award 2021 |
| Kaggle competitors | **EyePACS DR 2015**, **APTOS 2019** (2,900+ teams, $50K) | Public datasets we can learn from |

---

# Prior art and the novelty search

Related pupil devices, phone apps, patents, alternative signals, and the limits of claiming a first.

> Prior-art search recorded October 19, 2026. Failure to find a project does not prove it has never been done. Patents describe claims and proposed methods; they do not establish clinical effectiveness.

---

## 1. Diabetes Pupil Check (phone flash → pupil reflex → "get an A1c test")
**Verdict: 🟡 Partly done. The science has been proven with special devices and a company patent mentions it, but no one has published a phone-only version tested in people with diabetes.**

### What HAS been done (closest prior art)
| Who | What | How close |
|---|---|---|
| **Tan, Najjar, Milea et al. 2022** (Singapore National Eye Centre), *Clin Exp Ophthalmol* | **Custom handheld pupillometer** (infrared camera + blue/red LEDs + iPad) told **diabetes vs healthy apart with AUC 0.89** (76% sensitivity, 90% specificity), 82 diabetic patients vs 93 controls. Worked **even in people with no visible eye damage** | 🔴 **Very close:** same idea, but special hardware, not a phone. The authors hold a **patent application** on their device |
| **Biotrillion Inc.** (San Francisco), patents **US 12,551,097 B2** and **WO2020190648A1** (priority 2019) | Phone **front camera + screen flash** measures the pupil reflex and outputs a "health status". The text says *"autonomic neuropathies associated with diabetes may result in anomalies in PLR"*, but it focuses on Alzheimer's, cognition and alcohol. Their BioEngine4D app reads a face video | 🟠 **Close:** a broad patent covers phone pupil health checks and mentions diabetes in passing. **No published diabetes test from them found** |
| 2010 pilot and other clinic studies | Dedicated pupillometers show smaller, slower pupils in diabetes | Science backing, not phone |
| Sousa et al. 2024, *Bioengineering* | Smartphone + 3D-printed LED ring (blue/red light) | Phone **with attachment**, tested only on 11 healthy people, aimed at glaucoma, **not diabetes** |
| UCSD 2022 (CHI) | Phone infrared pupillometry at home | Authors only **speculated** it could help with diabetes |
| UCSF 2019 | Phone camera + flash on the **fingertip** (blood-flow signal) detects diabetes, 72–81% | Different signal (finger, not eye) |
| **Visualyze**, 2024 Berkeley iHackHealth Appathon winner (students) | Phone camera + flashlight **pupillometer for doctors** | Student precedent for phone pupillometry, **not diabetes** |
| PupilScreen, SmartPLR, MindMirror, Korean 2016 app | Phone pupil-reflex apps | Concussion, neuro, drugs. **Not diabetes** |

### What was NOT found (our opening)
- ❌ Any study testing a **regular phone, no attachment** pupil test **in people with diabetes**
- ❌ Any **app** that screens for diabetes or diabetic nerve damage through the pupil
- ❌ Any **student project** doing this
- ❌ Anyone using the **phone screen's own blue vs red light** (imitating Singapore's blue/red device) for diabetes

> "A 2022 Singapore study showed a special handheld device could spot diabetes from the pupil's reaction to light (AUC 0.89). **We're the first we know of to test whether an ordinary phone, with no attachment, can do the same,** using its flash and screen colors."

That's a strong, honest novelty claim: we're **bringing proven clinic science onto a phone**, which is how the winning Oral Scan and AKQUA-Gel projects were framed.

###  Twist that makes it more original
Use the phone **screen** to shine **blue light, then red light** (like the Singapore device). Blue light triggers special retina cells (ipRGCs) that are damaged early in diabetes. **No one found has tried this on a plain phone for diabetes.** Needs verification: The phone screen may be too dim, so **testing that is itself the experiment.**

## 2. High Blood Pressure from Eye-White Blood Vessels (phone photo)
**Verdict: 🟡 The exact target (blood pressure from eye-white photos) was not found, but the method has been done for other diseases and the science is weak.**

### What HAS been done
| Who | What | How close |
|---|---|---|
| Dongzhimen Hospital (Beijing), *Sci Reports* Dec 2025 | **Eye-white (scleral) photos → coronary heart disease risk**, AUC 0.942, 500 people. **Custom imaging device**, not a phone | 🔴 **Very close method**, different disease |
| Tsinghua / Peking Univ. 2022 | Scleral photos → **polycystic ovary syndrome** | Same method |
| Huang et al. 2023 | Scleral images → **lung tumors** | Same method |
| OcularSurfaceNet (2023) | Eye-surface photos → **type 2 diabetes** | Same method, diabetes |
| Dongzhimen Hospital, *Sci Reports* Jan 2026 | **Face photos → hypertension**, AUC 0.84 (eyes were *not* analysed) | Same disease, different body part |
| Nuralogix / AHA journal; Biotrillion | **Phone face video → blood pressure** | Same disease, phone, different signal |
| Retinal (fundus) AI | Hypertension from **retina** photos (AUC about 0.77) | Needs a special camera |

### What was NOT found
- ❌ Any study predicting **blood pressure or hypertension from eye-white photos** (phone or not)

### Needs verification: Why it's risky
- A study of healthy adults found eye-white (conjunctival) blood flow **did not correlate with blood pressure** (r = 0.03). Stronger hypertension claims come from weak sources.
- Chinese hospital groups are actively doing "eye-white photo → disease" work and could publish it any time.

---

## 3. Re-check of the others
| Idea | Status |
|---|---|
| Sickle cell eye tracker | Still **no app found** combining jaundice + paleness for sickle cell (fingernail Hb app exists). Dropped for other reasons |
| Iris multi-disease check | **Done** in parts: EyeSpy (teen, 7 diseases), Eye-YOLO (BMC Med 2026), Biotrillion patents list jaundice, cholesterol ring and cataract from phone photos |
| Cholesterol ring (arcus) | **Done**: Gdańsk 2022 CNN app (88%). Also in Biotrillion's patent |
| Blood sugar from eye photos | **Done**: Google 2022, OcularSurfaceNet 2023 |
| Concussion pupil check | **Done**: PupilScreen (UW), JMIR 2024 |
| School vision follow-through | **Done**: Peek (Kenya, Lancet GH 2018) |

## Bottom line
**Diabetes Pupil Check is still the best choice.** It's the only idea where (1) the science is **proven** (AUC 0.89 with a device), (2) **no phone-only version** was found, and (3) the disease is **very common**. Describe it as *"the first phone-only test we know of"*, cite the Singapore study as the science, and add the **blue/red screen-light twist** to make it clearly ours.

## Sources
- [Tan et al. 2022: handheld chromatic pupillometry in diabetes (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9796882/) · [PubMed](https://pubmed.ncbi.nlm.nih.gov/35616273/) · [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/ceo.14116)
- [Biotrillion patent US12551097B2](https://patents.google.com/patent/US12551097B2/en) · [WO2020190648A1](https://patents.google.com/patent/WO2020190648A1/en) · [Biotrillion / Aptar partnership](https://aptardigitalhealth.com/wp-content/uploads/2024/06/BioTrillion_aptardigitalhealth_parnership.pdf) · [CogSci + Biotrillion](https://professional.cogsci.nl/biotrillion)
- [2010 pupillometry pilot in diabetes (Springer)](https://link.springer.com/article/10.1186/1475-925X-9-26) · [Pupillometry + diabetes RNFL (PMC 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12209431/)
- [Sousa 2024 smartphone chromatic pupillometry (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10968505/) · [UCSD at-home pupillometry (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10686294/) · [UCSF fingertip PPG diabetes (ScienceDaily)](https://www.sciencedaily.com/releases/2019/03/190306081752.htm)
- [Visualyze wins 2024 iHackHealth Appathon](https://funginstitute.berkeley.edu/news/visualyze-team-wins-2024-ihackhealth-appathon/) · [Korean smartphone PLR app 2016](https://www.spandidos-publications.com/etm/12/2/720/abstract) · [PupilScreen](https://newsroom.uw.edu/news/smartphone-app-pupilscreen-aims-help-detect-concussions)
- [Scleral photos → CHD risk (Sci Rep 2025, PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12847730/) · [Scleral images → PCOS (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8828568/) · [Face regions → hypertension (Sci Rep 2026, PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12789565/) · [OcularSurfaceNet T2D](https://link.springer.com/10.1007/s44258-023-00005-z) · [Fundus → hypertension (PLOS ONE 2020)](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0233166)
- [Conjunctival vs retinal microcirculation, no BP correlation (Springer)](https://link.springer.com/article/10.1186/s40662-019-0136-3) · [Smartphone facial-video BP (AHA)](https://www.ahajournals.org/doi/10.1161/CIRCIMAGING.119.008857)

---

# What the research teaches us

Lighting, device variation, external validation, fairness, capture quality, and referral follow-through.

## Ten lessons from 10 years of eye AI
1. **The science is real.** Peer-reviewed work shows eye images reveal jaundice, anemia, thyroid disease, blood sugar, kidney disease, heart risk and brain injury. Iris is plausible, not sci-fi.
2. **The strongest phone-only evidence is front-of-eye:** jaundice (BiliScreen), anemia (Purdue, Eyes-defy-anemia), white pupil (CRADLE), thyroid signs, cataract and eye-surface conditions. **Start there.**
3. **Retina-based "body" results (heart, kidney, Alzheimer's) need a fundus camera.** Don't claim them for a plain phone. Use them on the "future" slide.
4. **Google's external-eye blood-sugar and kidney results are moderate (AUC about 0.7) and not phone-tested.** Present them as a research direction.
5. **Lighting kills accuracy.** BiliScreen needed a box. Our **white-paper color reference** directly addresses the main weakness of the best prior work.
6. **Phones differ.** The thyroid AI dropped across 6 phone models. **Test Iris on several phones** (at least 2–3 Galaxy models plus one non-Samsung) and report the results.
7. **Lab ≠ real world** (Google in Thailand). Build a strong **image quality gate** and a guided capture, and test with real people, not only datasets.
8. **Bias is the #1 criticism.** Report accuracy **by skin tone and eye color**. Dark irises are hard for pupil tracking, so cite UCSD far-red work and SmartPLR.
9. **Referral follow-through is where impact happens** (Peek doubled attendance). Iris's "where to get care in Jacksonville" feature is backed by evidence, so lead with it.

## Still to verify before citing
- [ ] Brown University anemia study (accuracy, skin-tone claim)
- [ ] The "2024 Frontiers iPhone + flash pupil" study from the brainstorm
- [ ] Whether the "2026 8-condition / 310-user" study is the BMC Medicine IDS paper
- [ ] Patent US 12,697,024

---

# Phone-only feasibility across eye conditions

An earlier comparison of what a phone can measure, which data are available, and where extra optics are needed.

> Earlier exploration, before the current three-check scope. Recommendations in this table are historical research notes. Retinal glaucoma imaging requires specialized optics; the separate-eye pupil-response hypothesis is a different, unvalidated approach.

## Verdict at a glance
| | Condition | How the phone sees it | Public data? | Evidence it works | Difficulty | Verdict |
|---|---|---|---|---|---|---|
| 🟢 | **Anemia** (low hemoglobin) | Color of the **inner lower eyelid** |  Eyes-defy-anemia (218, lab Hb), CP-AnemiC (710 kids), conjunctiva masks (547 phone photos) | Purdue, Brown, Mitani, Sci Reports 2025 | Medium | Earlier candidate; needs validation |
| 🟢 | **Red / irritated eye** (conjunctivitis), **cataract**, **uveitis** | Front-of-eye photo |  Mendeley Bitto 2024 (2,298 real images, CC BY 4.0), Kaggle eye-disease sets, Roboflow cataract (799) | Smartphone cataract grading 94% (MDPI 2025), Eye-YOLO (BMC Med 2026) | Low–Medium | **GO: image classifier** |
| 🟢 | **Droopy eyelid** (ptosis) | Eyelid-to-pupil distance (MRD1), **measured with landmarks** | Partly (Mendeley "eyelid drooping" class). **Mostly not needed** because it's geometry | Phone MRD studies (iPhone, 411 volunteers) | Low | **GO: measurement, not AI guessing** |
| 🟢 | **Blink rate / dry eye / digital eye strain** | Selfie video, eye-aspect-ratio | **Not needed** (MediaPipe) | EyeScore, DryEyeRhythm, Thai "Dry eye or not?" app | **Lowest** | **GO: easiest win, testable on classmates** |
| 🟡 | **Crossed eyes** (strabismus) | Where the flash reflection sits on each cornea (Hirschberg test) |  Kaggle STRABISMUS (about 500, MIT license) | GoCheck Kids-style photoscreening | Medium | **GO if time allows** |
| 🟡 | **Jaundice** (yellow eye whites) | Sclera color plus **white-paper color correction** | Needs verification: No good public sclera set. Kaggle "jaundice" (760) is probably baby skin, so check it | BiliScreen 89.7% / 96.8% (with a box) | Medium (data is the problem) | **Rule-based "beta"**. Can't validate without jaundiced volunteers |
| 🟡 | **Pupil light reflex** (concussion, neuro) | Flash video, pupil size over time | Not needed (personal baseline) | PupilScreen, SmartPLR 2025 | High (dark irises, frame rate) | **Stretch goal** |
| 🟠 | **White pupil / abnormal red reflex** (retinoblastoma, amblyopia risk) | Flash photo of the pupil | ❌ Private. KidsVisionCheck (2,403 eyes, AUC 0.96) **on request**, CRADLE private | Strong | Medium | **Email the authors**. Great if they share |
| 🟠 | **Arcus senilis** (cholesterol ring) | Grey ring around the iris | ❌ Small private sets (191–600) | 98%+ in small studies (overfit risk) | Medium | Future |
| 🔴 | **Thyroid eye disease** | Bulging / swelling | ❌ None public | 71% across 6 phones | High | Skip |
| 🔴 | **Pterygium, keratitis** | Needs slit lamp or dye. Rare in the US | ❌ / slit-lamp only (SLID, SUSTech-SYSU) | Clinic devices | High | Skip |
| 🔴 | **Diabetic retinopathy, glaucoma, AMD** | **Retina, which needs a fundus camera** | Lots of data, but wrong camera | FDA-cleared products | Needs hardware | **Skip** (no attachment rule) |
| 🔴 | **Blood sugar, kidney, heart, Alzheimer's** | Retina or subtle external signs | ❌ Not public | Google research only, AUC about 0.7 | Very high | Future slide only |

## What makes it hard (and our plan for each)
| Problem | Plan |
|---|---|
| **Web-scraped training images** (Google search, Shutterstock) are severe textbook cases and may be mislabeled | Use them only for the first model. Report it honestly. Test on **our own consented phone photos** |
| **Macro-lens anemia photos** look different from normal phone photos | Train on color **features** of the segmented eyelid (not raw pixels), then check against classmates and adults with known Hb (school nurse or donation drive) |
| **Lighting changes colors** | White-paper reference + quality gate. Measure the error with and without the paper. *This experiment alone is a great science result* |
| **Different phones** | Test on at least 3 phones (2 Galaxy + 1 other) |
| **Skin tone and eye color bias** | Record and report accuracy per group |
| **Photos of minors / human subjects** | Parent consent forms, teacher oversight, no photos leave the phone. Follow your school's and science fair's human-subjects rules |

---

# Why multiple checks need separate validation

The earlier scope comparison and the correction explaining why separate-eye lighting is necessary.

> Earlier scope comparison. The current project includes diabetes, glaucoma, and cataract research. The important correction is that comparing afferent responses requires lighting each eye separately; one shared flash cannot isolate the signal from each eye.

## The four candidates (from the team's list)

| Condition | What the phone looks at | Same scan as Iris? | Extra hardware? | Already done by others? | Verdict |
|---|---|---|---|---|---|
| **Retinoblastoma** (kids' eye cancer) | White pupil glow in flash photos (leukocoria) | Partly (the flash is the same) | No | **Yes:** the CRADLE / White Eye Detector app (Baylor, 2019) | Future slide only: not new, and it's for babies and toddlers, not the adults Iris targets |
| **Glaucoma** | Pupil reaction that differs between the eyes (RAPD), and jerky eye tracking (saccades) | **Yes for the pupil part:** Iris already records both pupils | No | Research studies exist, few apps | **Best add-on:** a left/right pupil difference check is almost free |
| **Retinal detachment** | Vision test on screen (Amsler grid, field test) | No | No | Yes (Amsler grid apps) | Skip: it's an emergency, not something to screen for, and it's a vision test rather than an AI scan |

## Why not check for everything
- **Validation:** every disease needs its own pilot group of people who have it. One clean pilot (diabetes vs. no diabetes) beats four weak ones.
- **Novelty:** the diabetes pupil test on a phone alone is the new part. The other checks mostly copy existing apps.

## Evidence check (2026-10-21)
- The pupil studies found **average differences between groups** (with vs. without diabetes) using special clinic devices. The groups **overlap**, so it can't be a yes/no test for one person. Some people with diabetes will look normal.
- Example: Tan et al. 2022 ([PubMed 35616273](https://pubmed.ncbi.nlm.nih.gov/35616273/)), with 82 people with diabetes and 93 controls, around age 60, using a custom handheld pupillometer. Reactions were weaker in diabetes, even without retinopathy. A "detected about 76%" figure was quoted to us, but it isn't in the abstract. **Check the full paper before using any number.**
- **The collected notes do not establish how well the Iris phone method performs.** That is the team's experiment, not a known fact.
- **A normal result doesn't rule out diabetes.** Only blood tests (A1C, blood glucose) diagnose it.
- How to say it: "Iris tests whether a phone can measure a pupil change that research links to diabetes, as a nudge to get a blood test." Not: "Iris detects diabetes."

---

# Eye-health needs and access to care

School vision follow-up, digital eye strain, myopia, missed eye exams, and eye-gaze accessibility.

> Background needs assessment. Several figures are older estimates or secondary-source leads and should be checked against their original population and date before reuse. These figures are not measurements of Jacksonville residents.

## 1. Kids failing school vision screenings never get glasses
- About **1 in 4 school-age children** has an undetected or untreated vision problem (Prevent Blindness, a widely repeated estimate from older studies).
- At some California schools, **up to ~35% of students fail vision screening, yet only ~7% go on to get an exam and glasses** (secondary source citing a CA report). Only **16% of school-age Medi-Cal kids** got vision care in 2022–24, down from 19%.
- Screening quality **varies by school**, so kids get unequal care.
- **Amblyopia ("lazy eye")** causes permanent vision loss if it isn't caught young.
-  The gap is **follow-through** (screening → exam → glasses → actually wearing them), not only detection.

## 2. Digital eye strain and dry eye in teens
- About **half of teens and students** report digital eye strain symptoms. Online-class students showed 50.6% vs. 33.2% in the general population.
- Blinking drops from **~15/min to ~5–7/min** during screen use.
- In one high school survey, **39.7%** reported dry-eye symptoms, and **>6 h/day of device use** carried an odds ratio of **7.3** for dry eye.
-  This is **our own community**: students. It's easy to survey classmates and measure before/after.

## 3. Childhood myopia (nearsightedness) is rising
- Linked to **close-up work and too little time outdoors**. Spending about 2 h/day outdoors is the main evidence-based prevention measure (well established in the literature; find a strong citation).
- An Oct 2026 parent survey shows **low awareness**: only 38% of parents report routine screening at well-child visits.
-  Prevention and behavior change are measurable through reading distance, outdoor light exposure, and time.

## 4. Diabetic retinopathy is missed in adults
- About **50% of people with diabetes don't get a yearly eye exam**, roughly 15M people in the US.
- One US study: only **4.2%** of diabetic patients got retinal imaging over 5 years.
- FDA-cleared AI tools exist (IDx-DR / LumineticsCore, EyeArt, AEYE), but uptake is slow.
-  This is an important problem, but it's **hard for students**: we'd need a medical partner, retinal images, and regulatory care. It's probably too much for us.

## 5. People who can only communicate with their eyes
- People with ALS, cerebral palsy, locked-in syndrome, or nonverbal students in special-ed classrooms.
- **Commercial eye-gaze devices cost thousands of dollars.** A DIY eye tracker can be built for about €30.
-  A strong fit for the **"Advancing accessibility"** theme, if we can find a local partner (special-ed teacher, ALS chapter).

## 6. Blind and low-vision navigation
- A real problem, but **heavily done before** (see Past Winners and Patterns). Avoid it unless we have a unique angle.

---

# Screening and accessibility precedents

Photoscreeners, retinal AI, eye-gaze communication, blink reminders, and reading-distance tools.

## Vision screening
- **Photoscreeners** (Spot Vision Screener, plusoptiX): commercial devices costing thousands of dollars that schools and pediatricians use.
- **Vision To Learn, OneSight, Lions Club:** nonprofits doing school eye exams and free glasses. **These are potential partners.**
- **EyeSpy** (17-year-old in Gurugram, India): an offline AI app on entry-level Android that screens for 7 eye diseases. Reports 90.1% accuracy against ophthalmologists and 1,650+ people screened. *This proves a teen can do it, and gives us a benchmark to beat or differentiate from.*

## Diabetic retinopathy AI
- **IDx-DR** (2018, first FDA-cleared autonomous AI diagnostic): 87.4% sensitivity in its pivotal trial.
- **EyeArt** (Eyenuk, 2020) and **AEYE Health** (2022, 93% sensitivity, 91.4% specificity, billable under CPT 92229).
- These all need **fundus cameras**. Smartphone fundus adapters exist (e.g., D-EYE, Peek Vision) but aren't FDA-cleared for autonomous DR screening.

## Eye-gaze communication
- **Blink-To-Live** (Nature Scientific Reports, 2023): eye-gesture communication on a phone, **open source on GitHub**.
- **Open Gaze:** a smartphone gaze tracker using ML, no extra hardware.
- **EyeWriter:** an open-source project that lets artists with ALS draw by gaze, using a hacked PlayStation Eye camera.
- **DIY pupil tracker for about €30:** a published build.
- A patent covers phone-based **E-tran** gaze boards for ALS (one gesture per character).
- Commercial: Tobii Dynavox and similar, costing thousands of dollars.

## Glaucoma
- **NUS students, James Dyson Award 2021:** a low-cost glaucoma screening device.

## Digital eye strain
- Apps with 20-20-20 timers exist, but **few measure blinking with the camera**. Most are just reminders. Research blink-detection code (eye aspect ratio with MediaPipe/dlib) is free and well documented.

## Myopia
- **Clouclip-style wearables** clip to glasses and log reading distance and light exposure. They're research tools and expensive. Smart lamps and "distance alarms" exist in China.

---

# Phone hardware and accessibility

Camera and screen-light capabilities, screen readers, low-vision modes, and possible tablet use.

> Hardware and accessibility possibilities, not implemented integrations or endorsements. Device capabilities and software availability need checking on each supported phone.

- **Galaxy phones:** front and rear cameras, flash/torch, on-device AI (Galaxy AI). Iris running fully on-device is a match for Samsung's privacy messaging.
- **Samsung Health:** a possible future integration for logging results over time.
- **Relumino Mode:** AI low-vision viewing mode on Samsung TVs and Galaxy devices (outlines, color adjustment). Samsung says it's **not** a diagnostic tool.
- **SeeColors:** 9 presets for color-vision deficiency. It started as an app in 2017 and is now built into Samsung TVs and monitors.
- **TalkBack:** the Galaxy screen reader. Iris should be usable with TalkBack, for accessibility points.
- **Galaxy Tab:** an option for a bigger-screen kiosk version at clinics and school nurse offices.

---

# Earlier direction: sickle-cell eye tracking

The earlier exploration of personal-baseline sclera and eyelid color, related anemia research, and local clinical resources.

> Archived research direction, outside the current three checks. Color changes alone do not establish a sickle-cell crisis. The proposal would require clinical validation and cannot replace a person’s care plan.

## How it works
1. **Daily 10-second check:** pull down the lower eyelid, look at the camera, and hold a **sheet of white paper** in view (color reference).
2. The app finds the **eye white** and the **inner eyelid** (MediaPipe plus a segmentation model trained on public phone datasets).
3. It measures **yellowness** of the sclera and **redness / paleness** of the eyelid after correcting for room light with the white paper.
4. It plots a **trend line against the person's own normal**. A big change → "Yellower / paler than your usual. Call your sickle cell team." Danger signs (fever, chest pain, stroke signs) → **911 / ER** guidance.
5. **Share with the care team:** a simple chart the family can show the hematologist.
6. Runs **on the phone only**. Health photos never leave it (Samsung on-device AI angle).

## Why the "personal baseline" approach is smart
- People with SCD can have chronic anemia and jaundice, with substantial variation between people, so a "yes/no disease" model is useless. **Change from their normal** is what matters, and that's what the family guides describe.
- It avoids needing hundreds of sickle cell patient photos to train on.
- It reduces skin-tone and lighting bias, because each person is compared to themselves.

- **Validation needs a clinical partner.** Ideally we'd compare our readings with blood tests (hemoglobin, bilirubin) from real patients. As students, we can: (a) prove the **measurement** is stable across phones and lighting with healthy volunteers and color cards, and (b) seek a mentor at Wolfson, Nemours or UF Health Jax for future testing.
- **It's a tracking aid, not a diagnosis.** It never replaces calling the care team.
- Patient photos involve **consent and privacy rules**. Keep everything on-device. No patient testing without adult and clinic oversight.

## Community and partner leads (Jacksonville)
- Wolfson Children's Hospital: pediatric sickle cell program
- Nemours Children's Health, Jacksonville (works with Wolfson)
- UF Health Jacksonville: hematology
- LifeSouth Community Blood Centers (SCD blood drive campaigns)
- Local sickle cell family support groups and churches. Interview 3–5 families or a nurse **before** the application. That's the "how we learned their needs" answer

## Facts to double-check before using
- [ ] Florida SCD count: about 8,800 (2020 FL Senate resolution), 8,067 found in a surveillance study, about 13,886 modelled (ASH 2022). Use a range and cite it
- [ ] Duval County SCD numbers: not found. Ask Florida DOH-Duval or Wolfson
- [ ] Duval's Black population share: check Census QuickFacts
- [ ] Emory fingernail app's results in SCD: 74% sensitivity / 76% specificity for screening SCD in 485 kids (Atlanta). Anemia overall 89% / 93% (PNAS 2025)

## Sources
- [Emory fingernail anemia (2025)](https://news.emory.edu/stories/2025/05/photo-fingernail-can-now-be-used-detect-and-monitor-anemia-emory-research-finds) · [Nature Comms 2018](https://link.springer.com/article/10.1038/s41467-018-07262-2) · [ASH 2024 SCD app abstract](https://ash.confex.com/ash/2024/webprogram/Paper194249.html) · [Pediatric SCD screening study](https://doaj.org/article/0ef74d03a61b4acc88fec3e839b65d7e) · [ASH Blood 2025 pediatric Hb app](https://ashpublications.org/blood/article/146/Supplement%201/1158/554266/Smartphone-app-for-noninvasive-at-home-pediatric)
- [neoSCB newborn sclera jaundice (PLOS ONE)](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0216970) · [Conjunctiva anemia smartphone app (2023)](https://www.sciencedirect.com/science/article/pii/S2590093523000322)
- Warning signs: [NJ Sickle Cell Family Guide](https://nj.gov/health/fhs/nbs/documents/Sickle%20Cell%20Family%20Guide_Fourth%20Edition.pdf) · [Maryland "when to call the doctor"](https://test-health.maryland.gov:443/phpa/genetics/docs/SCD/when_to_call_the_doctor.pdf) · [Louisiana Hgb SS brochure](https://ldh.la.gov/assets/oph/Center-PHCH/Center-PH/genetic/NBSManual/Hgb_SS_Brochure.pdf)
- Florida: [FL Senate 2020 resolution](https://flsenate.gov/Session/Bill/2020/1916/BillText/Filed/HTML) · [FL SCD surveillance study](https://academic.oup.com/jscd/article/1/Supplement_1/yoae002.010/7686677) · [ASH state prevalence model](https://ashpublications.org/blood/article/142/Supplement%201/3900/500392/Estimating-Sickle-Cell-Disease-Prevalence-By-State) · [CMS SCD disparities 2024](https://www.cms.gov/files/document/sickle-cell-disease-disparities.pdf)
- Jacksonville care: [Wolfson blood disorders](https://www.wolfsonchildrens.com/services/cancer/blood-disorders) · [Nemours SCD](https://www.nemours.org/services/sickle-cell-disease.html) · [UF Health Jax hematology](http://ufhealthjax.org/specialties/hematology) · [LifeSouth SCD drive (Action News Jax)](https://www.actionnewsjax.com/news/local/duval-county/lifesouth-webster-bass-health-institute-launch-northeast-florida-blood-drive/HH4FQOINLRFYTAKWLFUPPEFOVE/)

---

# The collected research sources

The source lists for eye health, AI, datasets, phone measurements, accessibility, and Jacksonville background.

## Eye health and research
- [Prevent Blindness: children's vision facts](https://childrensvision.preventblindness.org/facts-about-childrens-vision/) · [Pediatric screening review (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10047420/) · [CA kids missing vision care](https://store.good-lite.com/blogs/news/california-children-missing-vision-care)
- [Teen digital eye strain (PAFMJ)](https://pafmj.org/PAFMJ/article/view/2519) · [Adolescent dry eye (NHSJS)](https://nhsjs.com/?p=26474) · [Screen time drying teens' eyes](https://www.scimex.org/newsfeed/extended-screen-time-is-drying-out-teens-eyes)
- [DR AI uptake (AOP)](https://www.aop.org.uk/ot/news/2024/11/22/slow-uptake-of-ai-systems-for-identification-of-diabetic-eye-disease) · [FDA AI DR (Freethink)](https://www.freethink.com/health/fda-approves-first-ai-doctor) · [AEYE clearance](https://prnewswire.com/news-releases/aeye-health-receives-fda-clearance-for-ai-based-autonomous-screening-for-referable-diabetic-retinopathy-301678515.html)
- [EyeSpy teen eye-screening app](https://amanshantinews.com/eye-health-innovation-after-watching-his-grandmother-battle-an-eye-disease-this-17-year-old-gurugram-student-built-an-ai-app-for-eye-screening-today-he-has-screened-over-1650-people-across-haryan/)
- [UCSD smartphone pupillometry](https://digihealth.ucsd.edu/smartphone-pupillometry) · [UCSD far-red](https://digihealth.ucsd.edu/farred) · [MediaPipe Iris](https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/) · [Dark iris RGB limits (Sci Reports)](https://doaj.org/article/b2b18f9525e74b1ba69de7c75ada28da) · [PupilScreen patent](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11627875)
- [BiliScreen paper](https://ubicomplab.cs.washington.edu/pdfs/biliscreen.pdf) · [Healio coverage](https://www.healio.com/news/gastroenterology/20171018/smartphone-app-could-detect-pancreatic-cancer-using-selfies)
- [Google: systemic biomarkers in external eye photos](https://research.google/blog/detecting-novel-systemic-biomarkers-in-external-eye-photos/) · [arXiv](https://arxiv.org/pdf/2207.08998)
- [Blink-To-Live (Nature Sci Reports)](https://www.nature.com/articles/s41598-023-34310-9) · [Low-cost eye-tracking review](https://arxiv.org/pdf/2010.05480)

## AI eye research (history, studies, products)
- History: [Eye Clinic London: history of AI in ophthalmology](https://www.eyecliniclondon.com/blog/history-of-ai-in-ophthalmology/) · [Ting 2017 JAMA](https://jamanetwork.com/journals/jama/fullarticle/2665775) · [Gulshan replication](https://arxiv.org/pdf/1803.04337) · [DL in ophthalmology review 2025](https://arxiv.org/html/2501.04073v1)
- IDx-DR: [Univ. of Iowa trial](https://medicine.uiowa.edu/node/3021) · [MobiHealthNews](https://www.mobihealthnews.com/news/study-results-support-fda-approval-diagnostic-algorithm-experts-remain-wary) · [ScienceDaily](https://www.sciencedaily.com/releases/2018/08/180828085908.htm)
- DeepMind OCT: [De Fauw 2018 paper](https://lmb.informatik.uni-freiburg.de/Publications/2018/Ron18/paper-De_Fauw_et_al_2018_Nature_Medicine.pdf) · [Digital Health](https://www.digitalhealth.net/2018/08/deepmind-ai-system-eye-diseases-moorfields)
- Oculomics: [Poplin 2018 (Google)](https://research.google/pubs/predicting-cardiovascular-risk-factors-in-retinal-fundus-photographs-using-deep-learning/) · [UK Biobank summary](https://www.ukbiobank.ac.uk/publications/prediction-of-cardiovascular-risk-factors-from-retinal-fundus-photographs-via-deep-learning/) · [Mitani anemia from retina](https://research.google/pubs/predicting-anemia-from-fundus-images/) · [Oculomics review (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1350946225000230) · [2026 oculomics review](https://rspublisher.org/index.php/ijitss/article/view/5896) · [DL oculomics review (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9821402/) · [DeepDKD 2025](https://pureadmin.qub.ac.uk/ws/files/638638165/Meng_Non-invasive_Kidney_Biopsy_Diabetic_Kidney_Disease_Lancet_Digit_Health_2025.pdf)
- RETFound: [News-Medical](https://www.news-medical.net/news/20230913/World-first-AI-model-can-detect-eye-diseases-and-predict-systemic-health.aspx) · [HDR UK](https://www.hdruk.ac.uk/news/eye-scanning-ai-predicts-and-detects-disease-in-world-first-study-suggests/)
- Alzheimer's: [Cheung 2022 (PolyU)](https://research.polyu.edu.hk/en/publications/a-deep-learning-model-for-detection-of-alzheimers-disease-based-o/) · [MIMS summary](https://www.mims.com/india/news-updates/topic/noninvasive-retinal-photography-based-ai-model-accurate-and-sensitive-for-alzheimer-s-disease-screening)
- Real-world lesson: [MIT Tech Review: Google in Thailand](https://technologyreview.com/2020/04/27/1000658/google-medical-ai-accurate-lab-real-life-clinic-covid-diabetes-retina-disease) · [TechCrunch](https://techcrunch.com/2020/04/27/google-medical-researchers-humbled-when-ai-screening-tool-falls-short-in-real-life-testing/)
- Products: [Toku CLAiR breakthrough](https://www.modernretina.com/view/fda-grants-toku-breakthrough-device-status-for-its-cardiovascular-risk-ai-platform) · [Eyenuk multiple cameras](https://www.biospace.com/new-fda-clearance-makes-eyenuk-the-first-company-with-multiple-cameras-for-autonomous-ai-detection-of-diabetic-retinopathy) · [LumineticsCore](https://www.digitaldiagnostics.com/lumineticscore-formerly-known-as-idx-dr-the-first-fda-approved-ai-system-is-growing-rapidly/) · [Remidio + IRIS](https://www.biospace.com/intelligent-retinal-imaging-systems-iris-partners-with-remidio-innovative-solutions-pvt-ltd-to-provide-affordable-early-detection-systems-for-diabetic-eye-disease) · [GoCheck Kids trial](https://clinicaltrials.gov/study/NCT03119675) · [Peek trial (LSHTM)](https://www.lshtm.ac.uk/newsevents/news/2018/smartphone-screening-boosts-childrens-eye-health-care)
- Front-of-eye / phone: [CRADLE (Baylor)](https://news.web.baylor.edu/news/story/2019/prototype-smartphone-app-can-help-parents-detect-early-signs-eye-disorders-children) · [Purdue anemia app](https://www.purdue.edu/newsroom/releases/2020/Q2/smartphone-app-to-help-assess-anemia-by-taking-a-picture-of-a-persons-eyelid.html) · [Optica release](https://www.optica.org/about/newsroom/news_releases/2020/new_mobile_health_tool_measures_hemoglobin_without_drawing_blood/) · [HemaChrome NIH](https://www.managedhealthcareexecutive.com/view/app-that-uses-eyelid-photos-to-assess-blood-hemoglobin-advances-in-nih-challenge) · [Brown anemia (EurekAlert)](https://www.eurekalert.org/news-releases/671958) · [Thyroid 6-phone study](https://journals.sagepub.com/doi/full/10.1089/thy.2023.0621) · [IDS/Eye-YOLO BMC Med 2026](https://link.springer.com/article/10.1186/s12916-026-04905-w) · [Portable slit-light AI (Sci Rep 2026)](https://www.nature.com/articles/s41598-026-44392-w) · [CaT ocular tumors](https://www.ophthalmologytimes.com/view/self-screening-ocular-surface-malignancies-smartphone) · [Google external eye HbA1c](https://research.google/blog/detecting-novel-systemic-biomarkers-in-external-eye-photos/)
- Pupil: [PupilScreen](https://ubicomplab.cs.washington.edu/publications/pupilscreen/) · [TBI pupillometry curves (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9283953/) · [UCSD at-home pupillometry (CHI)](https://dl.acm.org/doi/fullHtml/10.1145/3491102.3502493) · [Far-red fair pupillometry](https://www.nature.com/articles/s41598-023-40796-0) · [SmartPLR](https://pmc.ncbi.nlm.nih.gov/articles/PMC12613743/) · [PuRe score](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11037402/) · [Neurodegenerative pilot](https://www.neurology.org/doi/10.1212/WNL.0000000000205619)
- Student projects and datasets: [Eyeagnosis (IEEE Spectrum)](https://spectrum.ieee.org/amp/teenage-whiz-kid-invents-an-ai-system-to-diagnose-her-grandfathers-eye-disease-2650275943) · [APTOS 2019](https://asiateleophth.org/?p=1297)
- Bias: [Fairness in DR AI (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11182262/) · [Retinal pigment score](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11696055/) · [EyePACS skin-tone experiment](https://arxiv.org/pdf/2004.13515v3)

## Datasets and feasibility (2026-10-19)
- [Mendeley: Eye Diseases Classification + Symptoms (Bitto & Ahmed)](https://data.mendeley.com/datasets/n9zp473wfw/1) · [Mendeley: Eye Conjunctiva Segmentation](https://data.mendeley.com/datasets/yxwjgcndg2/1) · [Mendeley: Eye Disease Image Dataset (fundus)](https://data.mendeley.com/datasets/s9bfhswzjb/1) · [Mendeley: neonatal jaundice skin](https://data.mendeley.com/datasets/yfsz6c36vc/1)
- [Kaggle: jaundice image data](https://www.kaggle.com/datasets/aiolapo/jaundice-image-data) · [Kaggle: STRABISMUS](https://www.kaggle.com/datasets/ananthamoorthya/strabismus) · [Kaggle: Eye Disease Dataset](https://www.kaggle.com/datasets/tejpal123/eye-disease-dataset)
- [KidsVisionCheck red-reflex (arXiv)](https://arxiv.org/html/2509.09808v1) · [Smartphone cataract grading (MDPI 2025)](https://www.mdpi.com/2076-3417/16/12/5844) · [Red-eye triage DL + LLM](https://www.researchgate.net/publication/404395659_Integrating_Deep_Learning_and_Large_Language_Models_for_Community-Based_Triage_of_Red_Eye_Diseases) · [Smartphone red-eye grading](https://dl.acm.org/doi/10.1145/3718491.3718554)
- [Pterygium smartphone, Brazil](https://www.scielo.br/j/abo/a/Rm7TzypkkZJqDYdfhtxPzMt/?lang=en) · [SLID slit-lamp dataset](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12832839/) · [SUSTech-SYSU corneal ulcers](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6971241/) · [Smartphone keratitis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11825435/)
- Ptosis: [Smartphone eyelid measurements](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8538024/) · [AutoPtosis](https://arxiv.org/pdf/2106.03905) · [Palpebral margin DL](https://pmc.ncbi.nlm.nih.gov/articles/PMC12015312/)
- Arcus: [Amini & Ameri 2020](https://jbpe.sums.ac.ir/article_46594.html) · [Abdul Halim IJEECS](https://ijeecs.iaescore.com/index.php/IJEECS/article/view/29568)
- Blink / dry eye: [EyeScore](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10607458/) · [Clinically validated blink app (arXiv 2025)](https://arxiv.org/pdf/2511.14361) · [Thai dry-eye app (JMIR)](https://mhealth.jmir.org/2022/6/e31011)
- Leukocoria: [CRADLE 7,000-photo study (PLOS ONE)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3813630/figure/pone-0076677-g002) · [IEEE Spectrum](https://spectrum.ieee.org/app-detects-eye-disease-in-personal-photos)

## Jacksonville
- [Action News Jax: tracking student athletes' concussions](https://www.actionnewsjax.com/news/investigates/action-news-jax-investigates-tracking-student-athletes-concussions/873375494)

## Samsung accessibility
- [11 things about Samsung accessibility](https://news.samsung.com/us/11-things-know-samsung-accessibility-features/) · [SeeColors](https://ifa-berlin.com/news/samsung-pursues-accessibility-new-seecolors-feature-colour-blind-users)

---

# Jacksonville: local context and routes to care

Historical Duval diabetes disparities, local care-navigation resources, and evidence still needed for a community pilot.

## Diabetes disparities: keep the date attached
A [2010 CDC-published study of Duval County](https://www.cdc.gov/pcd/issues/2010/sep/09_0197.htm) used **2007 data**. It found approximately twice the rate of diabetes-related illness and death in the urban core compared with other areas of the county. This is historical context, not a current prevalence estimate or a finding about ZIP 32209 alone.

## Turning awareness into access
[JaxCareConnect](https://jaxcareconnect.org/) helps eligible uninsured Duval County adults connect with primary care. Its listed eligibility includes ages 18–64, Duval residency, no health insurance, and income limits. Eligibility and available services should be checked directly; Iris has no confirmed partnership.

## Other local research leads
- [Vision Is Priceless](https://visionispriceless.org/) is a local vision-care organization to learn from when exploring screening and follow-up.
- An [Action News Jax investigation about student concussion tracking](https://www.actionnewsjax.com/news/investigates/action-news-jax-investigates-tracking-student-athletes-concussions/873375494) informed an earlier youth-sports direction. It is background reporting, not evidence that Iris can identify concussion.
- School-screening follow-through numbers in the early brainstorm still need their original reports. They should not be described as current Jacksonville measurements without those sources.

## What a local pilot would need to establish
Interview residents and healthcare workers, identify barriers to care, test whether capture instructions are understandable, and measure whether participants can reach appropriate care resources. Separately evaluate repeatability, phone compatibility, and condition-specific performance with clinical oversight. A community demo is not evidence of diagnostic accuracy.

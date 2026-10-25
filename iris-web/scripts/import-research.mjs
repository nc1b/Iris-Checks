import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const vault = process.argv[2];
if (!vault) throw new Error('Pass the path to the Samsung research vault.');
const root = fileURLToPath(new URL('../', import.meta.url));

const definitions = [
  ['three-checks', 'Ideas/Three-Check Idea - Diabetes, Glaucoma, Cataract.md', 'The three-check research plan', 'Three checks', 'The science, proposed capture method, limits, and pilot plan for diabetes, glaucoma, and cataracts.', false, ['The idea in one sentence', 'Quick comparison', '1. Diabetes', '2. Glaucoma', '3. Cataract', 'Related: the same flash', 'Other conditions', 'How one scan', 'Pilot study plan', 'All sources']],
  ['diabetes-pupil', 'Ideas/Top Idea - Diabetes Pupil Check.md', 'Diabetes and the pupil light reflex', 'Three checks', 'The diabetes pupil-response hypothesis, phone measurement challenges, study design, and source papers.', false, ['How it would work', 'What we\'d test', 'Risks', 'Other original ideas', 'Sources']],
  ['ai-overview', 'Eye Research/AI Eye Scanning/AI Eye Scanning Overview.md', 'AI eye scanning: the overview', 'AI & imaging', 'How retina AI, external-eye photography, and phone pupil measurements fit together.', false],
  ['study-catalog', 'Eye Research/AI Eye Scanning/AI Eye Studies Catalog.md', 'The full AI eye studies catalog', 'AI & imaging', 'Retinal disease, whole-body biomarkers, external-eye images, pupil videos, and vision-screening studies.', false],
  ['how-ai-reads-the-eye', 'Eye Research/AI Eye Scanning/How AI Reads the Eye.md', 'How AI reads the eye', 'Methods & limits', 'Image types, the measurement pipeline, sensitivity, specificity, AUC, and sources of bias.', false],
  ['timeline', 'Eye Research/AI Eye Scanning/AI Eye History Timeline.md', 'A decade of eye AI: 2015–2026', 'AI & imaging', 'The research timeline from EyePACS and early retina models to smartphone screening and pupil tracking.', false],
  ['datasets', 'Ideas/Datasets for Iris.md', 'Datasets, licenses, and camera compatibility', 'Datasets', 'Public image collections, on-request datasets, licensing cautions, and mismatches between clinic and phone images.', false],
  ['projects-products', 'Eye Research/AI Eye Scanning/AI Eye Projects and Products.md', 'Existing products, research apps, and open tools', 'Prior art', 'LumineticsCore, EyeArt, AEYE, BiliScreen, SmartPLR, CRADLE, RETFound, and other precedents.', false],
  ['novelty', 'Ideas/Novelty Check.md', 'Prior art and the novelty search', 'Prior art', 'Related pupil devices, phone apps, patents, alternative signals, and the limits of claiming a first.', false],
  ['lessons', 'Eye Research/AI Eye Scanning/What the Research Means for Iris.md', 'What the research teaches us', 'Methods & limits', 'Lighting, device variation, external validation, fairness, capture quality, and referral follow-through.', false, ['Ten lessons', 'Still to verify']],
  ['feasibility', 'Ideas/Feasibility - What We Can Detect.md', 'Phone-only feasibility across eye conditions', 'Methods & limits', 'An earlier comparison of what a phone can measure, which data are available, and where extra optics are needed.', true, ['Verdict at a glance', 'What makes it hard']],
  ['multiple-conditions', 'Ideas/Multi-Condition Check - Decision.md', 'Why multiple checks need separate validation', 'Methods & limits', 'The earlier scope comparison and the correction explaining why separate-eye lighting is necessary.', true, ['The four candidates', 'Why not check for everything', 'Evidence check']],
  ['eye-health-needs', 'Eye Research/Eye Problem Space.md', 'Eye-health needs and access to care', 'Community & hardware', 'School vision follow-up, digital eye strain, myopia, missed eye exams, and eye-gaze accessibility.', true],
  ['existing-solutions', 'Eye Research/Existing Solutions and Prior Art.md', 'Screening and accessibility precedents', 'Prior art', 'Photoscreeners, retinal AI, eye-gaze communication, blink reminders, and reading-distance tools.', true],
  ['phone-hardware', 'Eye Research/Samsung Tech Hooks.md', 'Phone hardware and accessibility', 'Community & hardware', 'Camera and screen-light capabilities, screen readers, low-vision modes, and possible tablet use.', false],
  ['sickle-cell', 'Ideas/Top Idea - Sickle Cell Eye Tracker.md', 'Earlier direction: sickle-cell eye tracking', 'Prior art', 'The earlier exploration of personal-baseline sclera and eyelid color, related anemia research, and local clinical resources.', true, ['How it works', 'Why the "personal baseline"', 'What\'s hard', 'Community and partner leads', 'Facts to double-check', 'Sources']],
  ['source-directory', 'Sources.md', 'The collected research sources', 'AI & imaging', 'The source lists for eye health, AI, datasets, phone measurements, accessibility, and Jacksonville background.', false],
];

const slugByTitle = new Map(definitions.map(([id, path]) => [path.split('/').at(-1).replace(/\.md$/, ''), id]));

function selectSections(markdown, headings) {
  if (!headings) return markdown;
  return markdown.split(/(?=^## )/m).filter(block => headings.some(heading => block.startsWith(`## ${heading}`))).join('\n');
}

function clean(markdown, id, headings) {
  let text = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/\r\n/g, '\n');
  if (id === 'source-directory') {
    text = text.split(/(?=^## )/m).filter(block => /^## (Eye health|AI eye research|Datasets|Jacksonville|Samsung accessibility)/.test(block)).join('\n');
    text = text.replace(/Students and competitions:/g, 'Student projects and datasets:');
  }
  text = selectSections(text, headings);
  text = text.split('\n').filter(line => !/^# |^Back to |^Related:|^> \*\*Status:|^> \*\*Newer:/.test(line))
    .filter(line => !/judg|hackathon|\bSFT\b|Solve for Tomorrow|\bcompetition\b|\bcontest\b|\bpitch\b|\bdeadlines?\b|Already in the code|Where it is in the code|Samsung and MIT/i.test(line))
    .join('\n');
  text = text.replace(/### Patent note[\s\S]*?(?=\n## |$)/g, '')
    .replace(/## What nobody has done yet \(our gap\)[\s\S]*?(?=\n## |$)/g, '')
    .replace(/## Notes[\s\S]*?(?=\n## |$)/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, title, label) => slugByTitle.has(title) ? `[${label || title}](/research#note-${slugByTitle.get(title)})` : (label || title))
    .replace(/✅/g, '').replace(/⚠️/g, 'Needs verification:').replace(/👉|⭐|🏆|💡|📧/gu, '')
    .replace(/\*\*Local angle \(optional\)\*\*/g, '**Local context**')
    .replace(/\*\*GO: flagship body-health check\*\*/g, 'Earlier candidate; needs validation')
    .replace(/Iris lives in the bottom two rows/g, 'Iris explores the bottom two image types')
    .replace(/People with SCD \*\*always\*\* have some jaundice and anemia/g, 'People with SCD can have chronic anemia and jaundice, with substantial variation between people')
    .replace(/The \*\*retina\*\* \(back of the eye\) grows from the same tissue as the \*\*brain\*\* during development\. It is the only place in the body where doctors can \*\*directly see blood vessels and nerve tissue\*\* without cutting\./g, 'The **retina** (back of the eye) is neural tissue and allows doctors to inspect small blood vessels and nerve tissue using eye-imaging equipment.')
    .replace(/MediaPipe Iris \/ Face Landmarker\*\* \(Google\): real-time iris and pupil landmarks in the browser/g, 'MediaPipe Iris / Face Landmarker** (Google): iris and face landmarks in the browser; measuring the pupil requires an additional method')
    .replace(/No one has shown how well a phone (?:version works|does this)\./g, 'The collected notes do not establish how well the Iris phone method performs.')
    .replace(/One short phone scan \(camera \+ screen light \+ a few flashes, no extra hardware\) gives \*\*three results\*\*/g, 'The proposed phone capture flow (camera and screen light, without an attachment) is intended to support **three research checks**')
    .replace(/\*\*No one has shown how well a phone does this\.\*\*/g, '**The Iris phone method still needs validation.**')
    .replace(/These are our own starter numbers and need pilot data\./g, 'These are team-set experimental placeholders, not clinical cutoffs.')
    .replace(/- \*\*Regulation\.\*\*[^\n]+/g, '- **Clinical evaluation.** A research prototype needs appropriate validation before it can support care decisions.')
    .replace(/- \*\*Pupil reflex:\*\* personal baseline/g, '- **Pupil reflex:** a personal baseline can support repeatability research, but disease-related claims still need clinically labelled comparison data.')
    .replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

  const notes = {
    'three-checks': '> Current research scope: diabetes, glaucoma, and cataracts. All three are in development. Study results below describe other systems; they are not clinical accuracy results for Iris. A typical result cannot rule out disease.\n\n',
    'diabetes-pupil': '> Research question: can an ordinary phone measure pupil-response differences that published studies associate with diabetes? Blood tests establish diabetes status; a phone pupil result cannot confirm or rule it out.\n\n',
    'study-catalog': '> This is the full working catalog recorded in the research notes. Numerical results describe individual source studies, using different cameras, populations, and protocols. Items marked “Needs verification” remain research leads.\n\n',
    'feasibility': '> Earlier exploration, before the current three-check scope. Recommendations in this table are historical research notes. Retinal glaucoma imaging requires specialized optics; the separate-eye pupil-response hypothesis is a different, unvalidated approach.\n\n',
    'multiple-conditions': '> Earlier scope comparison. The current project includes diabetes, glaucoma, and cataract research. The important correction is that comparing afferent responses requires lighting each eye separately; one shared flash cannot isolate the signal from each eye.\n\n',
    'eye-health-needs': '> Background needs assessment. Several figures are older estimates or secondary-source leads and should be checked against their original population and date before reuse. These figures are not measurements of Jacksonville residents.\n\n',
    'sickle-cell': '> Archived research direction, outside the current three checks. Color changes alone do not establish a sickle-cell crisis. The proposal would require clinical validation and cannot replace a person’s care plan.\n\n',
    'phone-hardware': '> Hardware and accessibility possibilities, not implemented integrations or endorsements. Device capabilities and software availability need checking on each supported phone.\n\n',
    'novelty': '> Prior-art search recorded October 19, 2026. Failure to find a project does not prove it has never been done. Patents describe claims and proposed methods; they do not establish clinical effectiveness.\n\n',
    'projects-products': '> Products, prototypes, and research tools have different hardware and evidence requirements. Regulatory descriptions are historical notes, not a current clearance review. They do not apply to Iris.\n\n',
  };
  return (notes[id] || '') + text;
}

const documents = [];
for (const [id, path, title, category, description, archived, headings] of definitions) {
  const raw = await readFile(resolve(vault, path), 'utf8');
  const updated = raw.match(/^updated:\s*(.+)$/m)?.[1].trim() || '2026-10-21';
  const markdown = clean(raw, id, headings);
  if (!markdown.trim()) throw new Error(`Empty research export: ${id}`);
  const searchText = [...new Set(`${title} ${description} ${markdown}`.toLowerCase().match(/[\p{L}\p{N}.-]+/gu))].join(' ');
  documents.push({ id, title, category, description, archived, updated, markdown, searchText });
}

const localContext = {
  id: 'jacksonville-context',
  title: 'Jacksonville: local context and routes to care',
  category: 'Community & hardware',
  description: 'Historical Duval diabetes disparities, local care-navigation resources, and evidence still needed for a community pilot.',
  archived: false,
  updated: '2026-10-21',
  markdown: `## Diabetes disparities: keep the date attached
A [2010 CDC-published study of Duval County](https://www.cdc.gov/pcd/issues/2010/sep/09_0197.htm) used **2007 data**. It found approximately twice the rate of diabetes-related illness and death in the urban core compared with other areas of the county. This is historical context, not a current prevalence estimate or a finding about ZIP 32209 alone.

## Turning awareness into access
[JaxCareConnect](https://jaxcareconnect.org/) helps eligible uninsured Duval County adults connect with primary care. Its listed eligibility includes ages 18–64, Duval residency, no health insurance, and income limits. Eligibility and available services should be checked directly; Iris has no confirmed partnership.

## Other local research leads
- [Vision Is Priceless](https://visionispriceless.org/) is a local vision-care organization to learn from when exploring screening and follow-up.
- An [Action News Jax investigation about student concussion tracking](https://www.actionnewsjax.com/news/investigates/action-news-jax-investigates-tracking-student-athletes-concussions/873375494) informed an earlier youth-sports direction. It is background reporting, not evidence that Iris can identify concussion.
- School-screening follow-through numbers in the early brainstorm still need their original reports. They should not be described as current Jacksonville measurements without those sources.

## What a local pilot would need to establish
Interview residents and healthcare workers, identify barriers to care, test whether capture instructions are understandable, and measure whether participants can reach appropriate care resources. Separately evaluate repeatability, phone compatibility, and condition-specific performance with clinical oversight. A community demo is not evidence of diagnostic accuracy.`,
};
documents.push({ ...localContext, searchText: `${localContext.title} ${localContext.description} ${localContext.markdown}`.toLowerCase() });

function kindFor(url) {
  if (/patents\.google|uspto\.gov/.test(url)) return 'Patent';
  if (/clinicaltrials\.gov/.test(url)) return 'Trial registry';
  if (/kaggle\.com\/datasets|data\.mendeley|ieee-dataport/.test(url)) return 'Dataset';
  if (/arxiv\.org|medrxiv\.org/.test(url)) return 'Preprint';
  if (/escrs\.org|confex\.com|e-poster|Supplement|neurology\.org\/doi\/10\.1212\/WNL\.0000000000205619/.test(url)) return 'Conference or abstract';
  if (/pubmed|pmc\.ncbi|ncbi\.nlm|nature\.com|springer\.com|sciencedirect|jamanetwork|frontiersin|journals\.|wiley|mdpi|academic\.oup|cureus|ahajournals|dl\.acm/.test(url)) return 'Paper or article';
  return 'Background or project';
}

const sourceMap = new Map();
for (const document of documents) {
  for (const match of document.markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)) {
    const label = match[1].replace(/\*+/g, '').trim();
    const url = match[2];
    const key = url.replace('www.ncbi.nlm.nih.gov/pmc/articles/', 'pmc.ncbi.nlm.nih.gov/articles/').replace(/\/$/, '');
    const existing = sourceMap.get(key);
    if (existing) {
      if (!existing.categories.includes(document.category)) existing.categories.push(document.category);
      if (!existing.noteIds.includes(document.id)) existing.noteIds.push(document.id);
      if (existing.title.length < 12 && label.length > existing.title.length) existing.title = label;
    } else {
      const generic = /^(link|paper|kaggle|ieee|pubmed|pmc(?: copy)?|wiley|mendeley)$/i.test(label);
      const line = document.markdown.slice(0, match.index).split('\n').at(-1) || '';
      const context = line.replace(/^[|\s-]+/, '').split('|')[0].replace(/\*+/g, '').replace(/\[[^\]]*$/, '').trim();
      sourceMap.set(key, { id: `source-${sourceMap.size + 1}`, title: generic && context.length > 3 ? `${context.slice(0, 95)} · ${label}` : label, url, domain: new URL(url).hostname.replace(/^www\./, ''), kind: kindFor(url), categories: [document.category], noteIds: [document.id] });
    }
  }
}

const sources = [...sourceMap.values()].sort((a, b) => a.title.localeCompare(b.title));
const notebook = { updated: '2026-10-21', documents, sources };
await mkdir(resolve(root, 'data'), { recursive: true });
await mkdir(resolve(root, 'public/research'), { recursive: true });
await writeFile(resolve(root, 'data/research-notebook.json'), `${JSON.stringify(notebook, null, 2)}\n`);
await writeFile(resolve(root, 'public/research/iris-research-notebook.md'), `# Iris research notebook\n\nUpdated October 21, 2026.\n\nWorking research notes and source leads. Published numbers describe their original studies, not Iris. Earlier directions and unresolved evidence are labelled.\n\n${documents.map(document => `# ${document.title}\n\n${document.description}\n\n${document.markdown}`).join('\n\n---\n\n')}\n`);
console.log(JSON.stringify({ documents: documents.length, sources: sources.length, categories: [...new Set(documents.map(document => document.category))], output: 'data/research-notebook.json' }, null, 2));

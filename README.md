# gracebrockenbrough.com

Personal professional site. One page, no build step, no dependencies. Open `index.html` in a
browser to preview.

The page leads with wealth management and accounting: hero, then **Experience** (Bessemer Trust,
Morgan Stanley), then **Education, skills & leadership**, then **Coursework** — the Sysco and
Netflix models, framed as samples of the technical groundwork rather than the main event — then
contact. Sysco stays a full worked example because the sensitivity grid is the one thing a
recruiter cannot get from a resume; Netflix is a compact entry.

```
index.html                 the entire site (HTML + CSS + JS)
assets/
  Grace-Brockenbrough-Resume.pdf
  Sysco-Valuation-Writeup.pdf
  Sysco-Stock-Pitch.pdf
  Sysco-Model.xlsx
  Netflix-Forecast-Model.xlsx
  headshot.jpg
```

## Launch checklist

All three pre-publication items are done. What changed, so it can be reversed if any call was wrong:

**1. Excel files scrubbed.** Both workbooks were checked tab by tab. No hidden tabs and no cell
comments, but the following was removed:

- `Sysco-Model.xlsx` — stray notes (`fix`, `*WHICH DEP DO I USE?`, `annual report says adjusted
  EPS of 4.46 which is higher`, `why is cash for fisical vs calendar year so different`, a stray
  `l`); two `#REF!` errors on the Sysco row of the Comparables tab; the `Attempt 1:` label on the
  WACC tab, relabelled `Pre-Acquisition WACC`.
- **External links.** The workbook linked to two other files and exposed their full paths — a
  OneDrive account identifier and a classmate's desktop folder — along with the name of the course
  template the model started from. Anyone could see this via Data → Edit Links. Removed. Only one
  cell depended on them (`WACC!F37`, the 23% tax rate), now a literal, so no computed value
  changed.
- `Netflix-Forecast-Model.xlsx` — unresolved notes (`????`, `??`, `**what am I depreciating`,
  `or stock comp amount?`) and three cells containing the assignment prompt itself. Working
  assumption notes ("Assume average historical data", "MGMT guidence, assume $17 billion") were
  kept — those are the model showing its reasoning, which is the point.
- Both files also recorded the local folder they were saved from, and the Netflix workbook was
  still authored by the professor whose template it started from. Both removed.

Verified: zero numeric cells changed in either workbook, and all charts, images and formatting
are intact. The edits were made directly in the file's XML rather than by re-saving, because
re-saving through a library would have destroyed the charts.

**2. Sysco deck kept, labelled as team work.** The deck is a group project with Annie Jennings and
Rose Beall, and its numbers (6.67% WACC, $85.79–$95.54) come from an earlier pass. Rather than
restate two classmates' shared work under revised figures, the link is now labelled **Team
project** and says plainly that the independent write-up and model supersede its target.

**3. Résumé.** The home address and cell number are gone. Note the source changed: the PDF in the
repo was the older high-school résumé (address, phone, AP coursework). The current résumé only
existed as `.docx`, so the published PDF is built from that — Bessemer Trust, Morgan Stanley,
3.90 GPA — with the phone number removed. Verified: no trace of the address or number in the
PDF's text or raw bytes.

## Two things still worth your attention

- **Git history.** The old résumé — home address and cell number — is still in commit `481d795`.
  Removing the file from the current tree does not remove it from history, so if this repo is
  made public, that PDF is retrievable. Either publish from a fresh repo with no history, or keep
  this one private and deploy the built output separately.
- **The résumé runs to 1.1 pages** — about 64 words spill onto page two, which reads badly in
  finance recruiting. Margins are already tight (0.35" / 0.75") and widening them doesn't recover
  it, so it needs a content trim. That's an editorial call, so it was left alone.

Smaller notes: the headshot was a HEIC file named `.jpg`, which Chrome and Firefox cannot display
— it is now a real JPEG, cropped from the better colonnade photo, with camera metadata stripped.
The write-up says 478.18M shares outstanding while the model uses 478.93M; the per-share figures
follow the write-up. And the site currently has two case studies — the Investments Trading Project
is a natural third, though it is group work and the portfolio underperformed its benchmark, so
whether the candid post-mortem helps or hurts is your call.

Raw source files were removed from the repo root, because GitHub Pages serves everything in the
branch and that included the résumé with the address on it. They are all still in git:
`git checkout 481d795 -- "<filename>"`.

## Deploying

**GitHub Pages** — free, and the URL looks fine.

```bash
git init && git add -A && git commit -m "Personal site"
gh repo create gracebrockenbrough --public --source=. --push
# then: repo Settings → Pages → Deploy from branch → main → / (root)
```

**Netlify** — drag this folder onto app.netlify.com/drop. Live in ten seconds.

**Custom domain** — buy `gracebrockenbrough.com`, point an ALIAS/CNAME at your host, add a `CNAME`
file containing the domain if you're on Pages.

## Design notes

Navy `#0A1B33`, bone `#F1EFE9`, brass `#9C7C38`. Fraunces for display, Inter for body, IBM Plex
Mono for data and labels — mono because that's the native register of a tearsheet, and it keeps
the numbers from reading as decoration.

The hero is built as a security tearsheet: name as the instrument, key facts in a right-hand data
rail, and a focus strip naming the four things you actually work on. The signature element is the
live WACC sensitivity grid in the Sysco case study — real numbers from your model, coloured
against the $73.24 market price, hoverable for the implied upside at every cell.

Every figure on the page is generated from `Sysco-Model.xlsx` rather than typed in by hand, and
cross-checked against the write-up.

Accessibility: audited with axe-core at 1440px and 390px — zero violations against WCAG 2.1 AA.
Brass is only used at small sizes in a darkened variant that clears 4.5:1; the grid tints are
capped so the delta text stays legible. Sensitivity cells are keyboard-focusable and each carries
a full spoken label. Keyboard focus states, reduced-motion support, print styles and mobile
layouts are in. No horizontal page scroll from 320px to 1440px — the sensitivity grid scrolls
inside its own container.

## Prompts to use in Claude Code

Open this folder with `claude` and try:

* "Add another coursework entry. Match the compact `.case-compact` block used for Netflix."
* "Expand the Bessemer Trust role into its own case study with a client-scenario walkthrough."
* "Add Open Graph and Twitter card images so the link preview looks right when someone shares it."
* "Run Lighthouse against index.html and fix whatever scores below 95."

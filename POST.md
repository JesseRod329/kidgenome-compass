# Launch Post

I built KidGenome Compass with Codex.

It is a local-first web app that turns a child genetic report into plain-language next steps for parents.

The Google DeepMind angle:

- DeepVariant-style sequencing quality from VCF quality/depth fields
- AlphaMissense-style protein-change signals for missense variants
- AlphaGenome-style regulatory signals for non-coding/regulatory variants

The important part is the safety design. It does not diagnose, recommend treatment, or pretend an AI score is clinical truth. It translates confusing report data into:

- parent-readable variant cards
- a 48-hour clinician action plan
- questions to bring to a genetic counselor
- an adult-onset shield for child reports
- a downloadable clinician handoff

Everything runs in the browser. No DNA upload. No account. No backend.

Demo: https://kidgenome-compass-k9nb9euqn-jesserod329s-projects.vercel.app
GitHub: https://github.com/JesseRod329/kidgenome-compass

I wanted to show Codex building something more serious than a landing page: a polished, privacy-first science interface with real medical safety boundaries.

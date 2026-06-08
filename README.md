# KidGenome Compass

KidGenome Compass is a local-first demo app that turns a child VCF-style genetic report into parent-readable next steps.

It is designed as a science communication interface, not a medical device. The app runs entirely in the browser and does not upload DNA data.

The app uses Google research concepts carefully:

- DeepVariant-style sequencing quality from `QUAL`, `FILTER`, and `DP`
- AlphaMissense-style scores for protein-changing missense variants
- AlphaGenome-style scores for regulatory/non-coding variant signals

It does not diagnose, recommend treatment, or replace genetic counseling.

## What It Does

- Parses simple VCF-style text reports
- Groups variants into parent-friendly action lanes
- Shows protein, regulatory, and sequencing-quality signals
- Generates a 48-hour parent action plan
- Creates questions for a pediatrician or genetic counselor
- Shields adult-onset findings from child action items
- Exports a clinician handoff text file

## Run

Open `index.html` in a browser.

No install step is required.

## Demo

Use **Load demo child report** to populate sample VCF rows, then press **Analyze locally**.

Supported INFO fields:

- `GENE`
- `CONSEQUENCE`
- `CLNSIG`
- `CONDITION`
- `INHERITANCE`
- `PEDIATRIC`
- `AM_SCORE`
- `AG_SCORE`
- `DP`

## Safety Boundary

This prototype is for education and triage only. For child DNA, it avoids medical certainty and frames output as clinician questions. Adult-onset findings should not be treated as parenting action items unless a clinician ordered that review.

## Research References

- AlphaMissense, Google DeepMind: https://deepmind.google/research/projects/alphamissense/
- AlphaGenome, Google DeepMind: https://deepmind.google/blog/alphagenome-ai-for-better-understanding-the-genome/
- DeepVariant, Google: https://github.com/google/deepvariant
- CDC genetic testing guidance: https://www.cdc.gov/genomics-and-health/counseling-testing/genetic-testing.html

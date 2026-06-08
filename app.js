const demoReport = `##fileformat=VCFv4.2
##source=KidGenome Compass demo data, not a real child report
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
7	117559593	rs113993960	G	A	99	PASS	GENE=CFTR;CONSEQUENCE=missense;AM_SCORE=0.93;CLNSIG=Pathogenic;INHERITANCE=autosomal_recessive;PEDIATRIC=high;CONDITION=Cystic fibrosis related variant;DP=42
11	5227002	rs334	A	T	92	PASS	GENE=HBB;CONSEQUENCE=missense;AM_SCORE=0.98;CLNSIG=Pathogenic;INHERITANCE=autosomal_recessive;PEDIATRIC=high;CONDITION=Sickle hemoglobin variant;DP=39
X	154532414	rs1050828	G	A	87	PASS	GENE=G6PD;CONSEQUENCE=missense;AM_SCORE=0.78;CLNSIG=Variable;INHERITANCE=X_linked;PEDIATRIC=moderate;CONDITION=G6PD deficiency sensitivity;DP=31
16	23622000	.	C	T	66	PASS	GENE=HBA2;CONSEQUENCE=regulatory;AG_SCORE=0.71;CLNSIG=Uncertain;INHERITANCE=unknown;PEDIATRIC=moderate;CONDITION=Alpha globin regulation signal;DP=24
13	32316461	rs80357906	A	G	96	PASS	GENE=BRCA2;CONSEQUENCE=missense;AM_SCORE=0.91;CLNSIG=Pathogenic;INHERITANCE=autosomal_dominant;PEDIATRIC=adult;CONDITION=Adult-onset cancer predisposition;ADULT_ONSET=true;DP=36
1	55516888	.	C	G	42	q10	GENE=GENE1;CONSEQUENCE=synonymous;AM_SCORE=0.12;CLNSIG=Benign;INHERITANCE=unknown;PEDIATRIC=low;CONDITION=No known pediatric concern in demo;DP=9`;

const state = {
  variants: [],
  filter: "all",
  threshold: 0.56,
};

const elements = {
  vcfInput: document.querySelector("#vcfInput"),
  fileInput: document.querySelector("#fileInput"),
  loadDemo: document.querySelector("#loadDemo"),
  clearInput: document.querySelector("#clearInput"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  variantList: document.querySelector("#variantList"),
  threshold: document.querySelector("#signalThreshold"),
  thresholdOutput: document.querySelector("#thresholdOutput"),
  childAge: document.querySelector("#childAge"),
  familyHistory: document.querySelector("#familyHistory"),
  adultShield: document.querySelector("#adultShield"),
  summaryTitle: document.querySelector("#summaryTitle"),
  readinessScore: document.querySelector("#readinessScore"),
  doctorCount: document.querySelector("#doctorCount"),
  watchCount: document.querySelector("#watchCount"),
  calmCount: document.querySelector("#calmCount"),
  questionList: document.querySelector("#questionList"),
  copyQuestions: document.querySelector("#copyQuestions"),
  downloadHandoff: document.querySelector("#downloadHandoff"),
  actionPlan: document.querySelector("#actionPlan"),
  dnaRail: document.querySelector("#dnaRail"),
  proteinRail: document.querySelector("#proteinRail"),
  regRail: document.querySelector("#regRail"),
  scoreRing: document.querySelector(".score-ring"),
};

function parseInfo(infoText = "") {
  return infoText.split(";").reduce((acc, entry) => {
    const [rawKey, ...rawValue] = entry.split("=");
    const key = rawKey?.trim();
    if (!key) return acc;
    acc[key.toUpperCase()] = rawValue.join("=").trim() || true;
    return acc;
  }, {});
}

function parseReport(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("##"));

  return lines
    .filter((line) => !line.startsWith("#"))
    .map((line, index) => {
      const cells = line.split(/\t|,\s*|\s{2,}/);
      const [chrom, pos, id, ref, alt, qual, filter, ...rest] = cells;
      const info = parseInfo(rest.join(";"));
      return normalizeVariant({
        index,
        chrom,
        pos,
        id,
        ref,
        alt,
        qual: Number.parseFloat(qual),
        filter: filter || "NA",
        info,
      });
    })
    .filter((variant) => variant.chrom && variant.pos && variant.ref && variant.alt);
}

function normalizeVariant(variant) {
  const info = variant.info;
  const amScore = scoreFrom(info.AM_SCORE ?? info.ALPHAMISSENSE_SCORE);
  const agScore = scoreFrom(info.AG_SCORE ?? info.ALPHAGENOME_SCORE);
  const depth = Number.parseFloat(info.DP ?? info.DEPTH ?? "0");
  const consequence = String(info.CONSEQUENCE ?? "unknown").toLowerCase();
  const clinical = String(info.CLNSIG ?? "unknown");
  const pediatric = String(info.PEDIATRIC ?? "unknown").toLowerCase();
  const adultOnset = String(info.ADULT_ONSET ?? "false").toLowerCase() === "true" || pediatric === "adult";
  const aiScore = Number.isFinite(amScore) ? amScore : Number.isFinite(agScore) ? agScore : 0;
  const qualityScore = qualityFrom(variant.qual, depth, variant.filter);
  const lane = adultOnset && elements.adultShield.checked
    ? "shielded"
    : laneFor({ aiScore, clinical, pediatric, qualityScore, consequence });

  return {
    ...variant,
    gene: info.GENE || "Unknown gene",
    condition: info.CONDITION || "Condition not provided",
    consequence,
    clinical,
    pediatric,
    adultOnset,
    inheritance: String(info.INHERITANCE ?? "not provided").replaceAll("_", " "),
    amScore,
    agScore,
    aiScore,
    qualityScore,
    lane,
    locus: `${variant.chrom}:${variant.pos} ${variant.ref}>${variant.alt}`,
  };
}

function scoreFrom(value) {
  const score = Number.parseFloat(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : Number.NaN;
}

function qualityFrom(qual, depth, filter) {
  let score = 0.35;
  if (Number.isFinite(qual)) score += Math.min(0.4, qual / 250);
  if (Number.isFinite(depth) && depth > 0) score += Math.min(0.25, depth / 120);
  if (String(filter).toUpperCase() === "PASS") score += 0.1;
  if (String(filter).toLowerCase() === "q10") score -= 0.25;
  return Math.max(0, Math.min(1, score));
}

function laneFor({ aiScore, clinical, pediatric, qualityScore, consequence }) {
  const hasClinicalConcern = /pathogenic|risk|variable/i.test(clinical) && !/benign/i.test(clinical);
  const highPediatric = pediatric === "high";
  const moderatePediatric = pediatric === "moderate";
  const highAi = aiScore >= state.threshold;
  const regulatoryConcern = consequence.includes("regulatory") && highAi;

  if (qualityScore < 0.42) return "watch";
  if ((highPediatric && (hasClinicalConcern || highAi)) || regulatoryConcern) return "doctor";
  if (moderatePediatric || hasClinicalConcern || aiScore >= 0.34) return "watch";
  return "calm";
}

function alphaMissenseLabel(score) {
  if (!Number.isFinite(score)) return "not provided";
  if (score < 0.34) return "likely benign signal";
  if (score <= 0.564) return "ambiguous signal";
  return "likely pathogenic signal";
}

function alphaGenomeLabel(score) {
  if (!Number.isFinite(score)) return "not provided";
  if (score >= 0.7) return "strong regulatory signal";
  if (score >= 0.4) return "moderate regulatory signal";
  return "low regulatory signal";
}

function laneLabel(lane) {
  return {
    doctor: "clinician soon",
    watch: "watch or clarify",
    calm: "low signal",
    shielded: "adult-onset shield",
  }[lane];
}

function nextStepFor(variant) {
  if (variant.lane === "doctor") {
    return `Ask whether ${variant.gene} should be confirmed with a clinical-grade test and whether parents should be tested for inheritance.`;
  }
  if (variant.lane === "watch") {
    return `Ask whether this finding is relevant to childhood care, symptoms, ancestry, family history, or medication precautions.`;
  }
  if (variant.lane === "shielded") {
    return "Keep hidden from parent action items unless a clinician ordered adult-onset review for this child.";
  }
  return "Keep this as background information. Do not change care from this result alone.";
}

function explainVariant(variant) {
  const aiPart = Number.isFinite(variant.amScore)
    ? `AlphaMissense marks the protein change as ${alphaMissenseLabel(variant.amScore)}.`
    : Number.isFinite(variant.agScore)
      ? `AlphaGenome-style scoring marks this regulatory change as ${alphaGenomeLabel(variant.agScore)}.`
      : "No Google-style AI effect score was provided.";

  const qualityPart = variant.qualityScore < 0.42
    ? "The sequencing quality signal is weak, so confirmation matters first."
    : "The sequencing quality signal is usable for review.";

  return `${variant.gene} is listed with ${variant.condition}. ${aiPart} ${qualityPart}`;
}

function analyze() {
  state.variants = parseReport(elements.vcfInput.value);
  render();
}

function render() {
  const variants = state.variants;
  const counts = {
    doctor: variants.filter((variant) => variant.lane === "doctor").length,
    watch: variants.filter((variant) => variant.lane === "watch").length,
    calm: variants.filter((variant) => variant.lane === "calm" || variant.lane === "shielded").length,
  };
  const readiness = variants.length
    ? Math.round(((counts.doctor * 36 + counts.watch * 18 + variants.length * 7) / Math.max(1, variants.length)) * 1.6)
    : 0;

  elements.summaryTitle.textContent = variants.length
    ? `${variants.length} variants parsed`
    : "No report loaded";
  elements.doctorCount.textContent = counts.doctor;
  elements.watchCount.textContent = counts.watch;
  elements.calmCount.textContent = counts.calm;
  elements.readinessScore.textContent = Math.min(100, readiness);
  elements.scoreRing.style.setProperty("--score-angle", `${Math.min(100, readiness) * 3.6}deg`);

  const filtered = state.filter === "all"
    ? variants
    : variants.filter((variant) => state.filter === "calm" ? variant.lane === "calm" || variant.lane === "shielded" : variant.lane === state.filter);

  elements.variantList.innerHTML = filtered.length
    ? filtered.map(renderVariantCard).join("")
    : `<div class="empty-state">Paste a report or load the demo to see parent-readable variant cards.</div>`;

  renderQuestions(variants);
  renderActionPlan(variants, counts);
  renderMolecularMap(variants);
}

function renderVariantCard(variant) {
  if (variant.lane === "shielded") {
    return `
      <article class="variant-card shield-card">
        <div class="variant-top">
          <div class="variant-title">
            <strong>Adult-onset finding shielded</strong>
            <span>Details are withheld from parent action mode. Ask a genetic counselor whether this should be discussed now or deferred.</span>
          </div>
          <span class="badge shielded">${laneLabel(variant.lane)}</span>
        </div>
        <p class="explain">Childhood care should focus on pediatric findings unless a clinician specifically ordered adult-onset review.</p>
        <p class="next-step">${escapeHtml(nextStepFor(variant))}</p>
      </article>
    `;
  }

  const amText = Number.isFinite(variant.amScore) ? variant.amScore.toFixed(3) : "NA";
  const agText = Number.isFinite(variant.agScore) ? variant.agScore.toFixed(3) : "NA";
  const qualityText = variant.qualityScore.toFixed(2);
  const aiBar = Number.isFinite(variant.amScore) ? variant.amScore : Number.isFinite(variant.agScore) ? variant.agScore : 0;

  return `
    <article class="variant-card">
      <div class="variant-top">
        <div class="variant-title">
          <strong>${escapeHtml(variant.gene)}: ${escapeHtml(variant.condition)}</strong>
          <span>${escapeHtml(variant.locus)} · ${escapeHtml(variant.consequence)} · ${escapeHtml(variant.inheritance)}</span>
        </div>
        <span class="badge ${variant.lane}">${laneLabel(variant.lane)}</span>
      </div>
      <div class="signal-row">
        <div class="signal">
          <small>AlphaMissense</small>
          <strong>${amText}</strong>
          <div class="bar"><span style="--bar-width:${Number.isFinite(variant.amScore) ? variant.amScore * 100 : 0}%; --bar-color:${signalColor(variant.amScore)}"></span></div>
        </div>
        <div class="signal">
          <small>AlphaGenome</small>
          <strong>${agText}</strong>
          <div class="bar"><span style="--bar-width:${Number.isFinite(variant.agScore) ? variant.agScore * 100 : 0}%; --bar-color:${signalColor(variant.agScore)}"></span></div>
        </div>
        <div class="signal">
          <small>Call quality</small>
          <strong>${qualityText}</strong>
          <div class="bar"><span style="--bar-width:${variant.qualityScore * 100}%; --bar-color:${variant.qualityScore < 0.42 ? "var(--cranberry)" : "var(--teal)"}"></span></div>
        </div>
      </div>
      <p class="explain">${escapeHtml(explainVariant(variant))}</p>
      <p class="next-step">${escapeHtml(nextStepFor(variant))}</p>
    </article>
  `;
}

function renderMolecularMap(variants) {
  const rails = {
    dna: elements.dnaRail,
    protein: elements.proteinRail,
    reg: elements.regRail,
  };
  Object.values(rails).forEach((rail) => {
    rail.innerHTML = "";
  });

  variants.slice(0, 12).forEach((variant, index) => {
    const lane = variant.consequence.includes("regulatory")
      ? "reg"
      : variant.consequence.includes("missense")
        ? "protein"
        : "dna";
    const dot = document.createElement("span");
    const x = 8 + ((index * 17) % 84);
    const size = 10 + Math.round((variant.aiScore || variant.qualityScore) * 11);
    dot.className = "rail-dot";
    dot.style.setProperty("--x", `${x}%`);
    dot.style.setProperty("--size", `${size}px`);
    dot.style.setProperty("--dot-color", signalColor(variant.aiScore || variant.qualityScore));
    dot.dataset.label = variant.gene;
    rails[lane].appendChild(dot);
  });
}

function renderActionPlan(variants, counts) {
  if (!variants.length) {
    elements.actionPlan.textContent = "Load a report to create a parent-safe action plan.";
    return;
  }

  const age = Number.parseInt(elements.childAge.value, 10);
  const familyHistory = elements.familyHistory.options[elements.familyHistory.selectedIndex].text;
  const shielded = variants.filter((variant) => variant.lane === "shielded").length;
  const lowQuality = variants.filter((variant) => variant.qualityScore < 0.42).length;
  const priorityGenes = variants
    .filter((variant) => variant.lane === "doctor")
    .map((variant) => variant.gene)
    .slice(0, 3)
    .join(", ");

  const steps = [
    {
      title: counts.doctor ? "Schedule a genetics review" : "Keep the report for the next pediatric visit",
      body: counts.doctor
        ? `Bring the report and ask about confirmation for ${priorityGenes || "the flagged genes"}.`
        : "No urgent pediatric action was generated from the parsed demo fields.",
    },
    {
      title: "Separate childhood care from future adult risk",
      body: shielded
        ? `${shielded} adult-onset finding was shielded from the action list. Ask a counselor whether it should be discussed now.`
        : "No adult-onset finding was shielded in the current view.",
    },
    {
      title: "Check context before changing anything",
      body: `Child age: ${Number.isFinite(age) ? age : "not provided"}. Family history: ${familyHistory}. Use symptoms and family history to decide what matters.`,
    },
  ];

  if (lowQuality) {
    steps.push({
      title: "Confirm low-quality calls first",
      body: `${lowQuality} variant call has weak sequencing quality. Treat it as a repeat-or-confirm item, not a conclusion.`,
    });
  }

  elements.actionPlan.innerHTML = steps
    .map((step, index) => `
      <div class="action-step">
        <span>${index + 1}</span>
        <div><strong>${escapeHtml(step.title)}</strong>${escapeHtml(step.body)}</div>
      </div>
    `)
    .join("");
}

function signalColor(score) {
  if (!Number.isFinite(score)) return "rgba(35, 29, 24, 0.16)";
  if (score > 0.7) return "var(--cranberry)";
  if (score >= 0.34) return "var(--gold)";
  return "var(--leaf)";
}

function renderQuestions(variants) {
  const questions = variants.length ? buildQuestions(variants) : ["Load a report to generate clinician questions."];
  elements.questionList.innerHTML = questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("");
}

function buildQuestions(variants) {
  const genes = [...new Set(variants.filter((variant) => variant.lane !== "calm").map((variant) => variant.gene))].slice(0, 4);
  const questions = [
    "Which findings should be confirmed with a clinical-grade test before we act on them?",
    "Are any of these findings relevant during childhood, or should some be deferred until adulthood?",
    "Should parents or siblings be offered cascade testing for any listed genes?",
  ];

  if (genes.length) {
    questions.unshift(`For ${genes.join(", ")}, what symptoms, family history, or medication issues would make this urgent?`);
  }

  if (variants.some((variant) => variant.qualityScore < 0.42)) {
    questions.push("Which low-quality calls should be ignored, repeated, or confirmed by another method?");
  }

  if (variants.some((variant) => variant.lane === "shielded")) {
    questions.push("Should any adult-onset findings be discussed now, or should they be deferred until the child can decide later?");
  }

  return questions;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function copyQuestions() {
  const text = [...elements.questionList.querySelectorAll("li")]
    .map((item, index) => `${index + 1}. ${item.textContent}`)
    .join("\n");
  navigator.clipboard?.writeText(text);
  elements.copyQuestions.textContent = "Copied";
  window.setTimeout(() => {
    elements.copyQuestions.textContent = "Copy";
  }, 1200);
}

function buildHandoff() {
  const variants = state.variants;
  const lines = [
    "KidGenome Compass clinician handoff",
    `Generated: ${new Date().toLocaleString()}`,
    `Child age: ${elements.childAge.value || "not provided"}`,
    `Family history: ${elements.familyHistory.options[elements.familyHistory.selectedIndex].text}`,
    "",
    "Safety note: This is not a diagnosis. It is a parent-facing triage summary from a local prototype.",
    "",
    "Flagged variants:",
    ...variants.map((variant) => (
      `- ${variant.gene} ${variant.locus}: ${variant.condition}; lane=${laneLabel(variant.lane)}; clinical=${variant.clinical}; AM=${Number.isFinite(variant.amScore) ? variant.amScore.toFixed(3) : "NA"}; AG=${Number.isFinite(variant.agScore) ? variant.agScore.toFixed(3) : "NA"}; quality=${variant.qualityScore.toFixed(2)}`
    )),
    "",
    "Questions:",
    ...buildQuestions(variants).map((question, index) => `${index + 1}. ${question}`),
  ];
  return lines.join("\n");
}

function downloadHandoff() {
  const blob = new Blob([buildHandoff()], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kidgenome-clinician-handoff.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setupEvents() {
  elements.loadDemo.addEventListener("click", () => {
    elements.vcfInput.value = demoReport;
    analyze();
  });

  elements.analyzeBtn.addEventListener("click", analyze);

  elements.clearInput.addEventListener("click", () => {
    elements.vcfInput.value = "";
    state.variants = [];
    render();
  });

  elements.threshold.addEventListener("input", (event) => {
    state.threshold = Number.parseFloat(event.target.value);
    elements.thresholdOutput.textContent = state.threshold.toFixed(2);
    state.variants = state.variants.map(normalizeVariant);
    render();
  });

  elements.childAge.addEventListener("input", render);
  elements.familyHistory.addEventListener("change", render);
  elements.adultShield.addEventListener("change", () => {
    state.variants = state.variants.map(normalizeVariant);
    render();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((button) => button.classList.remove("active"));
      tab.classList.add("active");
      state.filter = tab.dataset.filter;
      render();
    });
  });

  elements.fileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    elements.vcfInput.value = await file.text();
    analyze();
  });

  elements.copyQuestions.addEventListener("click", copyQuestions);
  elements.downloadHandoff.addEventListener("click", downloadHandoff);
}

function drawHelix() {
  const canvas = document.querySelector("#helixCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fff8ea";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 36; i += 1) {
      const x = 58 + i * 17;
      const phase = i * 0.5 + frame * 0.018;
      const y1 = height / 2 + Math.sin(phase) * 105;
      const y2 = height / 2 + Math.sin(phase + Math.PI) * 105;
      const alpha = 0.34 + Math.cos(phase) * 0.2;

      ctx.strokeStyle = `rgba(8, 127, 122, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();

      ctx.fillStyle = i % 5 === 0 ? "#b43d4b" : "#087f7a";
      ctx.beginPath();
      ctx.arc(x, y1, 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i % 4 === 0 ? "#e7aa2d" : "#597d3f";
      ctx.beginPath();
      ctx.arc(x, y2, 5.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(180, 61, 75, 0.36)";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 80; i += 1) {
      const x = 60 + i * 8;
      const y = 72 + Math.sin(i * 0.34 + frame * 0.02) * 16 + Math.cos(i * 0.11) * 12;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(35, 29, 24, 0.62)";
    ctx.font = "700 18px Avenir Next, sans-serif";
    ctx.fillText("protein signal", 62, 116);
    ctx.fillText("DNA variant report", 430, 344);

    frame += 1;
    window.requestAnimationFrame(draw);
  }

  draw();
}

setupEvents();
render();
drawHelix();

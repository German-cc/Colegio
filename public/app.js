const dropzone = document.querySelector("#upload-form");
const fullscreenHotspot = document.querySelector("#fullscreen-hotspot");
const imageInput = document.querySelector("#image-input");
const descriptionInput = document.querySelector("#description-input");
const analyzeButton = document.querySelector("#analyze-button");
const clearButton = document.querySelector("#clear-button");
const previewCard = document.querySelector("#preview-card");
const previewImage = document.querySelector("#preview-image");
const previewName = document.querySelector("#preview-name");
const uploadStatus = document.querySelector("#upload-status");
const loadingPanel = document.querySelector("#loading-panel");
const resultsPanel = document.querySelector("#results-panel");
const resetButton = document.querySelector("#reset-button");

const fields = {
  category: document.querySelector("#category-label"),
  title: document.querySelector("#object-title"),
  heroStat: document.querySelector("#hero-stat"),
  confidence: document.querySelector("#confidence-score"),
  year: document.querySelector("#object-year"),
  brandModel: document.querySelector("#brand-model"),
  materials: document.querySelector("#materials-list"),
  impact: document.querySelector("#impact-copy"),
  curiosity: document.querySelector("#curiosity-copy"),
  tabContent: document.querySelector("#tab-content"),
  tips: document.querySelector("#tips-list"),
};

let selectedFile = null;
let currentAnalysis = null;
let previewUrl = null;

fullscreenHotspot.addEventListener("click", toggleFullscreen);
dropzone.addEventListener("click", () => imageInput.click());

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragover");
  const [file] = event.dataTransfer.files;
  handleFile(file);
});

imageInput.addEventListener("change", () => {
  const [file] = imageInput.files;
  handleFile(file);
});

descriptionInput.addEventListener("input", syncAnalyzeState);
analyzeButton.addEventListener("click", analyzeSelectedImage);
clearButton.addEventListener("click", clearSelection);
resetButton.addEventListener("click", resetExperience);

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

function handleFile(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setStatus("Elegí un archivo de imagen.", true);
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    setStatus("La imagen supera los 6 MB.", true);
    return;
  }

  selectedFile = file;
  syncAnalyzeState();
  setStatus("Imagen lista para analizar");

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  previewName.textContent = file.name || "Foto desde cámara";
  previewCard.hidden = false;
}

async function analyzeSelectedImage() {
  const description = descriptionInput.value.trim();
  if (!selectedFile && !description) return;

  const formData = new FormData();
  if (selectedFile) formData.append("image", selectedFile);
  if (description) formData.append("description", description);

  setProcessing(true);

  try {
    const response = await fetch("/api/analyze-image", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message || "No se pudo analizar la imagen.");
    }

    currentAnalysis = payload.data;
    renderAnalysis(currentAnalysis);
    setStatus("Ficha generada");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setProcessing(false);
  }
}

function renderAnalysis(analysis) {
  fields.category.textContent = analysis.category;
  fields.title.textContent = analysis.title;
  fields.heroStat.textContent = analysis.heroStat;
  fields.confidence.textContent = `${Math.round(analysis.confidence * 100)}%`;
  fields.year.textContent = analysis.year;
  fields.brandModel.textContent = analysis.brandModel;
  fields.impact.textContent = analysis.environmentalImpact;
  fields.curiosity.textContent = analysis.curiosity;

  fields.materials.innerHTML = "";
  analysis.materials.forEach((material) => {
    const chip = document.createElement("article");
    chip.className = "material-chip";
    chip.innerHTML = `
      <strong>${material.name}</strong>
      <span>${material.estimate}</span>
      <small>${material.risk}</small>
    `;
    fields.materials.append(chip);
  });

  fields.tips.innerHTML = "";
  analysis.tips.forEach((tip) => {
    const item = document.createElement("li");
    item.textContent = tip;
    fields.tips.append(item);
  });

  resultsPanel.hidden = false;
  setActiveTab("history");
  requestAnimationFrame(() => {
    resultsPanel.classList.add("is-visible");
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setActiveTab(tabName) {
  if (!currentAnalysis) return;

  document.querySelectorAll(".tab-button").forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  fields.tabContent.innerHTML = "";

  if (tabName === "recycling") {
    const list = document.createElement("ul");
    list.className = "recycling-list";
    currentAnalysis.recyclingPath.forEach((item) => {
      const row = document.createElement("li");
      row.innerHTML = `<strong>${item.component}</strong><span>${item.destination}</span>`;
      list.append(row);
    });
    fields.tabContent.append(list);
    return;
  }

  const paragraph = document.createElement("p");
  paragraph.textContent = currentAnalysis.tabs[tabName];
  fields.tabContent.append(paragraph);
}

function setProcessing(isProcessing) {
  loadingPanel.hidden = !isProcessing;
  analyzeButton.disabled = isProcessing || (!selectedFile && !descriptionInput.value.trim());
  analyzeButton.querySelector("span").textContent = isProcessing ? "Procesando..." : "Procesar ficha técnica";
  if (isProcessing) {
    resultsPanel.hidden = true;
    resultsPanel.classList.remove("is-visible");
    setStatus("Procesando imagen con IA...");
  }
}

function setStatus(message, isError = false) {
  uploadStatus.textContent = message;
  uploadStatus.style.color = isError ? "#b42318" : "";
}

function clearSelection() {
  selectedFile = null;
  imageInput.value = "";
  syncAnalyzeState();
  previewCard.hidden = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  setStatus("Listo para escanear");
}

function resetExperience() {
  clearSelection();
  descriptionInput.value = "";
  syncAnalyzeState();
  currentAnalysis = null;
  resultsPanel.hidden = true;
  resultsPanel.classList.remove("is-visible");
  loadingPanel.hidden = true;
  dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
}

function syncAnalyzeState() {
  analyzeButton.disabled = !selectedFile && !descriptionInput.value.trim();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  } catch (_error) {
    setStatus("Pantalla completa no disponible en este navegador.", true);
  }
}

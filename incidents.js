(function () {
  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("csvFileInput");
  var selectFileBtn = document.getElementById("selectFileBtn");
  var analyzeBtn = document.getElementById("analyzeBtn");
  var downloadBtn = document.getElementById("downloadCsvBtn");
  var fileName = document.getElementById("fileName");
  var statusMessage = document.getElementById("statusMessage");
  var apiBaseInput = document.getElementById("apiBase");
  var resultsSection = document.getElementById("resultsSection");

  var generalMetrics = document.getElementById("generalMetrics");
  var invalidSummary = document.getElementById("invalidSummary");
  var invalidByType = document.getElementById("invalidByType");
  var invalidByRule = document.getElementById("invalidByRule");
  var categoryBreakdown = document.getElementById("categoryBreakdown");
  var statusBreakdown = document.getElementById("statusBreakdown");
  var satisfactionMetric = document.getElementById("satisfactionMetric");

  if (!dropzone || !fileInput || !analyzeBtn || !downloadBtn || !apiBaseInput) {
    return;
  }

  var selectedFile = null;

  function getApiBaseUrl() {
    return (apiBaseInput.value || "").trim().replace(/\/$/, "");
  }

  function setStatus(message, tone) {
    statusMessage.textContent = message;
    statusMessage.className = "text-sm font-medium";

    if (tone === "error") {
      statusMessage.classList.add("text-red-700");
      return;
    }

    if (tone === "success") {
      statusMessage.classList.add("text-emerald-700");
      return;
    }

    statusMessage.classList.add("text-slate-600");
  }

  function updateSelectedFile(file) {
    selectedFile = file;
    fileName.textContent = file ? "Archivo seleccionado: " + file.name : "Ningun archivo seleccionado";
  }

  function renderKeyValueList(container, data, emptyLabel) {
    container.innerHTML = "";
    var keys = Object.keys(data || {});

    if (keys.length === 0) {
      var emptyItem = document.createElement("li");
      emptyItem.textContent = emptyLabel;
      emptyItem.className = "rounded-md bg-slate-50 px-3 py-2";
      container.appendChild(emptyItem);
      return;
    }

    keys.forEach(function (key) {
      var item = document.createElement("li");
      item.className = "flex items-center justify-between rounded-md bg-slate-50 px-3 py-2";
      item.innerHTML = "<span>" + key + "</span><strong>" + data[key] + "</strong>";
      container.appendChild(item);
    });
  }

  function renderGeneralCards(summary) {
    generalMetrics.innerHTML = "";

    var cards = [
      { label: "Total procesados", value: summary.valid_metrics.total_processed },
      { label: "Registros validos", value: summary.valid_metrics.valid_records },
      { label: "Registros invalidos", value: summary.invalid_summary.invalid_record_count },
      { label: "Columnas detectadas", value: summary.columns.length }
    ];

    cards.forEach(function (card) {
      var article = document.createElement("article");
      article.className = "rounded-xl border border-slate-200 bg-slate-50 p-4";
      article.innerHTML =
        "<p class='text-xs font-semibold uppercase tracking-wide text-slate-500'>" +
        card.label +
        "</p><p class='mt-2 text-2xl font-bold text-slate-900'>" +
        card.value +
        "</p>";
      generalMetrics.appendChild(article);
    });
  }

  function renderSummary(summary) {
    resultsSection.classList.remove("hidden");
    renderGeneralCards(summary);

    var invalidCount = summary.invalid_summary.invalid_record_count;
    if (invalidCount > 0) {
      invalidSummary.textContent =
        "Se detectaron " +
        invalidCount +
        " registros invalidos. Revisa el detalle por tipo y regla para corregir el archivo.";
      invalidSummary.className = "mt-2 text-sm text-amber-700";
    } else {
      invalidSummary.textContent = "No se detectaron registros invalidos en el fichero.";
      invalidSummary.className = "mt-2 text-sm text-emerald-700";
    }

    renderKeyValueList(invalidByType, summary.invalid_summary.problem_type_counts, "Sin problemas detectados");
    renderKeyValueList(invalidByRule, summary.invalid_summary.issue_counts, "Sin reglas incumplidas");
    renderKeyValueList(categoryBreakdown, summary.valid_metrics.category_totals, "Sin categorias validas");
    renderKeyValueList(statusBreakdown, summary.valid_metrics.status_totals, "Sin estados validos");

    if (summary.valid_metrics.closed_satisfaction_mean === null) {
      satisfactionMetric.textContent = "No hay casos cerrados con puntuacion registrada.";
    } else {
      satisfactionMetric.textContent =
        "Satisfaccion media en casos cerrados con puntuacion: " +
        Number(summary.valid_metrics.closed_satisfaction_mean).toFixed(2);
    }
  }

  async function analyzeFile() {
    if (!selectedFile) {
      setStatus("Selecciona un archivo CSV antes de analizar.", "error");
      return;
    }

    var apiBase = getApiBaseUrl();
    if (!apiBase) {
      setStatus("Indica la base URL de la API.", "error");
      return;
    }

    var formData = new FormData();
    formData.append("file", selectedFile);

    analyzeBtn.disabled = true;
    setStatus("Analizando archivo...", "info");

    try {
      var response = await fetch(apiBase + "/api/incidents/analyze", {
        method: "POST",
        body: formData
      });

      var payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "No se pudo analizar el fichero.");
      }

      renderSummary(payload);
      downloadBtn.disabled = false;
      downloadBtn.classList.remove("text-slate-500");
      downloadBtn.classList.add("text-slate-700", "hover:bg-slate-50");
      setStatus("Analisis completado correctamente.", "success");
    } catch (error) {
      setStatus(error.message || "Ocurrio un error inesperado.", "error");
      downloadBtn.disabled = true;
      downloadBtn.classList.add("text-slate-500");
    } finally {
      analyzeBtn.disabled = false;
    }
  }

  async function downloadResultsCsv() {
    var apiBase = getApiBaseUrl();
    if (!apiBase) {
      setStatus("Indica la base URL de la API.", "error");
      return;
    }

    try {
      var response = await fetch(apiBase + "/api/incidents/results/export");
      if (!response.ok) {
        var payload = await response.json();
        throw new Error(payload.detail || "No se pudo descargar el CSV.");
      }

      var blob = await response.blob();
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "results.csv";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setStatus("CSV descargado correctamente.", "success");
    } catch (error) {
      setStatus(error.message || "No se pudo descargar el CSV.", "error");
    }
  }

  selectFileBtn.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    updateSelectedFile(fileInput.files[0] || null);
  });

  dropzone.addEventListener("dragover", function (event) {
    event.preventDefault();
    dropzone.classList.add("border-teal-500", "bg-teal-50");
  });

  dropzone.addEventListener("dragleave", function () {
    dropzone.classList.remove("border-teal-500", "bg-teal-50");
  });

  dropzone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropzone.classList.remove("border-teal-500", "bg-teal-50");

    var file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (!file) {
      return;
    }

    updateSelectedFile(file);
  });

  dropzone.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  analyzeBtn.addEventListener("click", analyzeFile);
  downloadBtn.addEventListener("click", downloadResultsCsv);
})();

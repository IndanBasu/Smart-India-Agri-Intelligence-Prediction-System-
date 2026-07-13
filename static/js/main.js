(function () {
  const form = document.getElementById("intelligence-form");
  if (!form) {
    return;
  }

  let yieldChart = null;
  let priceChart = null;
  let latestUnifiedResult = null;

  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readJsonScript(id, fallbackValue) {
    const node = document.getElementById(id);
    if (!node) {
      return fallbackValue;
    }
    try {
      return JSON.parse(node.textContent || "null");
    } catch {
      return fallbackValue;
    }
  }

  function populateSelect(selectEl, values, placeholder) {
    if (!selectEl) return;
    const list = (Array.isArray(values) ? values : []).filter(
      (x) => String(x ?? "").trim() !== "",
    );
    const prompt = placeholder
      ? `<option value="" selected disabled>${placeholder}</option>`
      : "";
    selectEl.innerHTML =
      prompt +
      list
        .map(
          (x) =>
            `<option value="${String(x).replace(/"/g, "&quot;")}">${x}</option>`,
        )
        .join("");
  }

  function getJsPdfConstructor() {
    if (!window.jspdf) {
      return null;
    }
    return window.jspdf.jsPDF || window.jspdf.default || null;
  }

  function downloadTextFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportNodeAsImage(node, filename) {
    if (!node || !window.html2canvas) {
      alert("Image export is not available right now.");
      return Promise.resolve();
    }

    return window
      .html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      })
      .then((canvas) => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
  }

  function exportNodeAsPdf(node, filename) {
    const PdfCtor = getJsPdfConstructor();
    if (!node || !PdfCtor || !window.html2canvas) {
      alert("PDF export is not available right now.");
      return Promise.resolve();
    }

    return window
      .html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      })
      .then((canvas) => {
        const pdf = new PdfCtor({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
          unit: "pt",
          format: "a4",
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(
          pageWidth / canvas.width,
          pageHeight / canvas.height,
        );
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;
        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          x,
          y,
          width,
          height,
        );
        pdf.save(filename);
      });
  }

  function buildUnifiedCsv(result) {
    const raw = result.raw || {};
    const rows = [
      ["Field", "Value"],
      ["Recommended Crop", result.recommended_crop || ""],
      ["Expected Yield (ton/ha)", result.expected_yield_ton_per_hectare ?? ""],
      [
        "Predicted Price (INR/quintal)",
        result.predicted_price_inr_per_quintal ?? "",
      ],
      ["Best Market", result.best_market || ""],
      ["Estimated Revenue (INR)", result.estimated_revenue_inr ?? ""],
      ["Estimated Profit (INR)", result.estimated_profit_inr ?? ""],
      ["Decision", result.decision_text || ""],
      ["Fusion Confidence", result.model_fusion?.fusion_confidence ?? ""],
      ["Fusion Note", result.model_fusion?.fusion_note || ""],
      [
        "Recommendation Insight",
        raw.recommendation?.estimated_price_per_ton ?? "",
      ],
      ["Yield Insight", raw.yield?.yield_explanation || ""],
      ["Price Insight", raw.price?.price_trend || ""],
    ];

    return rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
  }

  function initCascadingDropdowns() {
    const data = readJsonScript("farmer-dropdown-data", {}) || {};
    const districtsByState = data.districts_by_state || {};
    const marketsByStateDistrict = data.markets_by_state_district || {};

    const stateSelect = document.getElementById("state-select");
    const districtSelect = document.getElementById("district-select");
    const marketSelect = document.getElementById("market-select");

    if (!stateSelect || !districtSelect || !marketSelect) {
      return;
    }

    function districtKey(state, district) {
      return `${state}|||${district}`;
    }

    function refreshDistricts() {
      const state = stateSelect.value || "";
      const districts = state ? districtsByState[state] || [] : [];
      populateSelect(districtSelect, districts);
      refreshMarkets();
    }

    function refreshMarkets() {
      const state = stateSelect.value || "";
      const district = districtSelect.value || "";
      const key = districtKey(state, district);
      const markets =
        state && district ? marketsByStateDistrict[key] || [] : [];
      populateSelect(marketSelect, markets);
    }

    stateSelect.addEventListener("change", refreshDistricts);
    districtSelect.addEventListener("change", refreshMarkets);

    refreshDistricts();
  }

  function renderCharts(payload) {
    const yieldCtx = document.getElementById("yieldChart");
    const priceCtx = document.getElementById("priceChart");
    if (!yieldCtx || !priceCtx || !window.Chart) {
      return;
    }

    const yieldData = payload.yield_chart || { labels: [], values: [] };
    const priceData = payload.price_chart || { labels: [], values: [] };

    if (yieldChart) {
      yieldChart.destroy();
    }
    if (priceChart) {
      priceChart.destroy();
    }

    yieldChart = new window.Chart(yieldCtx, {
      type: "line",
      data: {
        labels: yieldData.labels,
        datasets: [
          {
            label: "Yield (ton/hectare)",
            data: yieldData.values,
            borderColor: "#2f8f4f",
            backgroundColor: "rgba(47, 143, 79, 0.15)",
            fill: true,
            tension: 0.33,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });

    priceChart = new window.Chart(priceCtx, {
      type: "bar",
      data: {
        labels: priceData.labels,
        datasets: [
          {
            label: "Price (INR/quintal)",
            data: priceData.values,
            borderRadius: 8,
            backgroundColor: [
              "#9fd8ab",
              "#88ca9a",
              "#74bc8a",
              "#2f8f4f",
              "#2f8f4f",
              "#2f8f4f",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    if (value === null || value === undefined || value === "") {
      element.textContent = "--";
      return;
    }
    element.textContent = String(value);
  }

  function buildInsightTexts(payload) {
    const raw = payload.raw || {};
    const rec = raw.recommendation || {};
    const yld = raw.yield || {};
    const price = raw.price || {};

    const recommendationInsight = `Recommended crop: ${payload.recommended_crop || "N/A"}. Estimated baseline value: ${rec.estimated_price_per_ton || "N/A"} INR per ton.`;
    const yieldInsight =
      yld.yield_explanation ||
      `Expected yield is ${toNumber(payload.expected_yield_ton_per_hectare, 0).toFixed(2)} tons/hectare.`;
    const priceInsight = `Predicted market price is ${toNumber(payload.predicted_price_inr_per_quintal, 0).toFixed(2)} INR/quintal. Best market: ${payload.best_market || "N/A"}. Trend: ${price.price_trend || "stable"}.`;

    return {
      recommendationInsight,
      yieldInsight,
      priceInsight,
    };
  }

  function renderResult(payload) {
    latestUnifiedResult = payload;
    window.latestUnifiedPrediction = payload;

    ["exportFarmerJpgBtn", "exportFarmerPdfBtn", "exportFarmerCsvBtn"].forEach(
      (id) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.disabled = false;
        }
      },
    );

    setText("recommended_crop", payload.recommended_crop);
    setText(
      "expected_yield",
      toNumber(payload.expected_yield_ton_per_hectare, 0).toFixed(2),
    );
    setText(
      "predicted_price",
      toNumber(payload.predicted_price_inr_per_quintal, 0).toFixed(2),
    );
    setText("best_market", payload.best_market);
    setText(
      "estimated_profit",
      toNumber(payload.estimated_profit_inr, 0).toFixed(2),
    );
    setText("decision_text", payload.decision_text);
    setText(
      "fusion_confidence",
      payload.model_fusion &&
        payload.model_fusion.fusion_confidence !== undefined
        ? `${toNumber(payload.model_fusion.fusion_confidence, 0).toFixed(2)}%`
        : "--",
    );
    setText(
      "fusion_source",
      payload.model_fusion && payload.model_fusion.fusion_note
        ? payload.model_fusion.fusion_note
        : "Run unified prediction to view model fusion details.",
    );

    const barsRoot = document.getElementById("contribution_bars");
    if (barsRoot) {
      const contrib = payload.model_fusion?.model_contributions || {
        recommendation: 33.33,
        yield: 33.33,
        price: 33.34,
      };
      const rows = [
        {
          key: "recommendation",
          label: "Recommendation Model",
          color: "#3d9b57",
        },
        { key: "yield", label: "Yield Model", color: "#2f8f4f" },
        { key: "price", label: "Price Model", color: "#21683a" },
      ];

      barsRoot.innerHTML = rows
        .map((row) => {
          const value = toNumber(contrib[row.key], 0);
          const safe = Math.max(0, Math.min(100, value));
          return `
            <div class="contrib-row">
              <div class="contrib-head"><span>${row.label}</span><strong>${safe.toFixed(2)}%</strong></div>
              <div class="contrib-track"><div class="contrib-fill" style="width:${safe}%; background:${row.color}"></div></div>
            </div>
          `;
        })
        .join("");
    }

    const insights = buildInsightTexts(payload);
    setText("recommendation_insight", insights.recommendationInsight);
    setText("yield_insight", insights.yieldInsight);
    setText("price_insight", insights.priceInsight);

    const raw = payload.raw || {};
    const inputSummary = `Input Summary: Temp ${toNumber(form.temperature.value, 0).toFixed(1)} C, Humidity ${toNumber(form.humidity.value, 0).toFixed(1)}%, Rainfall ${toNumber(form.rainfall.value, 0).toFixed(1)} mm/year, State ${form.state.value || "N/A"}, Season ${form.season.value || "N/A"}.`;
    const processingSummary = `Processing Data: Recommendation model selected ${payload.recommended_crop || "N/A"}. Yield model estimated ${toNumber(payload.expected_yield_ton_per_hectare, 0).toFixed(2)} tons/hectare${raw.yield && raw.yield.estimated_production_tons !== undefined ? ` and ${toNumber(raw.yield.estimated_production_tons, 0).toFixed(2)} total tons` : ""}. Price model predicted ${toNumber(payload.predicted_price_inr_per_quintal, 0).toFixed(2)} INR/quintal for market ${payload.best_market || "N/A"}.`;
    const predictionSummary = `Prediction Output: Final decision is ${payload.decision_text || "N/A"} Estimated profit ${toNumber(payload.estimated_profit_inr, 0).toFixed(2)} INR with fusion confidence ${payload.model_fusion && payload.model_fusion.fusion_confidence !== undefined ? `${toNumber(payload.model_fusion.fusion_confidence, 0).toFixed(2)}%` : "N/A"}.`;

    setText("input_summary_text", inputSummary);
    setText("processing_summary_text", processingSummary);
    setText("prediction_summary_text", predictionSummary);

    renderCharts(payload);
  }

  function initExportControls() {
    const jpgBtn = document.getElementById("exportFarmerJpgBtn");
    const pdfBtn = document.getElementById("exportFarmerPdfBtn");
    const csvBtn = document.getElementById("exportFarmerCsvBtn");

    const updateState = () => {
      const hasResult = !!latestUnifiedResult;
      [jpgBtn, pdfBtn, csvBtn].forEach((btn) => {
        if (btn) {
          btn.disabled = !hasResult;
        }
      });
    };

    const getResult = () =>
      latestUnifiedResult || window.latestUnifiedPrediction || null;

    jpgBtn?.addEventListener("click", async () => {
      const result = getResult();
      if (!result) {
        alert("Run unified prediction first.");
        return;
      }
      const target = document.querySelector(".intel-results");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      await exportNodeAsImage(target, `farmer_intelligence_${stamp}.jpg`);
    });

    pdfBtn?.addEventListener("click", async () => {
      const result = getResult();
      if (!result) {
        alert("Run unified prediction first.");
        return;
      }
      const target = document.querySelector(".intel-results");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      await exportNodeAsPdf(target, `farmer_intelligence_${stamp}.pdf`);
    });

    csvBtn?.addEventListener("click", () => {
      const result = getResult();
      if (!result) {
        alert("Run unified prediction first.");
        return;
      }
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadTextFile(
        buildUnifiedCsv(result),
        `farmer_intelligence_${stamp}.csv`,
        "text/csv;charset=utf-8;",
      );
    });

    updateState();
  }

  async function submitUnifiedPrediction(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    [
      "temperature",
      "humidity",
      "rainfall",
      "farm_area_hectares",
      "year",
      "pesticides_tonnes",
      "min_price",
      "max_price",
    ].forEach((field) => {
      if (payload[field] !== undefined && payload[field] !== "") {
        payload[field] = Number(payload[field]);
      }
    });

    const submitBtn = form.querySelector("button[type='submit']");
    const previousText = submitBtn ? submitBtn.textContent : "";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Running...";
    }

    try {
      const response = await fetch("/api/farmer-intelligence/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Unified prediction request failed");
      }

      const result = await response.json();
      renderResult(result);
    } catch (error) {
      setText(
        "decision_text",
        "Unified prediction failed. Verify module apps and try again.",
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = previousText || "Run Unified Prediction";
      }
    }
  }

  if (window.initialUnifiedResult) {
    renderResult(window.initialUnifiedResult);
  }

  const initialResult = readJsonScript("initial-unified-result", null);
  if (initialResult) {
    renderResult(initialResult);
  }

  initCascadingDropdowns();
  initExportControls();

  form.addEventListener("submit", submitUnifiedPrediction);
})();

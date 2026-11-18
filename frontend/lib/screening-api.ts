export type ScreeningResult = {
  grade: number;
  label: string;
  confidence: number | null;
  probabilities: number[] | null;
  heatmap: string | null;
  inferenceMs: number | null;
  warning: string | null;
};

type JsonRecord = Record<string, unknown>;

const GRADE_LABELS = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

function parseGrade(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4) return value;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    const numeric = Number(trimmed);
    if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 4) return numeric;
    const match = GRADE_LABELS.findIndex((label) => trimmed.includes(label.toLowerCase()));
    if (match >= 0) return match;
    if (trimmed.includes("proliferative")) return 4;
  }
  return null;
}

function normalisePercent(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const percent = parsed <= 1 ? parsed * 100 : parsed;
  return Math.min(100, Math.max(0, percent));
}

function normaliseProbabilities(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    const parsed = value.slice(0, 5).map(normalisePercent);
    return parsed.length === 5 && parsed.every((item) => item !== null) ? parsed as number[] : null;
  }
  if (!isRecord(value)) return null;

  const output: (number | null)[] = [null, null, null, null, null];
  for (const [key, rawValue] of Object.entries(value)) {
    const lower = key.toLowerCase();
    let index = -1;
    if (/class\s*0|no dr/.test(lower)) index = 0;
    else if (/class\s*1|mild/.test(lower)) index = 1;
    else if (/class\s*2|moderate/.test(lower)) index = 2;
    else if (/class\s*3|severe/.test(lower)) index = 3;
    else if (/class\s*4|proliferative/.test(lower)) index = 4;
    else if (/^[0-4]$/.test(lower)) index = Number(lower);
    if (index >= 0) output[index] = normalisePercent(rawValue);
  }
  return output.every((item) => item !== null) ? output as number[] : null;
}

function normaliseHeatmap(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed) && trimmed.length > 100) {
    return `data:image/png;base64,${trimmed.replace(/\s/g, "")}`;
  }
  return null;
}

/**
 * Normalise common prediction response shapes without assuming that a particular
 * backend route or schema exists. Configure the endpoint in the frontend's
 * NEXT_PUBLIC_RETINASCOPE_PREDICT_URL variable after checking the real API docs.
 */
export function normalizeScreeningResponse(payload: unknown): ScreeningResult {
  if (!isRecord(payload)) {
    throw new Error("The screening service returned an unsupported response. Expected a JSON object with a grade from 0 to 4.");
  }

  const prediction = isRecord(payload.prediction)
    ? payload.prediction
    : isRecord(payload.result)
      ? payload.result
      : payload;
  const gradeValue = firstDefined(
    prediction.grade,
    prediction.stage,
    prediction.predicted_class,
    prediction.predicted_grade,
    payload.grade,
    payload.stage,
    payload.predicted_class,
  );
  const grade = parseGrade(gradeValue);
  if (grade === null) {
    throw new Error("The API response did not include a recognised grade field (0–4). Check the backend response mapping before using live results.");
  }

  const labelValue = firstDefined(
    prediction.stage_label,
    prediction.label,
    prediction.severity,
    payload.stage_label,
    payload.label,
  );
  const label = typeof labelValue === "string" && labelValue.trim() ? labelValue.trim() : GRADE_LABELS[grade];
  const confidenceValue = normalisePercent(firstDefined(prediction.confidence, payload.confidence));
  const probabilityValue = firstDefined(prediction.probabilities, payload.probabilities, payload.class_probabilities);
  const probabilities = normaliseProbabilities(probabilityValue);
  const explainability: JsonRecord = isRecord(prediction.explainability)
    ? prediction.explainability
    : isRecord(payload.explainability)
      ? payload.explainability
      : {};
  const heatmap = normaliseHeatmap(firstDefined(
    explainability.heatmap_url,
    explainability.heatmap,
    prediction.heatmap_url,
    prediction.heatmap,
    prediction.gradcam,
    payload.heatmap_url,
    payload.heatmap,
    payload.gradcam,
  ));
  const inferenceValue = firstDefined(prediction.inference_ms, prediction.inferenceMs, payload.inference_ms, payload.inferenceMs);
  const inferenceParsed = typeof inferenceValue === "number" ? inferenceValue : Number(inferenceValue);
  const inferenceMs = Number.isFinite(inferenceParsed) && inferenceParsed >= 0 ? inferenceParsed : null;
  const warningValue = firstDefined(prediction.warning, payload.warning);
  const warning = prediction.untrained_warning === true || payload.untrained_warning === true
    ? "The backend marked this model response with an untrained-model warning. Do not interpret it as a clinical result."
    : typeof warningValue === "string"
      ? warningValue
      : null;

  return { grade, label, confidence: confidenceValue, probabilities, heatmap, inferenceMs, warning };
}

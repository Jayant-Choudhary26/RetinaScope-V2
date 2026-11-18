"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  normalizeScreeningResponse,
  type ScreeningResult,
} from "../lib/screening-api";

const PREDICT_URL = process.env.NEXT_PUBLIC_RETINASCOPE_PREDICT_URL?.trim() ?? "";
const FILE_FIELD = process.env.NEXT_PUBLIC_RETINASCOPE_FILE_FIELD?.trim() || "file";

const navigation = [
  { id: "platform", label: "Platform" },
  { id: "workflow", label: "How it works" },
  { id: "grading", label: "DR grading" },
  { id: "about", label: "About" },
];

const gradeNames = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"];
const gradeClasses = ["grade-clear", "grade-mild", "grade-moderate", "grade-severe", "grade-proliferative"];

const grades = [
  {
    id: 0,
    number: "00",
    name: "No DR",
    longName: "No apparent diabetic retinopathy",
    description: "No diabetic-retinopathy changes are identified in the grading framework for the reviewed image.",
    signs: "The framework describes no apparent retinopathy findings in the examined retinal photograph.",
    context: "A qualified eye-care professional should interpret the image alongside the complete eye examination and the person's screening history.",
  },
  {
    id: 1,
    number: "01",
    name: "Mild",
    longName: "Mild non-proliferative diabetic retinopathy",
    description: "The earliest non-proliferative stage in the five-grade framework.",
    signs: "Commonly described findings include microaneurysms. This summary is educational and does not identify lesions in an uploaded image.",
    context: "Discuss the screening result and an appropriate follow-up interval with a qualified eye-care professional; do not use this label alone to set care.",
  },
  {
    id: 2,
    number: "02",
    name: "Moderate",
    longName: "Moderate non-proliferative diabetic retinopathy",
    description: "Changes extend beyond the mild stage but do not meet the severe non-proliferative criteria in the grading framework.",
    signs: "Descriptions may include more than microaneurysms, such as retinal haemorrhages, exudates or cotton-wool spots.",
    context: "A qualified eye-care professional should review the complete retinal findings and determine the appropriate next step.",
  },
  {
    id: 3,
    number: "03",
    name: "Severe",
    longName: "Severe non-proliferative diabetic retinopathy",
    description: "A more advanced non-proliferative stage, classified using defined retinal findings and the absence of proliferative signs.",
    signs: "Clinical descriptions use the 4-2-1 rule, which considers extensive haemorrhages, venous beading and intraretinal microvascular abnormalities.",
    context: "Prompt professional assessment is important. Follow-up and management decisions belong to the treating eye-care team.",
  },
  {
    id: 4,
    number: "04",
    name: "Proliferative",
    longName: "Proliferative diabetic retinopathy",
    description: "The proliferative stage of the five-grade framework, associated with abnormal new retinal blood-vessel growth.",
    signs: "Clinical descriptions include neovascularisation and may include preretinal or vitreous haemorrhage.",
    context: "The finding requires assessment by an appropriate eye-care professional. This interface cannot determine diagnosis, urgency or treatment.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Image quality review",
    summary: "Start with a clear, well-framed fundus photograph.",
    detail: "Image quality can affect downstream interpretation. A screening workflow should consider focus, illumination, field-of-view and whether the photograph is suitable for review.",
    icon: "scan" as const,
  },
  {
    number: "02",
    title: "AI-assisted grading",
    summary: "Map the image to the project's five-grade framework.",
    detail: "The project identifies EfficientNet-B0 as its grading model. A live prediction is displayed only when a configured backend returns a supported response.",
    icon: "activity" as const,
  },
  {
    number: "03",
    title: "Visual explanation",
    summary: "Inspect a Grad-CAM visualisation when one is returned.",
    detail: "A Grad-CAM view can help a reviewer inspect model attention. It is an explanation aid, not proof that a highlighted region is a lesion or a diagnosis.",
    icon: "layers" as const,
  },
  {
    number: "04",
    title: "Screening planning",
    summary: "Connect screening outputs with responsible review and planning.",
    detail: "District and resource-planning views should be populated from real project data. This frontend does not invent patient records, district totals or service-capacity figures.",
    icon: "map" as const,
  },
];

const capabilities = [
  {
    number: "01",
    title: "Image intelligence",
    description: "A guided intake experience for retinal fundus images, with clear file validation and privacy-aware preview states.",
    icon: "scan" as const,
    detail: "Image intake",
  },
  {
    number: "02",
    title: "Visual explainability",
    description: "A dedicated place to review model output and Grad-CAM imagery without confusing attention maps with clinical evidence.",
    icon: "layers" as const,
    detail: "Model transparency",
  },
  {
    number: "03",
    title: "Planning insights",
    description: "A structured foundation for district-level screening context once connected to verified project data.",
    icon: "map" as const,
    detail: "Operational context",
  },
];

const illustrativeResult: ScreeningResult = {
  grade: 2,
  label: "Moderate",
  confidence: 68,
  probabilities: [6, 12, 68, 9, 5],
  heatmap: null,
  inferenceMs: null,
  warning: null,
};

type IconName =
  | "arrow"
  | "upload"
  | "lock"
  | "shield"
  | "scan"
  | "layers"
  | "map"
  | "activity"
  | "check"
  | "file"
  | "close"
  | "menu"
  | "moon"
  | "sun"
  | "info"
  | "chevron"
  | "refresh";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    focusable: false as const,
  };

  switch (name) {
    case "arrow":
      return <svg {...common}><path d="M4 12h15M13 5l7 7-7 7" /></svg>;
    case "upload":
      return <svg {...common}><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>;
    case "lock":
      return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "scan":
      return <svg {...common}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="4" /></svg>;
    case "layers":
      return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>;
    case "map":
      return <svg {...common}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /></svg>;
    case "activity":
      return <svg {...common}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "file":
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></svg>;
    case "close":
      return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "moon":
      return <svg {...common}><path d="M20.8 13A8.8 8.8 0 0 1 11 3.2 8.9 8.9 0 1 0 20.8 13Z" /></svg>;
    case "sun":
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>;
    case "chevron":
      return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "refresh":
      return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></svg>;
    default:
      return null;
  }
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? "reveal-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function RetinaIllustration() {
  return (
    <svg
      className="retina-art"
      viewBox="0 0 520 520"
      role="img"
      aria-label="Illustrative retinal vessel artwork with a non-diagnostic attention overlay"
    >
      <defs>
        <radialGradient id="retinaGlow">
          <stop offset="0" stopColor="#f8c58d" stopOpacity=".92" />
          <stop offset=".28" stopColor="#d17e58" stopOpacity=".7" />
          <stop offset=".7" stopColor="#8c493d" stopOpacity=".5" />
          <stop offset="1" stopColor="#142b3d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="retinaCore">
          <stop offset="0" stopColor="#ffe3b3" />
          <stop offset=".55" stopColor="#d98d64" />
          <stop offset="1" stopColor="#8a493c" />
        </radialGradient>
        <radialGradient id="attentionWarm">
          <stop offset="0" stopColor="#ffb45f" stopOpacity=".76" />
          <stop offset=".45" stopColor="#ed735d" stopOpacity=".4" />
          <stop offset="1" stopColor="#e96f5c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="attentionCool">
          <stop offset="0" stopColor="#f5d16d" stopOpacity=".55" />
          <stop offset="1" stopColor="#f5d16d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="scanGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#77d9c7" stopOpacity="0" />
          <stop offset=".5" stopColor="#d7fff2" stopOpacity=".95" />
          <stop offset="1" stopColor="#77d9c7" stopOpacity="0" />
        </linearGradient>
        <filter id="softGlow"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="heatBlur"><feGaussianBlur stdDeviation="16" /></filter>
        <clipPath id="retinaClip"><circle cx="260" cy="260" r="172" /></clipPath>
      </defs>
      <circle cx="260" cy="260" r="225" fill="none" stroke="#9edbd0" strokeOpacity=".15" />
      <circle cx="260" cy="260" r="198" fill="none" stroke="#9edbd0" strokeOpacity=".1" strokeDasharray="2 8" />
      <circle cx="260" cy="260" r="172" fill="#6d3e39" />
      <g clipPath="url(#retinaClip)">
        <circle cx="260" cy="260" r="172" fill="url(#retinaGlow)" />
        <circle cx="260" cy="260" r="170" fill="none" stroke="#f5b77e" strokeOpacity=".24" strokeWidth="2" />
        <g className="retina-vessels retina-vessels-primary" fill="none" stroke="#f2b489" strokeLinecap="round" opacity=".82">
          <path d="M256 264 C224 224 199 177 158 126 C132 94 105 81 82 63" strokeWidth="5" />
          <path d="M209 205 C181 201 159 181 134 166 C109 152 91 150 68 152" strokeWidth="3" />
          <path d="M177 153 C174 123 159 104 148 83" strokeWidth="2.2" />
          <path d="M156 126 C128 122 110 106 96 88" strokeWidth="2" />
          <path d="M261 258 C300 225 332 181 384 152 C415 135 440 130 468 127" strokeWidth="5" />
          <path d="M338 185 C363 181 386 165 409 158 C430 151 450 156 473 169" strokeWidth="2.5" />
          <path d="M389 150 C398 118 420 96 448 81" strokeWidth="2" />
          <path d="M261 264 C309 283 350 320 387 367 C408 394 430 414 456 429" strokeWidth="4.5" />
          <path d="M348 320 C377 317 403 327 430 346 C449 360 466 380 480 404" strokeWidth="2.4" />
          <path d="M387 367 C390 398 409 425 426 443" strokeWidth="2" />
          <path d="M259 264 C226 302 204 345 165 385 C138 413 109 429 78 443" strokeWidth="4.5" />
          <path d="M194 350 C166 348 142 365 120 386 C103 402 88 421 75 441" strokeWidth="2.5" />
          <path d="M166 385 C164 414 147 437 128 457" strokeWidth="2" />
          <path d="M257 255 C250 217 251 185 244 150 C239 122 226 98 209 77" strokeWidth="2.5" />
          <path d="M263 265 C281 297 288 337 285 380 C283 408 290 432 305 455" strokeWidth="2.6" />
          <path d="M260 264 C219 263 184 274 145 291 C119 302 95 305 70 299" strokeWidth="2" />
          <path d="M260 264 C301 251 339 250 379 267 C410 279 436 278 465 269" strokeWidth="2" />
        </g>
        <g className="retina-vessels retina-vessels-secondary" fill="none" stroke="#f6c49b" strokeLinecap="round" opacity=".5">
          <path d="M183 181 162 169 146 145M157 126l-24-7-18-16M384 152l17-24 25-14M348 185l13-26 23-16" strokeWidth="1.3" />
          <path d="M348 320l23 8 18 21M387 367l24 13 15 22M194 350l-22 19-9 23M166 385l-23 13-12 23" strokeWidth="1.3" />
        </g>
        <g className="retina-heatmap" filter="url(#heatBlur)">
          <ellipse cx="186" cy="183" rx="75" ry="56" fill="url(#attentionWarm)" />
          <ellipse cx="351" cy="323" rx="67" ry="58" fill="url(#attentionWarm)" />
          <ellipse cx="300" cy="142" rx="45" ry="38" fill="url(#attentionCool)" />
        </g>
        <circle cx="260" cy="260" r="54" fill="#d4865b" opacity=".34" filter="url(#softGlow)" />
        <circle cx="260" cy="260" r="29" fill="url(#retinaCore)" opacity=".96" />
        <circle cx="260" cy="260" r="8" fill="#ffe9c9" opacity=".8" />
        <rect className="retina-scan-beam" x="84" y="88" width="352" height="3" rx="1.5" fill="url(#scanGradient)" />
      </g>
      <circle cx="260" cy="260" r="172" fill="none" stroke="#f2c29a" strokeOpacity=".52" />
      <circle cx="260" cy="260" r="189" fill="none" stroke="#84d6c9" strokeOpacity=".2" strokeDasharray="3 7" />
      <path d="M260 28v38M260 454v38M28 260h38M454 260h38" stroke="#91d7ca" strokeOpacity=".4" />
      <circle cx="413" cy="135" r="5" fill="#b8eadc" />
      <circle cx="413" cy="135" r="13" fill="none" stroke="#b8eadc" strokeOpacity=".28" />
      <circle cx="105" cy="361" r="3" fill="#f4bf8d" />
    </svg>
  );
}

function DemoBadge() {
  return <span className="demo-badge">Illustrative / Demo</span>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [expandedStep, setExpandedStep] = useState(0);
  const [expandedGrade, setExpandedGrade] = useState(0);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [resultMode, setResultMode] = useState<"live" | "demo" | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const [heatmapOpacity, setHeatmapOpacity] = useState(72);
  const [dashboardTab, setDashboardTab] = useState<"overview" | "districts">("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const apiConfigured = Boolean(PREDICT_URL);

  useEffect(() => {
    let storedTheme: string | null = null;
    try {
      storedTheme = window.localStorage.getItem("retinascope-theme");
    } catch {
      storedTheme = null;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const initialDark = storedTheme ? storedTheme === "dark" : prefersDark;
    setDarkMode(initialDark);
    document.documentElement.dataset.theme = initialDark ? "dark" : "light";
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const root = document.documentElement;
        const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
        root.style.setProperty("--scroll-progress", `${progress * 100}%`);
        setIsScrolled(window.scrollY > 16);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const nodes = navigation
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (active) setActiveSection(active.target.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.12, 0.3, 0.55] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const drawer = mobileNavRef.current;
    const getFocusable = () => Array.from(
      drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
    );
    getFocusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      try {
        window.localStorage.setItem("retinascope-theme", next ? "dark" : "light");
      } catch {
        // Theme preference remains active for the current session.
      }
      return next;
    });
  };

  const clearResult = () => {
    setResult(null);
    setResultMode(null);
    setAnalysisError("");
    setComparePosition(50);
    setHeatmapOpacity(72);
  };

  const selectFile = (file?: File) => {
    setUploadError("");
    setAnalysisError("");
    if (!file) return;
    abortRef.current?.abort();
    setIsAnalyzing(false);
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setUploadError("Please choose a JPG, PNG or WEBP retinal image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("This image is larger than 20 MB. Choose a smaller file.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    clearResult();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  const resetUpload = () => {
    abortRef.current?.abort();
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError("");
    setIsAnalyzing(false);
    clearResult();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const showIllustrativeDemo = () => {
    if (!selectedFile) {
      setUploadError("Choose a retinal image first to preview the illustrative results layout.");
      return;
    }
    setAnalysisError("");
    setResult(illustrativeResult);
    setResultMode("demo");
    setComparePosition(50);
  };

  const runLiveAnalysis = async () => {
    if (!selectedFile) {
      setUploadError("Choose an image before starting a live screening request.");
      return;
    }
    if (!apiConfigured) {
      setAnalysisError("Live analysis is not connected yet. Configure NEXT_PUBLIC_RETINASCOPE_PREDICT_URL in the frontend environment after confirming the existing backend route and file-field name.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsAnalyzing(true);
    setAnalysisError("");
    clearResult();

    try {
      const formData = new FormData();
      formData.append(FILE_FIELD, selectedFile);
      const response = await fetch(PREDICT_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const bodyText = await response.text();
      let body: unknown = null;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : `The screening service returned HTTP ${response.status}.`;
        throw new Error(message);
      }
      const normalised = normalizeScreeningResponse(body);
      setResult(normalised);
      setResultMode("live");
      setComparePosition(50);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setAnalysisError(error instanceof Error ? error.message : "The screening request could not be completed.");
    } finally {
      if (!controller.signal.aborted) setIsAnalyzing(false);
    }
  };

  const activeGrade = useMemo(() => grades.find((grade) => grade.id === expandedGrade) ?? grades[0], [expandedGrade]);

  useEffect(() => {
    if (result) {
      window.requestAnimationFrame(() => document.getElementById("results-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [result]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="app-shell">
      <a className="skip-link" href="#workspace">Skip to screening workspace</a>
      <div className="scroll-progress" aria-hidden="true" />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className={`site-header ${isScrolled ? "site-header-scrolled" : ""}`}>
        <a className="brand" href="#home" aria-label="RetinaScope home" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-name"><span className="brand-retina">retina</span><span className="brand-scope">scope</span><sup>AI</sup></span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <a key={item.id} href={`#${item.id}`} className={activeSection === item.id ? "nav-link nav-link-active" : "nav-link"} aria-current={activeSection === item.id ? "location" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a className="header-cta" href="#workspace">Open workspace <Icon name="arrow" size={16} /></a>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-pressed={darkMode} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"} title={darkMode ? "Switch to light theme" : "Switch to dark theme"}>
            <Icon name={darkMode ? "sun" : "moon"} size={18} />
          </button>
          <button ref={menuButtonRef} className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation">
            <Icon name={menuOpen ? "close" : "menu"} size={21} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button className="drawer-scrim" type="button" aria-label="Close navigation menu" onClick={closeMenu} />
          <nav ref={mobileNavRef} id="mobile-navigation" className="mobile-drawer" aria-label="Mobile navigation">
            <span className="drawer-kicker">NAVIGATE RETINASCOPE</span>
            {navigation.map((item, index) => (
              <a key={item.id} href={`#${item.id}`} onClick={closeMenu} style={{ transitionDelay: `${index * 45}ms` }}>
                <span>{item.label}</span><Icon name="arrow" size={17} />
              </a>
            ))}
            <a className="drawer-cta" href="#workspace" onClick={closeMenu}>Open screening workspace <Icon name="arrow" size={17} /></a>
          </nav>
        </>
      )}

      <section className="hero" id="home" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <Reveal className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> EXPLAINABLE RETINAL INTELLIGENCE <span className="eyebrow-rule" /></div>
          <h1 id="hero-title" className="hero-title">
            <span className="hero-title-line"><span>See</span> <span>beyond</span></span>
            <span className="hero-title-line"><span>the</span> <em>image.</em></span>
          </h1>
          <p className="hero-lede">A clearer view of diabetic retinopathy screening. Bring retinal imagery, explainable AI and practical screening insights into one focused workspace.</p>
          <div className="hero-actions">
            <a className="button button-primary hero-primary-cta" href="#workspace">Explore screening workspace <Icon name="arrow" size={18} /></a>
            <a className="text-link" href="#workflow">Discover the approach <span>↗</span></a>
          </div>
          <div className="hero-trust-strip" aria-label="Project technologies and workflow">
            {["EfficientNet-B0", "Grad-CAM", "5-grade DR", "Human-in-the-loop"].map((item) => <span className="trust-chip" key={item}><i aria-hidden="true" />{item}</span>)}
          </div>
          <div className="hero-responsibility">
            <span><Icon name="shield" size={15} /> Research &amp; demonstration prototype</span>
            <span><Icon name="check" size={15} /> Human review remains essential</span>
          </div>
        </Reveal>

        <Reveal className="hero-art-wrap" delay={120}>
          <div className="art-orbit orbit-one" aria-hidden="true" />
          <div className="art-orbit orbit-two" aria-hidden="true" />
          <div className="retina-card">
            <div className="retina-card-top"><span><i className="live-dot" /> VISUAL FIELD / 01</span><span>ILLUSTRATIVE VIEW</span></div>
            <RetinaIllustration />
            <div className="retina-card-bottom">
              <div><span className="micro-label">ILLUSTRATIVE ANALYSIS LAYER</span><strong>Retinal structure</strong></div>
              <span className="scan-chip"><Icon name="scan" size={14} /> SCAN FIELD</span>
            </div>
          </div>
          <div className="floating-note note-top"><span className="note-icon"><Icon name="layers" size={16} /></span><div><strong>Explainable AI</strong><small>Illustrative attention layer</small></div></div>
          <div className="floating-note note-bottom"><span className="note-icon"><Icon name="activity" size={16} /></span><div><strong>5-grade framework</strong><small>From no DR to proliferative DR</small></div></div>
          <span className="art-coordinate coordinate-one">RETINAL FIELD / 01</span>
          <span className="art-coordinate coordinate-two">RS — 001 / VISION SYSTEMS</span>
        </Reveal>

        <div className="hero-footer-line">
          <span>RETINASCOPE / RESEARCH INTERFACE</span>
          <span>HUMAN REVIEW REMAINS ESSENTIAL</span>
        </div>
      </section>

      <section className="workspace-section" id="workspace">
        <div className="section-heading">
          <div><span className="section-index">01 / SCREENING WORKSPACE</span><h2>Start with a<br /><em>retinal image.</em></h2></div>
          <p>Choose a fundus photograph to create a private browser preview. You can explore a clearly labelled demo layout or connect the existing model endpoint when its route and request contract are configured.</p>
        </div>

        <div className="workspace-grid">
          <section className={`upload-panel ${dragging ? "upload-panel-dragging" : ""}`} aria-labelledby="upload-heading">
            <div className="panel-header">
              <div><span className="panel-kicker">IMAGE INTAKE</span><h3 id="upload-heading">Upload a fundus image</h3></div>
              <span className="step-badge">STEP 01</span>
            </div>

            {previewUrl ? (
              <div className="preview-state">
                <div className="preview-image">
                  <Image src={previewUrl} alt="Selected retinal image preview" fill unoptimized sizes="(max-width: 800px) 90vw, 620px" />
                  <span className="preview-image-label">LOCAL PREVIEW · VISUAL EFFECT</span>
                </div>
                <div className="preview-details">
                  <span className="file-icon"><Icon name="file" size={19} /></span>
                  <div className="file-copy"><strong>{selectedFile?.name}</strong><small>{selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Browser preview` : "Browser preview"}</small></div>
                  <button className="icon-button" type="button" onClick={resetUpload} aria-label="Remove selected image"><Icon name="close" size={18} /></button>
                </div>
                <div className="preview-notice"><Icon name="lock" size={16} /><span>Image stays in this browser preview until you choose live analysis.</span></div>
              </div>
            ) : (
              <div className={`drop-zone ${dragging ? "drop-zone-active" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={handleDragLeave} onDrop={handleDrop} aria-label="Fundus image drop zone">
                <div className="upload-symbol"><Icon name="upload" size={27} /></div>
                <strong>Drop your image here</strong>
                <span>or browse files from your device</span>
                <label className="button button-primary choose-button" htmlFor="retina-file-input">Choose image <Icon name="arrow" size={17} /></label>
                <input ref={fileInputRef} className="visually-hidden" id="retina-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                <small>JPG, PNG or WEBP · Maximum file size 20 MB</small>
              </div>
            )}

            {uploadError && <p className="upload-error" role="alert"><Icon name="info" size={16} />{uploadError}</p>}

            {selectedFile && (
              <div className="analysis-actions">
                <button className="button button-primary" type="button" onClick={runLiveAnalysis} disabled={!apiConfigured || isAnalyzing} title={!apiConfigured ? "Configure the existing backend prediction URL to enable live analysis" : "Send this image to the configured backend"}>
                  {isAnalyzing ? <span className="button-spinner" aria-hidden="true" /> : <Icon name="activity" size={17} />}
                  {isAnalyzing ? "Waiting for model…" : "Run live analysis"}
                </button>
                <button className="button button-secondary" type="button" onClick={showIllustrativeDemo} disabled={isAnalyzing}>View illustrative demo</button>
              </div>
            )}

            {!apiConfigured && (
              <div className="api-status"><span className="status-indicator" /><div><strong>Live model connection not configured</strong><small>The image remains local. Add the existing prediction endpoint to the frontend environment to enable live analysis.</small></div></div>
            )}
            {analysisError && <p className="analysis-error" role="alert"><Icon name="info" size={16} />{analysisError}</p>}

            <div className="upload-footer">
              <span><Icon name="shield" size={15} /> Local preview · live analysis sends the file</span>
              <span>JPG · PNG · WEBP</span>
            </div>
          </section>

          <aside className="workflow-panel" aria-labelledby="workflow-panel-heading">
            <div className="panel-header"><div><span className="panel-kicker">THE WORKFLOW</span><h3 id="workflow-panel-heading">From image to insight</h3></div><span className="workflow-status">4-STEP PROCESS</span></div>
            <div className="workflow-steps compact-steps">
              {workflowSteps.map((step, index) => (
                <div className="compact-step-wrap" key={step.number}>
                  <div className="workflow-step">
                    <span className="step-number">{step.number}</span>
                    <span className="step-symbol"><Icon name={step.icon} size={18} /></span>
                    <div><strong>{step.title}</strong><small>{step.summary}</small></div>
                  </div>
                  {index < workflowSteps.length - 1 && <div className="step-connector" />}
                </div>
              ))}
            </div>
            <div className="workflow-note"><Icon name="shield" size={17} /><p><strong>Designed for responsible use.</strong> Screening outputs support professional review; they do not replace it.</p></div>
          </aside>
        </div>

        {isAnalyzing && (
          <div className="request-status" role="status" aria-live="polite">
            <div className="request-status-heading">
              <span className="request-spinner" aria-hidden="true" />
              <div>
                <strong>Waiting for the configured screening service</strong>
                <small>The frontend has sent the request and is waiting for the backend response. No model stages or result values are simulated.</small>
              </div>
            </div>
            <ol className="request-stepper" aria-label="Request status">
              <li className="request-step-complete"><span><Icon name="check" size={13} /></span><strong>Request sent</strong></li>
              <li className="request-step-active" aria-current="step"><span>2</span><strong>Waiting for response</strong></li>
              <li><span>3</span><strong>Review result</strong></li>
              <li><span>4</span><strong>Human review</strong></li>
            </ol>
            <div className="request-skeleton" aria-hidden="true">
              <div className="skeleton-image" />
              <div className="skeleton-copy"><i /><i /><i /><i /></div>
            </div>
          </div>
        )}

        {result && previewUrl && (
          <section className="results-panel" id="results-panel" aria-labelledby="results-heading">
            <div className="results-header">
              <div><span className="section-index">02 / SCREENING OUTPUT</span><h2 id="results-heading">Result overview</h2><p>{resultMode === "demo" ? "This sample demonstrates the results layout only; it was not generated from the uploaded image." : "Values below were returned by the configured screening service. They require qualified professional review."}</p></div>
              {resultMode === "demo" ? <DemoBadge /> : <span className="live-result-badge"><span className="status-indicator" /> BACKEND RESPONSE</span>}
            </div>

            <div className="results-grid">
              <div className="result-card comparison-card">
                <div className="result-card-heading"><div><span className="panel-kicker">VISUAL EXPLANATION</span><h3>Original / attention view</h3></div><span className="step-badge">{resultMode === "demo" ? "DEMO OVERLAY" : "API IMAGE"}</span></div>
                <div className="comparison-stage">
                  <Image src={previewUrl} alt="Original uploaded fundus image" fill unoptimized sizes="(max-width: 900px) 90vw, 620px" />
                  {result.heatmap ? (
                    <Image src={result.heatmap} alt="Grad-CAM heatmap returned by the backend" fill unoptimized sizes="(max-width: 900px) 90vw, 620px" className="comparison-heatmap" style={{ opacity: heatmapOpacity / 100, clipPath: `inset(0 0 0 ${comparePosition}%)` }} />
                  ) : resultMode === "demo" ? (
                    <div className="demo-heatmap-overlay" role="img" aria-label="Illustrative heatmap overlay, not model output" style={{ opacity: heatmapOpacity / 100, clipPath: `inset(0 0 0 ${comparePosition}%)` }} />
                  ) : (
                    <div className="heatmap-unavailable">No heatmap image was included in the API response.</div>
                  )}
                  <span className="compare-label compare-label-before">ORIGINAL</span>
                  <span className="compare-label compare-label-after">{result.heatmap ? "BACKEND HEATMAP" : "ILLUSTRATIVE VIEW"}</span>
                  <span className="compare-divider" style={{ left: `${comparePosition}%` }} aria-hidden="true"><i /></span>
                </div>
                <label className="range-control"><span>Before / after position</span><input type="range" min="0" max="100" value={comparePosition} onChange={(event) => setComparePosition(Number(event.target.value))} aria-label="Adjust original and heatmap comparison position" /></label>
                <label className="range-control"><span>Heatmap opacity</span><input type="range" min="0" max="100" value={heatmapOpacity} onChange={(event) => setHeatmapOpacity(Number(event.target.value))} aria-label="Adjust heatmap opacity" /></label>
                {resultMode === "demo" && <p className="demo-explainer">Illustrative heatmap mock-up only. It is not a Grad-CAM output and does not indicate a finding in this image.</p>}
              </div>

              <div className="result-card prediction-card">
                <div className="result-card-heading"><div><span className="panel-kicker">FIVE-GRADE FRAMEWORK</span><h3>Screening classification</h3></div>{resultMode === "demo" && <DemoBadge />}</div>
                <div className="prediction-main">
                  <span className={`grade-dot ${gradeClasses[result.grade]}`} />
                  <div>
                    <span className="micro-label">{resultMode === "demo" ? "SAMPLE GRADE" : "RETURNED GRADE"}</span>
                    <strong>{result.label || gradeNames[result.grade]}</strong>
                    <small>{grades[result.grade].longName}</small>
                    <span className={`prediction-grade-pill ${gradeClasses[result.grade]}`}>GRADE {result.grade} · {gradeNames[result.grade]}</span>
                  </div>
                </div>
                <div className="severity-meter" aria-label={`Grade ${result.grade} of 4: ${result.label}`}>
                  {gradeNames.map((name, index) => <div key={name} className={`severity-segment ${index === result.grade ? gradeClasses[index] : "severity-empty"}`} title={`${index}: ${name}`} aria-label={`${name}${index === result.grade ? ", predicted grade" : ""}`} />)}
                </div>
                <div className="prediction-stats">
                  <div><span>Grade</span><strong>{result.grade} / 4</strong></div>
                  <div><span>Confidence</span><strong>{typeof result.confidence === "number" ? `${Math.round(result.confidence)}%` : "Not supplied"}</strong></div>
                  <div><span>Inference time</span><strong>{typeof result.inferenceMs === "number" ? `${Math.round(result.inferenceMs)} ms` : "Not supplied"}</strong></div>
                </div>
                {result.warning && <p className="api-warning"><Icon name="info" size={16} />{result.warning}</p>}
                {resultMode === "demo" && <p className="demo-explainer">All values on this card are illustrative placeholders. They are not calculated from the uploaded image.</p>}
              </div>
            </div>

            <div className="results-lower-grid">
              <div className="result-card confidence-card">
                <div className="result-card-heading"><div><span className="panel-kicker">MODEL OUTPUT</span><h3>Grade confidence distribution</h3></div>{resultMode === "demo" && <DemoBadge />}</div>
                {result.probabilities ? (
                  <div className="confidence-list">
                    {result.probabilities.map((value, index) => (
                      <div className="confidence-row" key={gradeNames[index]}>
                        <span className="confidence-name">{gradeNames[index]}</span>
                        <div className="confidence-track"><span className={`confidence-fill ${index === result.grade ? gradeClasses[index] : "confidence-fill-muted"}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
                        <strong>{Math.round(value)}%</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-data-state"><Icon name="activity" size={22} /><strong>Distribution not supplied</strong><span>The connected API returned a grade without per-class probabilities.</span></div>
                )}
              </div>

              <div className="result-card context-card">
                <div className="result-card-heading"><div><span className="panel-kicker">REVIEW CONTEXT</span><h3>What this label means</h3></div><Icon name="info" size={18} /></div>
                <p>{grades[result.grade].description}</p>
                <div className="next-step-card"><span className="next-step-icon"><Icon name="shield" size={18} /></span><div><strong>Recommended next step</strong><span>{grades[result.grade].context}</span></div></div>
                <p className="clinical-caveat">This interface does not make a diagnosis, prescribe treatment or set a follow-up interval.</p>
              </div>
            </div>

            <div className="results-actions">
              <button className="button button-secondary" type="button" onClick={resetUpload}><Icon name="refresh" size={16} /> Upload another image</button>
              {resultMode === "demo" && <span className="demo-inline-note"><DemoBadge /> Example values only; no patient data used.</span>}
            </div>
          </section>
        )}
      </section>

      <section className="capability-section" id="platform">
        <div className="section-heading capability-heading">
          <div><span className="section-index">03 / THE PLATFORM</span><h2>One connected view.<br /><em>Three essential capabilities.</em></h2></div>
          <p>Designed to make the screening workflow easier to understand, review and plan around — without overstating what an AI model can establish.</p>
        </div>
        <div className="capability-grid">
          <Reveal className="capability-card capability-card-large">
            <span className="capability-number">{capabilities[0].number} / {capabilities[0].detail}</span>
            <span className="capability-icon"><Icon name={capabilities[0].icon} size={23} /></span>
            <h3>{capabilities[0].title}</h3>
            <p>{capabilities[0].description}</p>
            <div className="capability-visual upload-visual" aria-hidden="true"><span /><span /><span /><i><Icon name="scan" size={20} /></i></div>
          </Reveal>
          <Reveal className="capability-card capability-card-tall" delay={90}>
            <span className="capability-number">{capabilities[1].number} / {capabilities[1].detail}</span>
            <span className="capability-icon"><Icon name={capabilities[1].icon} size={23} /></span>
            <h3>{capabilities[1].title}</h3>
            <p>{capabilities[1].description}</p>
            <div className="attention-visual" aria-hidden="true"><span /><span /><span /><i /></div>
          </Reveal>
          <Reveal className="capability-card capability-card-wide" delay={160}>
            <span className="capability-number">{capabilities[2].number} / {capabilities[2].detail}</span>
            <span className="capability-icon"><Icon name={capabilities[2].icon} size={23} /></span>
            <h3>{capabilities[2].title}</h3>
            <p>{capabilities[2].description}</p>
            <div className="planning-visual" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          </Reveal>
        </div>
        <div className="responsible-note"><Icon name="shield" size={18} /><p><strong>Designed for responsible use.</strong> Results and visual explanations are support tools for qualified review, not standalone clinical decisions.</p></div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="section-heading workflow-heading">
          <div><span className="section-index">04 / THE PROCESS</span><h2>From image<br /><em>to insight.</em></h2></div>
          <p>Explore the stages of a considered screening workflow. Select each step to see the role it plays and where human review remains important.</p>
        </div>
        <div className="timeline-layout">
          <div className="timeline-rail" aria-hidden="true"><span /></div>
          <div className="timeline-list">
            {workflowSteps.map((step, index) => (
              <article className={`timeline-item ${expandedStep === index ? "timeline-item-active" : ""}`} key={step.number}>
                <button className="timeline-trigger" type="button" onClick={() => setExpandedStep(expandedStep === index ? -1 : index)} aria-expanded={expandedStep === index} aria-controls={`workflow-detail-${index}`}>
                  <span className="timeline-number">{step.number}</span>
                  <span className="timeline-icon"><Icon name={step.icon} size={20} /></span>
                  <span className="timeline-title-wrap"><strong>{step.title}</strong><small>{step.summary}</small></span>
                  <span className="timeline-chevron"><Icon name="chevron" size={18} /></span>
                </button>
                {expandedStep === index && <div className="timeline-detail" id={`workflow-detail-${index}`}><p>{step.detail}</p></div>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grading-section" id="grading">
        <div className="section-heading grading-heading">
          <div><span className="section-index">05 / CLASSIFICATION FRAMEWORK</span><h2>Five grades.<br /><em>A clearer language<br />for severity.</em></h2></div>
          <p>The project uses five diabetic-retinopathy grades. These educational summaries explain the framework; they are not a patient result or a substitute for clinical interpretation.</p>
        </div>
        <div className="grading-layout">
          <div className="grade-accordion" aria-label="Diabetic retinopathy grades">
            {grades.map((grade) => (
              <article className={`grade-accordion-item ${expandedGrade === grade.id ? "grade-item-active" : ""}`} key={grade.id}>
                <button className="grade-trigger" type="button" onClick={() => setExpandedGrade(expandedGrade === grade.id ? -1 : grade.id)} aria-expanded={expandedGrade === grade.id} aria-controls={`grade-detail-${grade.id}`}>
                  <span className="grade-number">{grade.number}</span>
                  <span className={`grade-indicator ${gradeClasses[grade.id]}`} />
                  <span className="grade-title"><strong>{grade.name}</strong><small>{grade.longName}</small></span>
                  <span className="grade-trigger-icon"><Icon name="chevron" size={18} /></span>
                </button>
                {expandedGrade === grade.id && (
                  <div className="grade-detail" id={`grade-detail-${grade.id}`}>
                    <p>{grade.description}</p>
                    <div className="grade-detail-columns">
                      <div><span>Typical signs described in guidance</span><p>{grade.signs}</p></div>
                      <div><span>Professional review context</span><p>{grade.context}</p></div>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
          <aside className="grade-spectrum-card">
            <span className="panel-kicker">SEVERITY SPECTRUM</span>
            <h3>{activeGrade.name}</h3>
            <p>{activeGrade.longName}</p>
            <div className="severity-spectrum" aria-label="Severity spectrum from No DR to Proliferative DR">
              {grades.map((grade) => <button key={grade.id} type="button" className={`spectrum-segment ${gradeClasses[grade.id]} ${expandedGrade === grade.id ? "spectrum-active" : ""}`} aria-label={`Show ${grade.name} grade details`} aria-pressed={expandedGrade === grade.id} onClick={() => setExpandedGrade(grade.id)} />)}
            </div>
            <div className="spectrum-labels"><span>No DR</span><span>Proliferative</span></div>
            <div className="grade-retina-mini" aria-hidden="true"><span className={`grade-retina-core ${gradeClasses[Math.max(0, expandedGrade)]}`} /><i /><i /><i /><i /></div>
            <div className="grade-spectrum-foot"><Icon name="info" size={16} /><span>Colour indicates framework category only. The grade label is always shown alongside it.</span></div>
          </aside>
        </div>
        <p className="grading-reference">Stage descriptions are concise educational summaries aligned with published diabetic-retinopathy severity scales. They do not provide a diagnosis or an individual care plan.</p>
      </section>

      <section className="dashboard-preview-section" aria-labelledby="dashboard-preview-title">
        <div className="section-heading dashboard-heading">
          <div><span className="section-index">06 / PLANNING PREVIEW</span><h2 id="dashboard-preview-title">A clearer view<br /><em>of screening activity.</em></h2></div>
          <p>A lightweight preview of the planning workspace. Live counts and district statistics will appear only when connected to verified project data.</p>
        </div>
        <div className="dashboard-preview-card">
          <div className="dashboard-preview-top">
            <div><span className="panel-kicker">RETINASCOPE / INSIGHTS</span><h3>Screening overview</h3></div>
            <DemoBadge />
          </div>
          <div className="dashboard-tabs" role="group" aria-label="Dashboard preview views">
            <button id="dashboard-overview-tab" type="button" aria-pressed={dashboardTab === "overview"} className={dashboardTab === "overview" ? "dashboard-tab-active" : ""} onClick={() => setDashboardTab("overview")}>Overview</button>
            <button id="dashboard-districts-tab" type="button" aria-pressed={dashboardTab === "districts"} className={dashboardTab === "districts" ? "dashboard-tab-active" : ""} onClick={() => setDashboardTab("districts")}>District planning</button>
          </div>
          {dashboardTab === "overview" ? (
            <div className="dashboard-empty-grid" role="region" aria-labelledby="dashboard-overview-tab" aria-live="polite">
              <div className="dashboard-stat"><span>Screenings reviewed</span><strong>—</strong><small>No live data connected</small></div>
              <div className="dashboard-stat"><span>Awaiting review</span><strong>—</strong><small>No live data connected</small></div>
              <div className="dashboard-stat"><span>District coverage</span><strong>—</strong><small>No live data connected</small></div>
              <div className="dashboard-chart-empty">
                <div className="dashboard-chart-heading">
                  <span className="panel-kicker">GRADE DISTRIBUTION</span>
                  <span className="dashboard-empty-badge">Awaiting verified data</span>
                </div>
                <div className="dashboard-chart-placeholder">
                  <span className="dashboard-chart-icon"><Icon name="activity" size={21} /></span>
                  <div>
                    <strong>No verified screening records connected</strong>
                    <p>Connect verified screening records to populate this chart. No sample distribution is shown.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="district-empty-state" role="region" aria-labelledby="dashboard-districts-tab" aria-live="polite"><span className="district-map-icon"><Icon name="map" size={25} /></span><div><strong>District data not connected</strong><p>District-level screening and resource planning should be populated from your team's verified dataset or backend response. No sample district counts are shown here.</p></div></div>
          )}
          <p className="dashboard-note"><Icon name="info" size={15} /> Illustrative dashboard layout — no patient, district or service-capacity data is displayed.</p>
        </div>
      </section>

      <section className="closing-section" id="about">
        <div className="closing-rings" aria-hidden="true"><i /><i /><i /></div>
        <span className="section-index">07 / RESPONSIBLE SCREENING INTELLIGENCE</span>
        <h2>Technology with<br /><em>a human point of view.</em></h2>
        <p>RetinaScope brings together retinal image analysis, visual explanations and screening-planning context — with clarity, transparency and responsible human review at the centre.</p>
        <a className="button button-primary closing-cta" href="#workspace">Open screening workspace <Icon name="arrow" size={18} /></a>
        <footer className="site-footer">
          <a className="brand footer-brand" href="#home" aria-label="RetinaScope home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span className="brand-name"><span className="brand-retina">retina</span><span className="brand-scope">scope</span><sup>AI</sup></span></a>
          <nav className="footer-nav" aria-label="Footer navigation">{navigation.map((item) => <a key={item.id} href={`#${item.id}`}>{item.label}</a>)}</nav>
          <span className="footer-credit">BUILT WITH RESPONSIBLE AI</span>
        </footer>
      </section>

      <div className="medical-disclaimer" role="note">
        <Icon name="shield" size={17} />
        <p><strong>Research &amp; demonstration prototype.</strong> RetinaScope is not a medical device and must not be used as a standalone diagnostic tool. Human review remains essential; screening outputs require review by a qualified eye-care professional.</p>
      </div>
    </main>
  );
}

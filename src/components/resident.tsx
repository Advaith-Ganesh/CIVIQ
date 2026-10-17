"use client";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  Map,
  ClipboardList,
  Users,
  ChartNoAxesCombined,
  Settings,
  CircleHelp,
  Search,
  Bell,
  ChevronRight,
  Upload,
  MapPin,
  ShieldCheck,
  Check,
  Activity,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Building2,
  Menu,
  X,
  Route,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  categories as defaultCategories,
  statuses,
  transitions,
  weightNames,
  financialModel,
} from "@/lib/rules";
import {
  CityMap,
  CategoryChart,
  Photo,
  Match,
  Issue,
  Meta,
  Metrics,
  initialMeta,
  api,
  upload,
  date,
  Badge,
  Status,
  Score,
  PageHeading,
  Message,
  Empty,
  Brand,
  StaffGate,
  useIssues,
} from "./shared";
export const detailsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(12, "Describe the problem in at least 12 characters.")
    .max(2000),
  location: z.string().trim().min(3, "Add a street or landmark.").max(160),
});

export function Report({ meta }: { meta: Meta }) {
  const [step, setStep] = useState(0),
    [photo, setPhoto] = useState<Photo | null>(null),
    [pick, setPick] = useState<[number, number]>([50.9097, -1.4044]),
    [selected, setSelected] = useState(false),
    [suggestion, setSuggestion] = useState<{
      assessment: {
        categoryId: string;
        confidence: number;
        explanation: string;
        urgent: boolean;
      };
      matches: {
        issueId: string;
        score: number;
        distance: number;
        explanation: string;
        issue: { title: string; location: string };
      }[];
    } | null>(null),
    [category, setCategory] = useState(""),
    [duplicate, setDuplicate] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      reference: string;
      issueId: string;
    } | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { description: "", location: "" },
  });
  const steps = [
    "Photograph",
    "Location",
    "Description",
    "Classification",
    "Duplicates",
    "Confirm",
  ];
  async function analyze(cat?: string) {
    setBusy(true);
    setError("");
    try {
      const s = await api<NonNullable<typeof suggestion>>("assess", {
        description: getValues("description"),
        lat: pick[0],
        lng: pick[1],
        categoryId: cat,
      });
      setSuggestion(s);
      setCategory(cat || s.assessment.categoryId);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <main className="report-wrap">
        <div className="success-card card">
          <span className="success-icon">
            <CheckCircle2 size={40} />
          </span>
          <div className="eyebrow">REPORT RECEIVED</div>
          <h1>Your city. Your contribution.</h1>
          <p>
            Your evidence is saved. Keep this reference to follow the
            maintenance journey.
          </p>
          <div className="reference-box" data-testid="tracking-reference">
            {result.reference}
          </div>
          <Button asChild>
            <Link href={`/track?ref=${result.reference}`}>
              Track this report <ArrowRight size={17} />
            </Link>
          </Button>
          <p>No name, email or phone number collected.</p>
        </div>
      </main>
    );
  return (
    <main className="report-wrap">
      <PageHeading
        eyebrow="RESIDENT REPORTING"
        title="Let’s make it better."
        subtitle="A few details can help turn a city problem into a coordinated repair."
      />
      <ol className="report-steps">
        {steps.map((s, n) => (
          <li
            className={n === step ? "current" : n < step ? "done" : ""}
            key={s}
          >
            <span>{n < step ? <Check size={14} /> : n + 1}</span>
            <small>{s}</small>
          </li>
        ))}
      </ol>
      <div className="card report-card">
        <div className="eyebrow">STEP {step + 1} OF 6</div>
        <h2>
          {
            [
              "Show us the problem",
              "Pinpoint the location",
              "Tell us what happened",
              "Review the suggestion",
              "Has it already been reported?",
              "Ready to send?",
            ][step]
          }
        </h2>
        <p>
          {
            [
              "Upload a JPEG, PNG or WebP photograph, up to 5 MB. Avoid faces, number plates and personal information.",
              "Click on the Southampton map, or enter precise coordinates below.",
              "Include the asset number for streetlights and signs when possible.",
              "Deterministic text rules suggest a category. You can correct it.",
              "Nearby issues are suggestions only. Confirm only if this is the same physical problem.",
              "Your photograph and report will be public. Check the information before submitting.",
            ][step]
          }
        </p>
        <Message text={error} />
        {step === 0 && (
          <>
            <label className="upload-zone">
              <Camera size={36} />
              <strong>{busy ? "Uploading…" : "Choose a photograph"}</strong>
              <span>JPEG, PNG or WebP · 5 MB maximum</span>
              <input
                aria-label="Problem photograph"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={async (e) => {
                  if (!e.target.files?.[0]) return;
                  setBusy(true);
                  setError("");
                  try {
                    setPhoto(await upload(e.target.files[0]));
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {photo && (
              <img
                className="report-preview"
                src={photo.path}
                alt="Uploaded problem photograph"
              />
            )}
            <div className="notice">
              <ShieldCheck size={19} />
              <span>
                Image metadata is removed. No AI image analysis is performed in
                this demonstration.
              </span>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <CityMap
              pick={pick}
              onPick={(lat, lng) => {
                setPick([lat, lng]);
                setSelected(true);
              }}
            />
            <div className="form-grid">
              <label>
                Latitude
                <input
                  aria-label="Latitude"
                  type="number"
                  step="0.00001"
                  value={pick[0]}
                  onChange={(e) => {
                    setPick([Number(e.target.value), pick[1]]);
                    setSelected(true);
                  }}
                />
              </label>
              <label>
                Longitude
                <input
                  aria-label="Longitude"
                  type="number"
                  step="0.00001"
                  value={pick[1]}
                  onChange={(e) => {
                    setPick([pick[0], Number(e.target.value)]);
                    setSelected(true);
                  }}
                />
              </label>
            </div>
            <small>
              The demo accepts coordinates within 50.85–50.97 N, 1.50–1.30 W.
              This is a bounding box, not an official city boundary.
            </small>
          </>
        )}
        {step === 2 && (
          <form
            id="description-form"
            onSubmit={handleSubmit(async () => {
              if (await analyze()) setStep(3);
            })}
          >
            <label>
              Street or landmark
              <input
                {...register("location")}
                placeholder="e.g. Portswood Road, beside the crossing"
              />
            </label>
            {errors.location && (
              <span role="alert" className="field-error">
                {errors.location.message}
              </span>
            )}
            <label>
              Describe the problem
              <textarea
                {...register("description")}
                rows={5}
                placeholder="What is damaged? How is it affecting people?"
              />
            </label>
            {errors.description && (
              <span role="alert" className="field-error">
                {errors.description.message}
              </span>
            )}
          </form>
        )}
        {step === 3 && suggestion && (
          <>
            <div className="classification-result">
              <span>
                <Sparkles size={23} />
              </span>
              <div>
                <Badge>DEMO MODE · TEXT RULES</Badge>
                <h3>{meta.categories.find((c) => c.id === category)?.name}</h3>
                <p>{suggestion.assessment.explanation}</p>
                <strong>
                  {Math.round(suggestion.assessment.confidence * 100)}% rule
                  confidence
                </strong>
              </div>
            </div>
            {suggestion.assessment.urgent && (
              <div className="notice danger">
                Potential safety wording detected. This demo is not monitored by
                emergency services. For immediate danger, contact emergency
                services on 999.{" "}
                <a href="https://www.gov.uk/contact-emergency-services">
                  Official guidance ↗
                </a>
              </div>
            )}
            <label>
              Correct the category if needed
              <select
                aria-label="Suggested classification"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {meta.categories
                  .filter((c) => c.active)
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="small-text">
              Confidence describes keyword coverage, not safety or photographic
              certainty.
            </p>
          </>
        )}
        {step === 4 && suggestion && (
          <>
            {suggestion.matches.length ? (
              suggestion.matches.map((m) => (
                <label
                  key={m.issueId}
                  className={`duplicate-choice ${duplicate === m.issueId ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="duplicate"
                    value={m.issueId}
                    checked={duplicate === m.issueId}
                    onChange={() => setDuplicate(m.issueId)}
                  />
                  <span>
                    <strong>{m.issue.title}</strong>
                    <small>
                      {m.issue.location} · {Math.round(m.score * 100)}%
                      potential match
                    </small>
                    <p>{m.explanation}</p>
                  </span>
                </label>
              ))
            ) : (
              <div className="notice">
                <CheckCircle2 />
                <span>
                  No nearby matching issues found. A new issue will be created.
                </span>
              </div>
            )}
            <label className="duplicate-choice">
              <input
                type="radio"
                name="duplicate"
                checked={!duplicate}
                onChange={() => setDuplicate("")}
              />
              <span>
                <strong>This is a separate problem</strong>
                <small>
                  Create a new canonical issue with its own evidence.
                </small>
              </span>
            </label>
          </>
        )}
        {step === 5 && (
          <div className="review-summary">
            <img src={photo?.path} alt="Report evidence review" />
            <dl>
              <dt>Category</dt>
              <dd>{meta.categories.find((c) => c.id === category)?.name}</dd>
              <dt>Location</dt>
              <dd>
                {getValues("location")}
                <small>
                  {pick[0].toFixed(5)}, {pick[1].toFixed(5)}
                </small>
              </dd>
              <dt>Description</dt>
              <dd>{getValues("description")}</dd>
              <dt>Matching decision</dt>
              <dd>
                {duplicate
                  ? "Confirm an existing issue"
                  : "Create a separate issue"}
              </dd>
            </dl>
            <div className="notice">
              By submitting, you acknowledge the public demonstration data
              handling described in our{" "}
              <Link href="/privacy">privacy notice</Link>.
            </div>
          </div>
        )}
        <div className="report-actions">
          <Button
            variant="outline"
            disabled={step === 0 || busy}
            onClick={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            Back
          </Button>
          <small>Anonymous · No account needed</small>
          {step === 2 ? (
            <Button type="submit" form="description-form" disabled={busy}>
              {busy ? "Reviewing…" : "Review classification"}
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              disabled={
                busy || (step === 0 && !photo) || (step === 1 && !selected)
              }
              onClick={async () => {
                setError("");
                if (
                  step === 1 &&
                  (pick[0] < 50.85 ||
                    pick[0] > 50.97 ||
                    pick[1] < -1.5 ||
                    pick[1] > -1.3)
                ) {
                  setError(
                    "Choose a location within the Southampton demo area.",
                  );
                  return;
                }
                if (step === 3) {
                  if (await analyze(category)) {
                    setDuplicate("");
                    setStep(4);
                  }
                  return;
                }
                if (step === 5) {
                  setBusy(true);
                  try {
                    setResult(
                      await api("reports", {
                        ...getValues(),
                        lat: pick[0],
                        lng: pick[1],
                        categoryId: category,
                        photoId: photo?.id,
                        confirmIssueId: duplicate || undefined,
                      }),
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                  return;
                }
                setStep(step + 1);
              }}
            >
              {busy ? "Saving…" : step === 5 ? "Submit report" : "Continue"}
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
      <p className="report-footnote">
        For immediate danger, use{" "}
        <a href="https://www.gov.uk/contact-emergency-services">
          official emergency services
        </a>
        . CIVIQ AI is an independent demonstration.
      </p>
    </main>
  );
}

export type Tracked = {
  reference: string;
  reportedAt: string;
  issue: {
    id: string;
    title: string;
    category: string;
    status: string;
    location: string;
    synthetic: boolean;
    events: { id: string; message: string; createdAt: string }[];
    before: string[];
    repairs: { outcome: string; verified: boolean; path: string }[];
  };
};

export function Tracking() {
  const [ref, setRef] = useState(""),
    [data, setData] = useState<Tracked | null>(null),
    [error, setError] = useState(""),
    [reason, setReason] = useState("");
  async function track(reference: string) {
    try {
      setData(
        await api<Tracked>(
          `track/${encodeURIComponent(reference.trim().toUpperCase())}`,
        ),
      );
      setError("");
    } catch (e) {
      setData(null);
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r) {
      setRef(r);
      track(r);
    }
  }, []);
  return (
    <main className="public-content narrow">
      <PageHeading
        eyebrow="RESIDENT TRACKING"
        title="Follow the progress."
        subtitle="Your report is the start. A verified outcome is the goal."
      />
      <form
        className="tracking-search"
        onSubmit={(e) => {
          e.preventDefault();
          track(ref);
        }}
      >
        <label>
          Tracking reference
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. CIV-DEMO-001"
            required
          />
        </label>
        <Button>
          Track report <ArrowRight size={16} />
        </Button>
      </form>
      <Message text={error} />
      {data && (
        <>
          <div className="card detail-section">
            <div className="card-heading simple">
              <h2>{data.issue.category}</h2>
              <Status value={data.issue.status} />
            </div>
            <p>{data.issue.title}</p>
            <p>
              <MapPin size={16} /> {data.issue.location} · Reported{" "}
              {date(data.reportedAt)}
            </p>
            {data.issue.synthetic && (
              <Badge type="amber">DEMO DATA · Fictional report</Badge>
            )}
            <ol className="timeline">
              {data.issue.events.map((e) => (
                <li key={e.id}>
                  <span className="timeline-point" />
                  <div>
                    <strong>{date(e.createdAt)}</strong>
                    <p>{e.message}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {data.issue.repairs.length > 0 && (
            <section className="card detail-section">
              <h2>Completion evidence</h2>
              <p>Verification is performed by a human officer.</p>
              <div className="photo-grid">
                <figure>
                  <img src={data.issue.before[0]} alt="Before repair" />
                  <figcaption>Before repair</figcaption>
                </figure>
                {data.issue.repairs.map((r, n) => (
                  <figure key={n}>
                    <img src={r.path} alt="After repair" />
                    <figcaption>
                      {r.verified
                        ? "Manually verified"
                        : "Pending verification"}
                    </figcaption>
                    <p>{r.outcome}</p>
                  </figure>
                ))}
              </div>
            </section>
          )}
          {["Verified closed", "Resolved pending verification"].includes(
            data.issue.status,
          ) && (
            <form
              className="card detail-section"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("reopen", { reference: data.reference, reason });
                  await track(data.reference);
                  setReason("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <h2>Does the issue need another look?</h2>
              <label>
                Reason for reopening
                <textarea
                  minLength={12}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain what remains unresolved. Do not include private personal information."
                />
              </label>
              <Button variant="outline">Request reopening</Button>
            </form>
          )}
        </>
      )}
    </main>
  );
}

export function PublicMap({ meta }: { meta: Meta }) {
  const [issues, setIssues] = useState<Issue[]>([]),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    api<Issue[]>("public")
      .then(setIssues)
      .catch((e) => setError(e.message));
  }, []);
  const filtered = issues.filter(
    (i) =>
      (!category || i.categoryId === category) &&
      (!status || i.status === status),
  );
  return (
    <main className="public-content">
      <PageHeading
        eyebrow="SOUTHAMPTON ISSUE MAP"
        title="A city we care for, together."
        subtitle="Explore public infrastructure reports. Demo locations are fictional examples."
        action={
          <Button asChild>
            <Link href="/report">
              Report a problem <ArrowUpRight size={16} />
            </Link>
          </Button>
        }
      />
      <Message text={error} />
      <div className="filters">
        <select
          aria-label="Map category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {meta.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Map status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span>{filtered.length} issues displayed</span>
      </div>
      <div className="public-map">
        <CityMap issues={filtered} />
      </div>
      <div className="map-accessible">
        <h2>Accessible issue list</h2>
        {filtered.map((i) => (
          <article key={i.id}>
            <h3>{i.title}</h3>
            <p>
              {i.location} ·{" "}
              {meta.categories.find((c) => c.id === i.categoryId)?.name}
            </p>
            <Status value={i.status} />{" "}
            {i.synthetic && <Badge>DEMO DATA</Badge>}
          </article>
        ))}
        {!filtered.length && <Empty />}
      </div>
    </main>
  );
}

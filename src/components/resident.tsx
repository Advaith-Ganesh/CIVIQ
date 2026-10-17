"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Check,
  CheckCircle2,
  Camera,
  Sparkles,
} from "lucide-react";
import { VisionResultCard } from "./vision-result";
import type { VisionResult } from "@/lib/local-model";
import { accessibilityOptions } from "@/lib/provenance";
import { Button } from "@/components/ui/button";
import { statuses } from "@/lib/rules";
import {
  CityMap,
  Photo,
  Issue,
  Meta,
  api,
  upload,
  date,
  Badge,
  Status,
  PageHeading,
  DataBadge,
  Message,
  Empty,
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
    [category, setCategory] = useState(""),
    [duplicate, setDuplicate] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [accessibility, setAccessibility] = useState<string[]>([]),
    [suggestion, setSuggestion] = useState<{
      assessment: {
        categoryId: string;
        confidence: number;
        explanation: string;
        urgent: boolean;
        method?: string;
      };
      vision?: VisionResult;
      matchingMethod: string;
      matches: {
        issueId: string;
        score: number;
        distance: number;
        explanation: string;
        issue: {
          title: string;
          location: string;
          lat: number;
          lng: number;
          synthetic?: boolean;
          dataType?: string;
        };
      }[];
    } | null>(null),
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
  const steps = ["Photo", "Location", "Details", "Check existing", "Submit"];
  async function addPhoto(file: File) {
    setBusy(true);
    setError("");
    try {
      setPhoto(await upload(file));
      setSuggestion(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function analyze(cat?: string) {
    setBusy(true);
    setError("");
    try {
      const s = await api<NonNullable<typeof suggestion>>("assess", {
        description: getValues("description"),
        lat: pick[0],
        lng: pick[1],
        photoId: photo?.id,
        categoryId: cat,
      });
      setSuggestion(s);
      setCategory(cat || s.assessment.categoryId);
      setDuplicate("");
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
            Your report and evidence are saved. Keep this reference to follow
            the maintenance journey.
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
        eyebrow="RESIDENT SERVICES / REPORT AN ISSUE"
        title="Let’s make it better."
        subtitle="Clear evidence helps the right team take the next step."
      />
      <ol className="report-steps">
        {steps.map((s, n) => (
          <li
            aria-current={n === step ? "step" : undefined}
            className={n === step ? "current" : n < step ? "done" : ""}
            key={s}
          >
            <span>{n < step ? <Check size={14} /> : n + 1}</span>
            <small>{s}</small>
          </li>
        ))}
      </ol>
      <div className="card report-card">
        <div className="eyebrow">STEP {step + 1} OF 5</div>
        <h2>
          {
            [
              "Show us the problem",
              "Pinpoint the location",
              "Add the useful details",
              "Check the suggestion and existing reports",
              "Check and submit",
            ][step]
          }
        </h2>
        <p>
          {
            [
              "Upload an image, drag it here or use your camera. Avoid faces, number plates and personal information.",
              "Click the Southampton map or enter coordinates. A precise location helps teams find the issue.",
              "Describe the physical problem. Add a streetlight or sign asset number where possible.",
              "Model suggestions and nearby matches require your review. Choose a separate issue if this is a different physical asset.",
              "Review what will be public. Your tracking reference will appear after the report is saved.",
            ][step]
          }
        </p>
        <Message text={error} />
        {step === 0 && (
          <>
            <label
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) addPhoto(e.dataTransfer.files[0]);
              }}
            >
              <Camera size={32} />
              <strong>
                {busy
                  ? "Validating and saving…"
                  : "Drop a photograph here, or browse"}
              </strong>
              <span>JPEG, PNG or WebP · up to 5 MB</span>
              <input
                aria-label="Problem photograph"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files?.[0]) addPhoto(e.target.files[0]);
                }}
              />
            </label>
            <label className="camera-option">
              Use your camera
              <input
                aria-label="Take a photograph"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files?.[0]) addPhoto(e.target.files[0]);
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
              <ShieldCheck size={18} />
              <span>
                Metadata is removed. In local model mode, the sanitized image
                stays on this computer. Manual reporting remains available if
                the model is offline.
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
              Accepted demo area: 50.85–50.97 N, 1.50–1.30 W. This is a bounding
              box, not an official city boundary.
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
                placeholder="Street name and a nearby landmark"
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
                rows={4}
                placeholder="What is damaged, and how is it affecting the street or path?"
              />
            </label>
            {errors.description && (
              <span role="alert" className="field-error">
                {errors.description.message}
              </span>
            )}
            <fieldset className="accessibility-fields">
              <legend>
                Access impact{" "}
                <span>
                  Optional · describe the obstruction, not personal medical
                  information
                </span>
              </legend>
              {accessibilityOptions.map(([id, label]) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={accessibility.includes(id)}
                    onChange={(e) =>
                      setAccessibility(
                        e.target.checked
                          ? [...accessibility, id]
                          : accessibility.filter((x) => x !== id),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </form>
        )}
        {step === 3 && suggestion && (
          <>
            {suggestion.vision ? (
              <VisionResultCard result={suggestion.vision} />
            ) : (
              <div className="classification-result">
                <Sparkles size={22} />
                <div>
                  <Badge>DEMO MODE · TEXT RULES</Badge>
                  <h3>
                    {meta.categories.find((c) => c.id === category)?.name}
                  </h3>
                  <p>{suggestion.assessment.explanation}</p>
                  <small>
                    {Math.round(suggestion.assessment.confidence * 100)}%
                    keyword rule coverage · no image model used
                  </small>
                </div>
              </div>
            )}
            {suggestion.assessment.urgent && (
              <div className="notice danger">
                Potential safety wording detected. This prototype is not
                monitored by emergency services.{" "}
                <a href="https://www.gov.uk/contact-emergency-services">
                  Official emergency guidance ↗
                </a>
              </div>
            )}
            <label>
              Correct the category if needed
              <select
                aria-label="Suggested classification"
                value={category}
                disabled={busy}
                onChange={(e) => analyze(e.target.value)}
              >
                {meta.categories
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="duplicate-heading">
              <h3>Potential existing reports</h3>
              <small>{suggestion.matchingMethod}</small>
            </div>
            {suggestion.matches.length ? (
              <>
                <CityMap
                  issues={suggestion.matches.map((m) => ({
                    ...m.issue,
                    id: m.issueId,
                    lat: m.issue.lat,
                    lng: m.issue.lng,
                    status: "Candidate",
                  }))}
                />
                {suggestion.matches.map((m) => (
                  <label
                    className={`duplicate-choice ${duplicate === m.issueId ? "selected" : ""}`}
                    key={m.issueId}
                  >
                    <input
                      type="radio"
                      name="duplicate"
                      checked={duplicate === m.issueId}
                      onChange={() => setDuplicate(m.issueId)}
                    />
                    <span>
                      <strong>{m.issue.title}</strong>
                      <DataBadge record={m.issue} />
                      <small>
                        {m.issue.location} · match score {m.score.toFixed(2)} /
                        1
                      </small>
                      <p>{m.explanation}</p>
                    </span>
                  </label>
                ))}
              </>
            ) : (
              <div className="notice">
                <CheckCircle2 size={18} />
                No matching nearby issue found. A new canonical issue will be
                created.
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
                  Keep this physical asset separate from nearby issues.
                </small>
              </span>
            </label>
          </>
        )}
        {step === 4 && (
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
              <dt>Association</dt>
              <dd>
                {duplicate
                  ? "Confirm an existing issue"
                  : "Create a separate issue"}
              </dd>
              <dt>Access impact</dt>
              <dd>
                {accessibility.length
                  ? accessibilityOptions
                      .filter(([id]) => accessibility.includes(id))
                      .map(([, label]) => label)
                      .join(", ")
                  : "None reported"}
              </dd>
            </dl>
            <div className="notice">
              Your report and photo are public demonstration records. See the{" "}
              <Link href="/privacy">privacy notice</Link>.
            </div>
          </div>
        )}
        <div className="report-actions">
          <Button
            variant="outline"
            type="button"
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
            <Button form="description-form" type="submit" disabled={busy}>
              {busy ? "Reviewing image and matches…" : "Review classification"}
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button
              type="button"
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
                    "Choose a location inside the Southampton demo area.",
                  );
                  return;
                }
                if (step === 4) {
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
                        accessibility,
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
              {busy ? "Saving…" : step === 4 ? "Submit report" : "Continue"}
              <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </div>
      <p className="report-footnote">
        For immediate danger, use{" "}
        <a href="https://www.gov.uk/contact-emergency-services">
          official emergency services
        </a>
        . This is an independent prototype.
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
    dataType?: string;
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
            <DataBadge record={data.issue} />
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
            <Status value={i.status} /> <DataBadge record={i} />
          </article>
        ))}
        {!filtered.length && <Empty />}
      </div>
    </main>
  );
}

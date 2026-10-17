"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Database,
  ArrowUpRight,
  RefreshCw,
  ScanEye,
  Search,
  Layers,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  api,
  upload,
  PageHeading,
  Badge,
  DataBadge,
  CityMap,
  StaffGate,
  LoadingSkeleton,
  Message,
  Status,
  Score,
  date,
  type Meta,
  type Issue,
  type Photo,
} from "./shared";
import { VisionResultCard } from "./vision-result";
import type { ModelStatus, VisionResult } from "@/lib/local-model";
import { dataTypes, dataLabels } from "@/lib/provenance";
type Evaluation = {
  id: string;
  modelId: string;
  revision: string;
  dataset: string;
  sampleSize: number;
  evaluatedAt: string;
  result: string;
};
type Lab = {
  model: ModelStatus;
  activeProvider: string;
  applicationClassifications: number;
  correctedPredictions: number;
  evaluations: Evaluation[];
  analyses: {
    id: string;
    status: string;
    categoryId: string | null;
    modelId: string | null;
    correctedCategoryId: string | null;
    durationMs: number | null;
    createdAt: string;
    photograph: Photo;
  }[];
};
type Source = {
  id: string;
  title: string;
  url: string;
  period: string;
  retrievedAt: string;
  importDate: string;
  note: string;
  dataType: string;
  licence: string;
  coverage: string;
  status: string;
  importedCount: number;
  originalRecordId?: string | null;
  payload: string;
};
export function AILab() {
  const [data, setData] = useState<Lab | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<VisionResult | null>(null),
    [photo, setPhoto] = useState<Photo | null>(null),
    [sources, setSources] = useState<Source[]>([]);
  const load = useCallback(
    () =>
      api<Lab>("ai-lab")
        .then((d) => {
          setData(d);
          setError("");
          window.dispatchEvent(new Event("civiq-meta-updated"));
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
    api<Source[]>("sources")
      .then(setSources)
      .catch(() => {});
  }, [load]);
  useEffect(() => {
    if (data?.model.state !== "loading") return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [data?.model.state, load]);
  async function sample(sourceId: string) {
    setBusy(true);
    setMessage("");
    try {
      const value = await api<{ photo: Photo; result: VisionResult }>(
        "lab-sample",
        { sourceId },
      );
      setPhoto(value.photo);
      setResult(value.result);
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <StaffGate reload={load} />;
  if (!data) return <LoadingSkeleton />;
  const model = data.model;
  return (
    <>
      <PageHeading
        eyebrow="MODEL OPERATIONS / EXPERIMENTAL"
        title="AI Lab"
        subtitle="Inspect real model state, observed inference and measured evaluation. No generated benchmark claims."
        action={
          <Button variant="outline" onClick={load}>
            <RefreshCw size={15} />
            Refresh status
          </Button>
        }
      />
      <Message text={message} />
      <div className="lab-state card">
        <div>
          <span className="lab-symbol">
            <ScanEye />
          </span>
          <div>
            <Badge type={model.loaded ? "blue" : "amber"}>
              {model.state.toUpperCase().replace("_", " ")}
            </Badge>
            <h2>{model.vision?.id || "Local inference unavailable"}</h2>
            <p>
              {model.loaded
                ? "Weights loaded on " +
                  model.device +
                  ". Image predictions require explicit inference."
                : model.lastError ||
                  "Download official weights, start the local service, then load the models."}
            </p>
            <small>
              Revision {model.vision?.revision || "unavailable"} ·{" "}
              {model.vision?.licence || "see model card"}
            </small>
          </div>
        </div>
        <Button
          disabled={busy || model.loaded || model.state === "loading"}
          onClick={async () => {
            setBusy(true);
            try {
              await api("model-load", {});
              setMessage(
                "Load requested. Status updates while weights are loading.",
              );
              await load();
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {model.state === "loading"
            ? "Loading cached weights…"
            : "Load cached models"}
        </Button>
      </div>
      <div className="stats-grid">
        {[
          [
            "Application classifications",
            data.applicationClassifications,
            "Successful image analyses stored by CIVIQ",
          ],
          [
            "Service predictions",
            model.classifications ?? "Unavailable",
            "Includes direct evaluation calls",
          ],
          [
            "Observed average",
            model.averageInferenceMs == null
              ? "Unavailable"
              : `${model.averageInferenceMs.toFixed(0)} ms`,
            "Actual service observations; not a latency guarantee",
          ],
          [
            "Corrected predictions",
            data.correctedPredictions,
            "Category corrections recorded by people",
          ],
        ].map(([label, value, note]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card detail-section">
          <h2>Run a real image assessment</h2>
          <p>
            These licensed evaluation images are not Southampton reports. They
            never acquire issue coordinates.
          </p>
          <div className="sample-buttons">
            {sources
              .filter((s) => s.dataType === "MODEL_EVALUATION")
              .map((s) => (
                <Button
                  variant="outline"
                  key={s.id}
                  disabled={busy || !model.loaded}
                  onClick={() => sample(s.id)}
                >
                  {s.id.replace("commons-", "Sample ")}{" "}
                  <ArrowUpRight size={13} />
                </Button>
              ))}
          </div>
          <label>
            Or upload an unlabelled test image
            <input
              aria-label="AI Lab photograph"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  const uploaded = await upload(file);
                  setPhoto(uploaded);
                  setResult(
                    await api<VisionResult>("lab-analyze", {
                      photoId: uploaded.id,
                    }),
                  );
                  await load();
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          <small>
            Unlabelled uploads are user-supplied tests, not an evaluation
            benchmark. Sanitized media is public to this local app.
          </small>
          {busy && (
            <div className="notice">
              Running local inference… the model handles one request at a time.
            </div>
          )}
        </section>
        <section className="card detail-section">
          <h2>Observed result</h2>
          {photo && (
            <img
              className="lab-photo"
              src={photo.path}
              alt="Actual image analysed by local model"
            />
          )}
          {result ? (
            <VisionResultCard result={result} />
          ) : (
            <div className="empty">
              <FlaskConical />
              <h3>No assessment selected</h3>
              <p>
                Run a sample or upload an image to see actual candidate scores.
              </p>
            </div>
          )}
        </section>
      </div>
      <section className="card detail-section">
        <h2>Measured evaluation</h2>
        {data.evaluations.length ? (
          data.evaluations.map((e) => {
            const value = JSON.parse(e.result) as {
              metrics: {
                accuracy: number;
                macroF1: number;
                perCategory: Record<
                  string,
                  {
                    support: number;
                    precision: number;
                    recall: number;
                    f1: number;
                  }
                >;
              };
              baseline: { metrics: { accuracy: number } };
              classDistribution: Record<string, number>;
              limitations: string[];
            };
            return (
              <div className="evaluation-card" key={e.id}>
                <div className="evaluation-header">
                  <div>
                    <Badge>MODEL EVALUATION · {e.sampleSize} IMAGES</Badge>
                    <h3>{e.dataset}</h3>
                    <p>
                      {e.modelId} · {date(e.evaluatedAt)}
                    </p>
                  </div>
                  <div>
                    <strong>{Math.round(value.metrics.accuracy * 100)}%</strong>
                    <small>On this tiny smoke sample only</small>
                  </div>
                </div>
                <p>
                  Distribution:{" "}
                  {Object.entries(value.classDistribution)
                    .map(([name, n]) => `${name}: ${n}`)
                    .join(" · ")}
                  . Deterministic majority baseline:{" "}
                  {Math.round(value.baseline.metrics.accuracy * 100)}%.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Samples</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(value.metrics.perCategory).map(
                      ([name, m]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>{m.support}</td>
                          <td>{m.precision.toFixed(2)}</td>
                          <td>{m.recall.toFixed(2)}</td>
                          <td>{m.f1.toFixed(2)}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                <div className="notice danger">
                  {value.limitations.join(" ")}
                </div>
              </div>
            );
          })
        ) : (
          <div className="notice">
            No evaluation has been imported. Run the documented sample download
            and evaluation scripts; no scores will be invented.
          </div>
        )}
      </section>
      <section className="card detail-section">
        <h2>Recent application analyses</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Result</th>
                <th>Provider</th>
                <th>Observed time</th>
                <th>Correction</th>
              </tr>
            </thead>
            <tbody>
              {data.analyses.map((a) => (
                <tr key={a.id}>
                  <td>{date(a.createdAt)}</td>
                  <td>
                    <Badge type={a.status === "available" ? "blue" : "amber"}>
                      {a.status}
                    </Badge>{" "}
                    {a.categoryId}
                  </td>
                  <td>{a.modelId || "Unavailable"}</td>
                  <td>
                    {a.durationMs == null
                      ? "—"
                      : `${a.durationMs.toFixed(0)} ms`}
                  </td>
                  <td>{a.correctedCategoryId || "None recorded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card detail-section">
        <h2>Current limitations</h2>
        <p>
          SigLIP is a generic zero-shot vision model, not a trained Southampton
          defect classifier. Raw logits and sigmoid similarities are
          uncalibrated. Daylight lamp photographs cannot establish electrical
          outages. MiniLM similarities support matching, and image comparisons
          support human repair review; neither establishes identity or safety.
          Model weights are cached outside Git. CPU is the default;
          MODEL_DEVICE=auto enables available acceleration.
        </p>
      </section>
    </>
  );
}
export function DataSources() {
  const [sources, setSources] = useState<Source[] | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    api<Source[]>("sources")
      .then((s) => {
        setSources(s);
        setError("");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  if (error) return <StaffGate reload={load} />;
  if (!sources) return <LoadingSkeleton />;
  return (
    <>
      <PageHeading
        eyebrow="DATA OPERATIONS / PROVENANCE"
        title="Data sources"
        subtitle="Official context, historical records, evaluation images and local reports are different datasets."
      />
      <Message text={message} />
      <div className="source-summary">
        {dataTypes.map((t) => (
          <Badge type="blue" key={t}>
            {dataLabels[t]}
          </Badge>
        ))}
      </div>
      <div className="source-grid">
        {sources.map((s) => (
          <section className="card detail-section" key={s.id}>
            <div className="source-title">
              <span className="feature-icon">
                <Database size={19} />
              </span>
              <DataBadge record={{ dataType: s.dataType }} />
            </div>
            <h2>{s.title}</h2>
            <a
              className="source-link"
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              View original source <ArrowUpRight size={13} />
            </a>
            <dl className="source-metadata">
              <dt>Licence / reuse</dt>
              <dd>{s.licence}</dd>
              <dt>Coverage</dt>
              <dd>{s.coverage}</dd>
              <dt>Reference period</dt>
              <dd>{s.period}</dd>
              {s.originalRecordId && (
                <>
                  <dt>Original record ID</dt>
                  <dd>{s.originalRecordId}</dd>
                </>
              )}
              {JSON.parse(s.payload || "{}").attribution && (
                <>
                  <dt>Attribution</dt>
                  <dd>{String(JSON.parse(s.payload).attribution)}</dd>
                </>
              )}
              <dt>Imported records</dt>
              <dd>{s.importedCount}</dd>
              <dt>Import timestamp</dt>
              <dd>{new Date(s.importDate).toLocaleString("en-GB")}</dd>
              <dt>Status</dt>
              <dd>{s.status.replaceAll("_", " ")}</dd>
            </dl>
            <div className="notice">{s.note}</div>
          </section>
        ))}
      </div>
      <section className="card detail-section">
        <h2>Validated manual manifest import</h2>
        <p>
          Import reviewed metadata and records. Explicit attribution, licence
          confirmation, dates, data classification and coverage are required.
          Historical issue rows require real supplied coordinates. Evaluation
          samples cannot have issue coordinates.
        </p>
        <label>
          Manifest JSON file
          <input
            aria-label="Dataset manifest"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2_000_000) {
                setMessage("Manifest exceeds 2 MB.");
                return;
              }
              setText(await f.text());
            }}
          />
        </label>
        <label>
          Reviewed manifest
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"source": {...}, "records": [...]}'
          />
        </label>
        <Button
          disabled={busy || !text.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await api<{ inserted: number; total: number }>(
                "imports",
                JSON.parse(text),
              );
              setMessage(
                `Imported ${result.inserted} new records; ${result.total} total for the source.`,
              );
              load();
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Validating…" : "Validate and import"}
        </Button>
        <p className="small-text">
          CSV, JSON, labelled image-directory and allowlisted public-endpoint
          imports are also supported by the CLI. No live council issue feed is
          configured.
        </p>
      </section>
    </>
  );
}
type Hotspot = {
  id: string;
  location: string;
  categoryId: string;
  dataType: string;
  count: number;
  days: number;
  radius: number;
  lat: number;
  lng: number;
  recurrenceRate: number;
  lastObserved: string;
  issueIds: string[];
  limitation: string;
};
export function Hotspots({ meta }: { meta: Meta }) {
  const [data, setData] = useState<Hotspot[] | null>(null),
    [days, setDays] = useState(30),
    [type, setType] = useState("USER_SUBMITTED"),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<{ hotspots: Hotspot[] }>(`hotspots?days=${days}`)
        .then((d) => {
          setData(d.hotspots);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [days],
  );
  useEffect(() => {
    load();
  }, [load]);
  if (error) return <StaffGate reload={load} />;
  if (!data) return <LoadingSkeleton />;
  const filtered = data.filter((h) => h.dataType === type);
  return (
    <>
      <PageHeading
        eyebrow="GEOGRAPHIC INTELLIGENCE / OBSERVED RECORDS"
        title="Hotspots & recurrence"
        subtitle="Concentrations of distinct canonical issues, separated by source classification."
      />
      <div className="filters card">
        <label>
          Observation window
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <label>
          Data classification
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="USER_SUBMITTED">User submitted</option>
            <option value="PUBLIC_HISTORICAL">Public historical</option>
            <option value="SYNTHETIC_DEMO">Synthetic demo only</option>
          </select>
        </label>
        <span>{filtered.length} observed concentrations · 150 m radius</span>
      </div>
      {type === "SYNTHETIC_DEMO" && (
        <div className="notice danger">
          SYNTHETIC DEMO: these clusters are fictional examples, not real city
          hotspots.
        </div>
      )}
      <section className="card detail-section">
        <CityMap
          issues={filtered.map((h) => ({
            id: h.id,
            title: `${h.count} ${meta.categories.find((c) => c.id === h.categoryId)?.name || h.categoryId} issues`,
            lat: h.lat,
            lng: h.lng,
            location: h.location,
            status: "Observed concentration",
            synthetic: h.dataType === "SYNTHETIC_DEMO",
          }))}
        />
      </section>
      {filtered.length ? (
        <div className="source-grid">
          {filtered.map((h) => (
            <section className="card detail-section" key={h.id}>
              <DataBadge record={{ dataType: h.dataType }} />
              <h2 className="hotspot-title">{h.location}</h2>
              <p>
                {meta.categories.find((c) => c.id === h.categoryId)?.name} ·{" "}
                {h.count} distinct canonical issues
              </p>
              <dl className="source-metadata">
                <dt>Time window</dt>
                <dd>{h.days} days</dd>
                <dt>Additional issues/day</dt>
                <dd>{h.recurrenceRate.toFixed(3)}</dd>
                <dt>Last observed</dt>
                <dd>{date(h.lastObserved)}</dd>
              </dl>
              {h.issueIds.map((id) => (
                <Link
                  className="team-task"
                  key={id}
                  href={`/dashboard/issues/${id}`}
                >
                  {id}
                  <ArrowUpRight size={14} />
                </Link>
              ))}
              <small>{h.limitation}</small>
            </section>
          ))}
        </div>
      ) : (
        <div className="card empty">
          <Layers />
          <h2>No observed concentrations in this source group</h2>
          <p>
            This is a valid result for a small dataset. Change the observation
            window or explicitly view synthetic examples.
          </p>
        </div>
      )}
      <div className="notice">
        Concentrations use distance to the first observed issue, not an official
        ward boundary or validated hotspot-risk model. Multiple reports of one
        canonical issue do not inflate the count. Nearby distinct streetlights
        may be unrelated.
      </div>
    </>
  );
}
export function OperationsSearch({ meta }: { meta: Meta }) {
  const [values, setValues] = useState({
      q: "",
      category: "",
      status: "",
      team: "",
      from: "",
      to: "",
      minPriority: "0",
      recurrence: false,
      type: "",
    }),
    [issues, setIssues] = useState<Issue[] | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true);
    try {
      const params = new URLSearchParams({
        ...values,
        recurrence: String(values.recurrence),
      });
      const result = await api<{ issues: Issue[]; queriedAt: string }>(
        `search?${params}`,
      );
      setIssues(result.issues);
      setMessage(
        `${result.issues.length} matches from stored records · ${new Date(result.queriedAt).toLocaleTimeString("en-GB")}`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="OPERATIONS / DATABASE SEARCH"
        title="Find the work that matters."
        subtitle="Search actual stored issues by category, location, dates, status, team, priority and recurrence."
      />
      <form
        className="card detail-section"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div className="search-form-grid">
          <label>
            Location, description or reference
            <input
              value={values.q}
              onChange={(e) => setValues({ ...values, q: e.target.value })}
            />
          </label>
          <label>
            Category
            <select
              value={values.category}
              onChange={(e) =>
                setValues({ ...values, category: e.target.value })
              }
            >
              <option value="">All categories</option>
              {meta.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={values.status}
              onChange={(e) => setValues({ ...values, status: e.target.value })}
            >
              <option value="">All statuses</option>
              {[
                "Submitted",
                "Under review",
                "Acknowledged",
                "Scheduled",
                "In progress",
                "Resolved pending verification",
                "Verified closed",
                "Reopened",
                "Rejected",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Service team
            <select
              value={values.team}
              onChange={(e) => setValues({ ...values, team: e.target.value })}
            >
              <option value="">All teams</option>
              {meta.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            From date
            <input
              type="date"
              value={values.from}
              onChange={(e) => setValues({ ...values, from: e.target.value })}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              value={values.to}
              onChange={(e) => setValues({ ...values, to: e.target.value })}
            />
          </label>
          <label>
            Minimum current priority
            <input
              type="number"
              min={0}
              max={100}
              value={values.minPriority}
              onChange={(e) =>
                setValues({ ...values, minPriority: e.target.value })
              }
            />
          </label>
          <label>
            Provenance
            <select
              value={values.type}
              onChange={(e) => setValues({ ...values, type: e.target.value })}
            >
              <option value="">All classifications</option>
              {dataTypes
                .filter(
                  (t) =>
                    !["OFFICIAL_AGGREGATE", "MODEL_EVALUATION"].includes(t),
                )
                .map((t) => (
                  <option key={t} value={t}>
                    {dataLabels[t]}
                  </option>
                ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={values.recurrence}
              onChange={(e) =>
                setValues({ ...values, recurrence: e.target.checked })
              }
            />
            Nearby same-category occurrences
          </label>
        </div>
        <Button disabled={busy}>
          <Search size={16} />
          {busy ? "Querying database…" : "Search stored issues"}
        </Button>
      </form>
      <Message text={message} />
      {issues && (
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>Issue</th>
                <th>Location</th>
                <th>Source</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/dashboard/issues/${i.id}`}>
                      {i.category.name}
                      <small>{i.reports[0]?.reference}</small>
                    </Link>
                  </td>
                  <td>{i.location}</td>
                  <td>
                    <DataBadge record={i} />
                  </td>
                  <td>
                    <Status value={i.status} />
                  </td>
                  <td>
                    <Score issue={i} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!issues.length && (
            <div className="empty">No stored issues match these filters.</div>
          )}
        </div>
      )}
    </>
  );
}

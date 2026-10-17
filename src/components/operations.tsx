"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight, Users, Search, ChevronRight } from "lucide-react";
import { VisionResultCard } from "./vision-result";
import type { VisionResult } from "@/lib/local-model";
import { accessibilityOptions } from "@/lib/provenance";
import { DataBadge, LoadingSkeleton } from "./shared";
import { Button } from "@/components/ui/button";
import {
  categories as defaultCategories,
  statuses,
  transitions,
  weightNames,
} from "@/lib/rules";
import {
  CityMap,
  CategoryChart,
  Photo,
  Issue,
  Meta,
  api,
  upload,
  date,
  Badge,
  Status,
  Score,
  PageHeading,
  Message,
  Empty,
  StaffGate,
  useIssues,
} from "./shared";
import { Calculator } from "./marketing";
export { CommandCentre as Dashboard } from "./command-centre";

export function IssueTable({ issues }: { issues: Issue[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Issue / evidence</th>
            <th>Location</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assigned team</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {issues.map((i) => (
            <tr key={i.id}>
              <td>
                <Link className="issue-cell" href={`/dashboard/issues/${i.id}`}>
                  <img
                    src={
                      i.reports[0]?.photographs[0]?.path || "/demo/other.svg"
                    }
                    alt="Issue evidence"
                  />
                  <span>
                    <strong>{i.category.name}</strong>
                    <small>
                      {i.reports[0]?.reference}{" "}
                      {i.synthetic ? "· DEMO DATA" : ""}
                    </small>
                    <span className="truncate">{i.title}</span>
                  </span>
                </Link>
              </td>
              <td>
                {i.location}
                <small>{date(i.createdAt)}</small>
              </td>
              <td>
                <Status value={i.status} />
              </td>
              <td>
                <Score issue={i} />
              </td>
              <td>
                {i.assignments[0]?.team.name || "Unassigned"}
                <small>
                  {i.reports.length} report{i.reports.length !== 1 ? "s" : ""}
                </small>
              </td>
              <td>
                <Link
                  href={`/dashboard/issues/${i.id}`}
                  aria-label={`Open ${i.title}`}
                >
                  <ChevronRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!issues.length && <Empty />}
    </div>
  );
}

export function Issues({ meta }: { meta: Meta }) {
  const { data, error, reload } = useIssues(),
    [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("priority"),
    [page, setPage] = useState(1);
  if (error) return <StaffGate reload={reload} />;
  if (!data) return <LoadingSkeleton />;
  const filtered = data.issues
    .filter(
      (i) =>
        (!category || i.categoryId === category) &&
        (!status || i.status === status) &&
        `${i.title} ${i.location} ${i.reports.map((r) => r.reference).join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "priority"
        ? (b.override ?? b.calculated.score) -
          (a.override ?? a.calculated.score)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  return (
    <>
      <PageHeading
        title="Every issue. One coordinated response."
        subtitle="Review evidence, identify duplicates and move maintenance forward."
        action={
          <Button asChild>
            <Link href="/report">
              New report <ArrowUpRight size={16} />
            </Link>
          </Button>
        }
      />
      <div className="card">
        <div className="filters">
          <label className="search-input">
            <Search size={17} />
            <input
              aria-label="Search issues"
              placeholder="Search reference, location or issue…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {meta.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Sort issues"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="priority">Highest priority</option>
            <option value="recent">Most recent</option>
          </select>
        </div>
        <IssueTable issues={filtered.slice((page - 1) * 8, page * 8)} />
        <div className="pagination">
          <span>
            {filtered.length} issues · Page {Math.min(page, pages)} of {pages}
          </span>
          <div>
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function IssueDetail({ id, meta }: { id: string; meta: Meta }) {
  const [issue, setIssue] = useState<Issue | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [team, setTeam] = useState(""),
    [scheduled, setScheduled] = useState(""),
    [note, setNote] = useState(""),
    [outcome, setOutcome] = useState(""),
    [photo, setPhoto] = useState<Photo | null>(null),
    [busy, setBusy] = useState(false),
    [override, setOverride] = useState(""),
    [reason, setReason] = useState(""),
    [comparison, setComparison] = useState<{
      available: boolean;
      recommendation: string;
      warning: string;
      cosineSimilarity?: number;
    } | null>(null);
  const load = useCallback(
    () =>
      api<Issue>(`issues/${id}`)
        .then((i) => {
          setIssue(i);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function action(action: string, value?: string, photoId?: string) {
    setBusy(true);
    setMessage("");
    try {
      await api(`issues/${id}`, {
        action,
        value,
        photoId,
        scheduledAt: scheduled || undefined,
      });
      setMessage("Saved. Audit history updated.");
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <StaffGate reload={load} />;
  if (!issue) return <LoadingSkeleton />;
  const i = issue;
  return (
    <>
      <Link className="back-link" href="/dashboard/issues">
        ← All issues
      </Link>
      <PageHeading
        title={i.category.name}
        subtitle={`${i.location} · ${i.reports[0]?.reference}`}
        action={<Status value={i.status} />}
      />
      <div className="detail-tags">
        <DataBadge record={i} />
        <Badge>Human review required</Badge>
        <Badge>{i.reports.length} associated reports</Badge>
      </div>
      <Message text={message} />
      <div className="detail-grid">
        <div>
          <section className="card detail-section">
            <h2>Reported evidence</h2>
            <p>{i.description}</p>
            {i.accessibility && i.accessibility !== "[]" && (
              <div className="notice">
                <strong>Reported access impact:</strong>{" "}
                {accessibilityOptions
                  .filter(([id]) =>
                    (JSON.parse(i.accessibility!) as string[]).includes(id),
                  )
                  .map(([, label]) => label)
                  .join(" · ")}
              </div>
            )}

            <div className="photo-grid">
              {i.reports.flatMap((r) =>
                r.photographs.map((p) => (
                  <figure key={p.id}>
                    <img src={p.path} alt={`Original report ${r.reference}`} />
                    <figcaption>
                      {r.reference} {r.synthetic ? "· DEMO DATA" : ""}
                    </figcaption>
                  </figure>
                )),
              )}
            </div>
            <CityMap issues={[i]} />
          </section>
          <section className="card detail-section">
            <h2>Repair & manual verification</h2>
            <p>
              Compare before and after evidence. A human officer must approve
              closure.
            </p>
            {i.repairs.length > 0 ? (
              <div className="photo-grid">
                <figure>
                  <img
                    src={i.reports[0]?.photographs[0]?.path}
                    alt="Before repair"
                  />
                  <figcaption>Before</figcaption>
                </figure>
                {i.repairs.map((r) => (
                  <figure key={r.id}>
                    <img src={r.photograph.path} alt="After repair" />
                    <figcaption>
                      After ·{" "}
                      {r.verified
                        ? "Manually verified"
                        : "Awaiting manual verification"}
                    </figcaption>
                    <p>{r.outcome}</p>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="muted">No repair evidence yet.</p>
            )}
            {i.repairs.length > 0 && (
              <div className="repair-support">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      setComparison(
                        await api("repair-compare", {
                          beforeId: i.reports[0]?.photographs[0]?.id,
                          afterId:
                            i.repairs[i.repairs.length - 1].photograph.id,
                        }),
                      );
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Compare visual embeddings
                </Button>
                {comparison && (
                  <div className="notice">
                    <div>
                      <strong>{comparison.recommendation}</strong>
                      <p>
                        {comparison.cosineSimilarity !== undefined
                          ? `Cosine similarity ${comparison.cosineSimilarity.toFixed(3)}. `
                          : ""}
                        {comparison.warning}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <label>
              Completion photograph
              <input
                aria-label="Completion photograph"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  if (!e.target.files?.[0]) return;
                  setBusy(true);
                  try {
                    setPhoto(await upload(e.target.files[0]));
                    setMessage(
                      "Completion photograph uploaded. Record the repair outcome to attach it.",
                    );
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {photo && (
              <img
                className="small-preview"
                src={photo.path}
                alt="Completion preview"
              />
            )}
            <label>
              Repair outcome
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Describe the work completed and any remaining limitations."
              />
            </label>
            <Button
              disabled={busy || !photo || !outcome.trim()}
              onClick={() => action("repair", outcome, photo?.id)}
            >
              Save repair evidence
            </Button>
          </section>
          <section className="card detail-section">
            <h2>Potential duplicate evidence</h2>
            {i.reports.flatMap((r) => r.matches).length ? (
              i.reports.flatMap((r) =>
                r.matches.map((m) => (
                  <div key={m.id} className="duplicate-card">
                    <strong>
                      {Math.round(m.score * 100)}% potential match ·{" "}
                      {Math.round(m.distance)} m
                    </strong>
                    <p>{m.explanation}</p>
                    <Badge>{m.decision}</Badge>
                    {m.decision === "Pending" && (
                      <div className="button-row">
                        {["Confirmed", "Rejected"].map((decision) => (
                          <Button
                            key={decision}
                            disabled={busy}
                            variant={
                              decision === "Rejected" ? "outline" : "default"
                            }
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await api("matches", { id: m.id, decision });
                                setMessage(`Match ${decision.toLowerCase()}.`);
                                await load();
                              } catch (e) {
                                setMessage((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {decision === "Confirmed"
                              ? "Confirm match"
                              : "Reject match"}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )),
              )
            ) : (
              <p>No potential matches stored for these reports.</p>
            )}
          </section>
          <section className="card detail-section">
            <h2>Timeline & permanent audit history</h2>
            <ol className="timeline">
              {i.events.map((e) => (
                <li key={e.id}>
                  <span className="timeline-point" />
                  <div>
                    <strong>
                      {e.kind} {!e.public && <Badge>Staff only</Badge>}
                    </strong>
                    <p>{e.message}</p>
                    <small>
                      {date(e.createdAt)} · {e.actor.name}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            <label>
              Private staff note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <Button
              variant="outline"
              disabled={busy || !note.trim()}
              onClick={() => action("note", note)}
            >
              Add staff note
            </Button>
          </section>
        </div>
        <div>
          <section className="card detail-section">
            <div className="card-heading simple">
              <h2>Priority intelligence</h2>
              <Score issue={i} />
            </div>
            <p>Rule-based decision support. Not official council policy.</p>
            {i.calculated.breakdown.map((b) => (
              <div className="priority-row" key={b.name}>
                <div>
                  <span>{b.name}</span>
                  <strong>
                    {b.points}/{b.weight}
                  </strong>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${b.weight ? (b.points / b.weight) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="small-text">
              Severity {i.severity}/5 from text rules ·{" "}
              {i.calculated.recurrence} nearby same-category occurrences.
              Uncertainty is separate from danger.
            </p>
            <label>
              Human override score
              <input
                type="number"
                min="0"
                max="100"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
            </label>
            <label>
              Override reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button
              variant="outline"
              disabled={busy || !override || !reason.trim()}
              onClick={() => action("override", `${override}|${reason}`)}
            >
              Save audited override
            </Button>
          </section>
          <section className="card detail-section">
            <h2>Coordinate maintenance</h2>
            <p>
              Current team:{" "}
              <strong>{i.assignments[0]?.team.name || "Unassigned"}</strong>
            </p>
            <label>
              Maintenance team
              <select
                aria-label="Maintenance team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              >
                <option value="">Select a team</option>
                {meta.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Scheduled date
              <input
                type="date"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
              />
            </label>
            <Button
              disabled={busy || !team}
              onClick={() => action("assign", team)}
            >
              Assign team
            </Button>
            {i.assignments[0]?.scheduledAt && (
              <p>Scheduled: {date(i.assignments[0].scheduledAt)}</p>
            )}
            <hr />
            <label>
              Update lifecycle
              <select
                aria-label="Update lifecycle"
                value=""
                disabled={busy}
                onChange={(e) => action("status", e.target.value)}
              >
                <option value="">Choose next status…</option>
                {(transitions[i.status] || []).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <small>
              Repair evidence is required before resolving or verifying closure.
              Selecting Verified closed records human approval.
            </small>
          </section>
          <section className="card detail-section">
            <h2>Classification review</h2>
            <label>
              Issue category
              <select
                value={i.categoryId}
                onChange={(e) => action("classify", e.target.value)}
              >
                {meta.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {i.reports.flatMap((r) =>
              r.photographs.flatMap((p) =>
                (p.analyses || []).map((a) => (
                  <VisionResultCard
                    key={a.id}
                    result={JSON.parse(a.result) as VisionResult}
                  />
                )),
              ),
            )}
            {i.assessments.map((a, n) => (
              <div key={n}>
                <Badge>
                  {a.provider.startsWith("demo:")
                    ? `${Math.round(a.confidence * 100)}% keyword coverage`
                    : a.provider.startsWith("local:")
                      ? "Local model · uncalibrated"
                      : "Manual classification"}
                </Badge>
                <p>{a.explanation}</p>
                <small>{a.provider}</small>
              </div>
            ))}
          </section>
          <section className="card detail-section">
            <h2>Associated reports</h2>
            {i.reports.map((r) => (
              <div className="associated" key={r.id}>
                <Link href={`/track?ref=${r.reference}`}>
                  <strong>{r.reference} ↗</strong>
                </Link>
                <p>{r.description}</p>
                <DataBadge record={r} />
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}

export function Teams({ meta, refresh }: { meta: Meta; refresh: () => void }) {
  const { data, error, reload } = useIssues(),
    [name, setName] = useState(""),
    [area, setArea] = useState(""),
    [message, setMessage] = useState("");
  if (error) return <StaffGate reload={reload} />;
  return (
    <>
      <PageHeading
        title="The right work. The right team."
        subtitle="Coordinate maintenance with accountable teams and a shared view of workload."
      />
      <Message text={message} />
      <div className="team-grid">
        {meta.teams.map((t) => {
          const assigned =
            data?.issues.filter(
              (i) =>
                i.assignments[0]?.team.id === t.id &&
                !["Verified closed", "Rejected"].includes(i.status),
            ) || [];
          return (
            <section className="card detail-section" key={t.id}>
              <span className="team-icon">
                <Users />
              </span>
              <h2>{t.name}</h2>
              <p>{t.area}</p>
              <strong className="team-count">
                {assigned.length}
                <small> active assignments</small>
              </strong>
              <hr />
              {assigned.length ? (
                assigned.map((i) => (
                  <Link
                    className="team-task"
                    key={i.id}
                    href={`/dashboard/issues/${i.id}`}
                  >
                    <span>
                      <strong>{i.category.name}</strong>
                      <small>{i.location}</small>
                    </span>
                    <ChevronRight size={16} />
                  </Link>
                ))
              ) : (
                <p>No active assignments.</p>
              )}
            </section>
          );
        })}
      </div>
      <section className="card detail-section">
        <h2>Geographic task view</h2>
        <CityMap
          issues={data?.issues.filter((i) => i.assignments.length > 0) || []}
          staff
        />
      </section>
      <form
        className="card detail-section"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("teams", { name, area });
            setName("");
            setArea("");
            refresh();
            setMessage("Team created.");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <h2>Create a maintenance team</h2>
        <div className="form-grid">
          <label>
            Team name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={3}
              required
            />
          </label>
          <label>
            Service area
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              minLength={3}
              required
            />
          </label>
        </div>
        <Button>Create team</Button>
      </form>
    </>
  );
}

export function Insights() {
  const { data, error, reload } = useIssues();
  if (error) return <StaffGate reload={reload} />;
  if (!data)
    return (
      <div className="loading">Calculating insights from stored reports…</div>
    );
  const { issues, metrics: m } = data;
  const age = issues.filter(
    (i) =>
      !["Verified closed", "Rejected"].includes(i.status) &&
      Date.now() - new Date(i.createdAt).getTime() > 14 * 86400000,
  );
  const byDay = Object.entries(
    [...issues.flatMap((i) => i.reports)]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .reduce(
        (a, r) => {
          const day = date(r.createdAt);
          a[day] = (a[day] || 0) + 1;
          return a;
        },
        {} as Record<string, number>,
      ),
  ).map(([name, value]) => ({ name, value }));
  return (
    <>
      <PageHeading
        title="Better decisions, grounded in evidence."
        subtitle="Operational insights from the local database. Synthetic data is not a council performance measure."
      />
      <div className="stats-grid">
        {[
          [
            "Confirmed duplicate reduction",
            `${m.reports ? Math.round((m.duplicates / m.reports) * 100) : 0}%`,
            `${m.duplicates} additional reports associated`,
          ],
          [
            "Closure rate",
            `${m.unique ? Math.round((m.resolved / m.unique) * 100) : 0}%`,
            "Verified closed / canonical issues",
          ],
          [
            "Ageing unresolved issues",
            age.length,
            "Open for more than 14 days",
          ],
          [
            "Scheduled maintenance",
            m.scheduled,
            "Issues with Scheduled status",
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
          <h2>Issue categories</h2>
          <CategoryChart
            data={defaultCategories
              .map(([id, name]) => ({
                name: name.replace("Damaged ", ""),
                value: issues.filter((i) => i.categoryId === id).length,
              }))
              .filter((x) => x.value)}
          />
        </section>
        <section className="card detail-section">
          <h2>Report volume by date</h2>
          <CategoryChart data={byDay} time />
        </section>
      </div>
      <section className="card detail-section">
        <h2>Recurring locations</h2>
        <p>
          Same-category issues within 75 metres, across all statuses. Repeated
          reports of one issue are counted separately as confirmations.
        </p>
        {issues.filter((i) => i.calculated.recurrence > 0).length ? (
          issues
            .filter((i) => i.calculated.recurrence > 0)
            .map((i) => (
              <Link
                className="team-task"
                href={`/dashboard/issues/${i.id}`}
                key={i.id}
              >
                <span>
                  {i.location} · {i.category.name}
                </span>
                <Badge>{i.calculated.recurrence} nearby occurrence(s)</Badge>
              </Link>
            ))
        ) : (
          <p>No repeated canonical locations detected.</p>
        )}
      </section>
      <Calculator
        observedReports={m.reports}
        observedDuplicates={m.duplicates}
      />
      <section className="card detail-section">
        <h2>Administrative time scenario</h2>
        <p>
          At an assumed 5 minutes saved per confirmed additional report, the
          current dataset represents {((m.duplicates * 5) / 60).toFixed(2)}{" "}
          modelled staff hours. This is an assumption applied to {m.duplicates}{" "}
          records, not measured savings.
        </p>
      </section>
    </>
  );
}

export function SettingsPage({
  meta,
  refresh,
}: {
  meta: Meta;
  refresh: () => void;
}) {
  const [weights, setWeights] = useState([35, 20, 15, 10, 10, 10]),
    [distance, setDistance] = useState(75),
    [reset, setReset] = useState(""),
    [provider, setProvider] = useState("demo"),
    [threshold, setThreshold] = useState(0.1),
    [margin, setMargin] = useState(0.35),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Meta["categories"][number] | null>(null);
  const load = () =>
    api<{
      weights: number[];
      distance: number;
      provider: string;
      reviewThreshold: number;
      marginThreshold: number;
    }>("settings")
      .then((s) => {
        setWeights(s.weights);
        setDistance(s.distance);
        setProvider(s.provider);
        setThreshold(s.reviewThreshold);
        setMargin(s.marginThreshold);
        setError("");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  if (error) return <StaffGate reload={load} />;
  return (
    <>
      <PageHeading
        title="Transparent by configuration."
        subtitle="Tune the demonstration rules, service ownership and category vocabulary."
      />
      <Message text={message} />
      <div className="dashboard-grid">
        <form
          className="card detail-section"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("settings", {
                weights,
                distance,
                provider,
                reviewThreshold: threshold,
                marginThreshold: margin,
              });
              refresh();
              setMessage(
                "Rules saved. Priorities recalculate from stored data.",
              );
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <h2>Priority weights</h2>
          <p>
            Weights must total 100. These are product demonstration rules, not
            council policy.
          </p>
          {weightNames.map((name, n) => (
            <label className="weight-input" key={name}>
              {name}
              <input
                type="number"
                min="0"
                max="100"
                value={weights[n]}
                onChange={(e) =>
                  setWeights(
                    weights.map((x, i) =>
                      i === n ? Number(e.target.value) : x,
                    ),
                  )
                }
              />
            </label>
          ))}
          <p>
            Total: <strong>{weights.reduce((s, n) => s + n, 0)} / 100</strong>
          </p>
          <label>
            Duplicate distance threshold (metres)
            <input
              type="number"
              min="10"
              max="200"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
            />
          </label>
          <Button>Save rules</Button>
        </form>
        <section className="card detail-section">
          <h2>Model mode & access</h2>
          <Badge type="blue">{meta.mode}</Badge>
          <p>
            Real SigLIP image classification and MiniLM embeddings run in the
            local Python service. Demo mode uses labelled text rules. Model
            failure leaves manual classification available.
          </p>
          <label>
            Analysis provider
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="demo">Demo text rules (no image inference)</option>
              <option value="local">Local pretrained models</option>
            </select>
          </label>
          <label>
            Minimum sigmoid similarity (uncalibrated)
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <label>
            Minimum top-two raw logit margin
            <input
              type="number"
              min={0}
              max={5}
              step={0.05}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </label>
          <p>
            Use Save rules to apply these settings. Thresholds are experimental
            review heuristics, not calibrated safety probabilities.{" "}
            <Link href="/dashboard/ai-lab">Inspect AI Lab ↗</Link>
          </p>
          <p>
            Local demo staff access:{" "}
            <strong>
              {meta.localDemo
                ? "enabled in development"
                : "disabled; staff token required"}
            </strong>
            . Inference credentials and staff secrets remain server
            configuration.
          </p>
          <hr />
          <h2>Safe demo reset</h2>
          <p>
            Recreates fictional seed issues. Resident submissions are preserved.
            Disabled outside local development demo mode.
          </p>
          <label>
            Type RESET DEMO
            <input value={reset} onChange={(e) => setReset(e.target.value)} />
          </label>
          <Button
            variant="destructive"
            disabled={!meta.localDemo || reset !== "RESET DEMO"}
            onClick={async () => {
              try {
                await api("reset", { confirm: reset });
                setReset("");
                setMessage(
                  "Fictional demonstration records restored. Resident reports preserved.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Reset fictional records
          </Button>
        </section>
      </div>
      <section className="card detail-section">
        <h2>Categories & responsible service teams</h2>
        <div className="category-list">
          {meta.categories.map((c) => (
            <button key={c.id} onClick={() => setEditing({ ...c })}>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {meta.teams.find((t) => t.id === c.teamId)?.name ||
                    "Unassigned service"}{" "}
                  · {c.active ? "Active" : "Inactive"}
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
        {editing && (
          <form
            className="category-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("category", editing);
                refresh();
                setEditing(null);
                setMessage("Category updated.");
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <h3>Edit category</h3>
            <label>
              Category name
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              Classification keywords
              <input
                value={editing.keywords}
                onChange={(e) =>
                  setEditing({ ...editing, keywords: e.target.value })
                }
              />
            </label>
            <label>
              Responsible team
              <select
                value={editing.teamId || ""}
                onChange={(e) =>
                  setEditing({ ...editing, teamId: e.target.value || null })
                }
              >
                <option value="">Unassigned</option>
                {meta.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
              />
              Enabled for new reports
            </label>
            <Button>Save category</Button>
          </form>
        )}
      </section>
    </>
  );
}

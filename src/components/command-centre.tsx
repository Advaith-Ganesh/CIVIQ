"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  ScanEye,
  Users,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Layers,
  LocateFixed,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  useIssues,
  StaffGate,
  LoadingSkeleton,
  PageHeading,
  CityMap,
  Badge,
  Status,
  Score,
  DataBadge,
  Message,
  type Meta,
  type Issue,
} from "./shared";
import { api } from "./shared";
export function CommandCentre({ meta }: { meta: Meta }) {
  const { data, error, reload } = useIssues();
  const [selected, setSelected] = useState(""),
    [filter, setFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [team, setTeam] = useState(""),
    [busy, setBusy] = useState(false);
  if (error) return <StaffGate reload={reload} />;
  if (!data) return <LoadingSkeleton />;
  const issues = data.issues.filter(
    (i) =>
      filter === "all" ||
      (filter === "active"
        ? !["Verified closed", "Rejected"].includes(i.status)
        : filter === "USER_SUBMITTED"
          ? !i.synthetic && i.dataType !== "PUBLIC_HISTORICAL"
          : i.synthetic),
  );
  const queue = [...issues]
    .filter((i) => !["Verified closed", "Rejected"].includes(i.status))
    .sort(
      (a, b) =>
        (b.override ?? b.calculated.score) - (a.override ?? a.calculated.score),
    );
  const issue = issues.find((i) => i.id === selected) || queue[0] || issues[0];
  const m = data.metrics;
  async function assign() {
    if (!issue || !team) return;
    setBusy(true);
    try {
      await api(`issues/${issue.id}`, { action: "assign", value: team });
      setMessage("Team assigned. Audit history updated.");
      reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CITY OPERATIONS / SOUTHAMPTON"
        title="Southampton command centre"
        subtitle="One operational picture. Evidence, ownership and the next action."
        action={
          <Button asChild>
            <Link href="/report">
              New report <ArrowUpRight size={16} />
            </Link>
          </Button>
        }
      />
      <div className="command-kpis">
        {[
          [
            ClipboardList,
            "Incoming reports",
            m.reports,
            `${m.unique} canonical issues`,
          ],
          [
            Layers,
            "Additional confirmations",
            m.duplicates,
            `${m.potential} potential matches`,
          ],
          [
            AlertTriangle,
            "Awaiting review",
            m.review,
            `${m.high} high-priority issues`,
          ],
          [
            CheckCircle2,
            "Verified closed",
            m.resolved,
            m.average === null
              ? "No resolution time yet"
              : `${m.average.toFixed(1)} days average`,
          ],
        ].map(([Icon, label, value, note], n) => {
          const I = Icon as typeof Layers;
          return (
            <div className="command-kpi" key={n}>
              <I size={18} />
              <div>
                <span>{label as string}</span>
                <strong>{value as number}</strong>
                <small>{note as string}</small>
              </div>
            </div>
          );
        })}
      </div>
      <Message text={message} />
      <div className="command-layout">
        <div className="command-main">
          <section className="card command-map">
            <div className="card-heading">
              <div>
                <h2>Southampton at a glance</h2>
                <p>
                  Select a map marker or queue item to inspect its evidence.
                </p>
              </div>
              <label className="compact-select">
                Records
                <select
                  aria-label="Command centre records"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All stored issues</option>
                  <option value="active">Active issues</option>
                  <option value="USER_SUBMITTED">User submitted</option>
                  <option value="SYNTHETIC_DEMO">Synthetic demo</option>
                </select>
              </label>
            </div>
            <CityMap
              issues={issues}
              staff
              onSelect={setSelected}
              selectedId={issue?.id}
            />
            <div className="map-footer">
              <span>
                <i className="legend blue" />
                Active
              </span>
              <span>
                <i className="legend green" />
                Verified
              </span>
              <span>
                {issues.filter((i) => i.synthetic).length} synthetic ·{" "}
                {issues.filter((i) => !i.synthetic).length} non-synthetic
              </span>
            </div>
          </section>
          <section className="card command-queue">
            <div className="card-heading">
              <div>
                <h2>Priority action queue</h2>
                <p>Calculated triage support, with human override.</p>
              </div>
              <Link href="/dashboard/issues">
                All issues <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="command-queue-head">
              <span>Issue / location</span>
              <span>Status</span>
              <span>Priority</span>
            </div>
            {queue.slice(0, 6).map((i) => (
              <button
                className={`command-queue-row ${issue?.id === i.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(i.id);
                  setTeam("");
                }}
                key={i.id}
              >
                <span>
                  <strong>{i.category.name}</strong>
                  <small>{i.location}</small>
                </span>
                <Status value={i.status} />
                <Score issue={i} />
                <ChevronRight size={14} />
              </button>
            ))}
            {!queue.length && (
              <p className="empty">No active issues in this view.</p>
            )}
          </section>
        </div>
        <aside
          className="card issue-inspector"
          aria-label="Contextual issue inspector"
        >
          {issue ? (
            <Inspector
              issue={issue}
              meta={meta}
              team={team}
              setTeam={setTeam}
              busy={busy}
              assign={assign}
            />
          ) : (
            <div className="empty">
              <LocateFixed />
              <h2>Select an issue</h2>
              <p>Choose an issue on the map or in the queue.</p>
            </div>
          )}
        </aside>
      </div>
      <div className="context-strip">
        <span>Stored application records · provenance is shown per issue</span>
        <span>Independent reporter identities are not verified</span>
      </div>
    </>
  );
}
function Inspector({
  issue: i,
  meta,
  team,
  setTeam,
  busy,
  assign,
}: {
  issue: Issue;
  meta: Meta;
  team: string;
  setTeam: (v: string) => void;
  busy: boolean;
  assign: () => void;
}) {
  const recommended = meta.teams.find(
    (t) => t.id === meta.categories.find((c) => c.id === i.categoryId)?.teamId,
  );
  const analysis = i.reports.flatMap((r) =>
    r.photographs.flatMap((p) => p.analyses || []),
  )[0];
  let modelLabel = "No image assessment";
  if (analysis) {
    try {
      const result = JSON.parse(analysis.result);
      modelLabel = result.available
        ? `${result.abstained ? "Abstained" : "Raw logit " + result.candidates[0]?.rawScore?.toFixed(2)} · not probability`
        : "Model unavailable — manual review";
    } catch {
      modelLabel = "Manual review";
    }
  }
  return (
    <>
      <div className="inspector-heading">
        <span>ISSUE INSPECTOR</span>
        <Badge>{i.reports[0]?.reference || i.id}</Badge>
      </div>
      <img
        className="inspector-photo"
        src={i.reports[0]?.photographs[0]?.path || "/demo/other.svg"}
        alt="Selected issue evidence"
      />
      <div className="inspector-body">
        <DataBadge record={i} />
        <h2>{i.category.name}</h2>
        <p className="inspector-address">
          <MapPin size={14} />
          {i.location}
        </p>
        <div className="inspector-status">
          <Status value={i.status} />
          <Score issue={i} />
        </div>
        <p>{i.description}</p>
        <dl>
          <dt>
            <ScanEye size={14} />
            Report confidence
          </dt>
          <dd>{modelLabel}</dd>
          <dt>
            <Users size={14} />
            Associated reports
          </dt>
          <dd>{i.reports.length} submissions · independence unverified</dd>
          <dt>Recommended service</dt>
          <dd>{recommended?.name || "Review service ownership"}</dd>
          <dt>Assigned team</dt>
          <dd>{i.assignments[0]?.team.name || "Unassigned"}</dd>
        </dl>
        {i.accessibility && i.accessibility !== "[]" && (
          <div className="notice">
            Accessibility impact reported. Review details before dispatch.
          </div>
        )}
        <label>
          Assign maintenance team
          <select
            aria-label="Inspector maintenance team"
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
        <Button disabled={busy || !team} onClick={assign}>
          {busy ? "Assigning…" : "Assign team"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/issues/${i.id}`}>
            Full issue details <ArrowUpRight size={15} />
          </Link>
        </Button>
        <small>
          Routing reflects configured demo responsibilities, not verified
          council boundaries.
        </small>
      </div>
    </>
  );
}

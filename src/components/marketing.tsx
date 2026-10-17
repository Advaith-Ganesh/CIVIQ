"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Users,
  ChartNoAxesCombined,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Check,
  Activity,
  Layers,
  CheckCircle2,
  Camera,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { financialModel } from "@/lib/rules";
import { Badge, PageHeading, api } from "./shared";
export function Calculator({
  observedReports,
  observedDuplicates,
}: { observedReports?: number; observedDuplicates?: number } = {}) {
  const [v, setV] = useState([
    observedReports ?? 12000,
    observedReports ? ((observedDuplicates ?? 0) / observedReports) * 100 : 25,
    5,
    25,
    1500,
  ]);
  const model = financialModel(
    ...(v as [number, number, number, number, number]),
  );
  return (
    <div className="calculator">
      <div>
        <Badge>ILLUSTRATIVE MODEL · NOT MEASURED SAVINGS</Badge>
        <h2>Make the assumptions yours.</h2>
        {observedReports !== undefined && (
          <p className="notice">
            Initial scenario: {observedReports} stored reports and{" "}
            {observedDuplicates} additional confirmations. These are observed
            dataset counts, not measured annual volumes; edit the annual
            scenario below.
          </p>
        )}
        <p>
          Model the administrative value of time saved on duplicate reports.
          This excludes repair costs, implementation costs and wider benefits.
        </p>
        <div className="form-grid">
          {[
            "Annual incoming reports",
            "Duplicate reports (%)",
            "Minutes saved per duplicate",
            "Staff cost (£ / hour)",
            "Platform cost (£ / month)",
          ].map((label, n) => (
            <label key={label}>
              {label}
              <input
                type="number"
                min="0"
                max={n === 1 ? 100 : 10000000}
                value={v[n]}
                onChange={(e) =>
                  setV(
                    v.map((x, i) =>
                      i === n
                        ? Math.max(
                            0,
                            Math.min(
                              n === 1 ? 100 : 10000000,
                              Number(e.target.value),
                            ),
                          )
                        : x,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
      </div>
      <div className="calculator-result">
        <small>MODELLED ANNUAL ADMINISTRATIVE TIME VALUE</small>
        <strong>£{Math.round(model.value).toLocaleString("en-GB")}</strong>
        <p>
          {Math.round(model.hours).toLocaleString("en-GB")} staff hours ·
          editable assumptions
        </p>
        <hr />
        <dl>
          <dt>Annual platform cost</dt>
          <dd>£{model.cost.toLocaleString("en-GB")}</dd>
          <dt>Modelled financial difference</dt>
          <dd>£{Math.round(model.difference).toLocaleString("en-GB")}</dd>
        </dl>
        <small>
          Financial difference is time value minus subscription cost. It is not
          realised cash savings, annual contribution or net profit.
        </small>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="dot" /> BUILT FOR SOUTHAMPTON. DESIGNED FOR ACTION.
          </div>
          <h1>
            Smarter streets.
            <br />
            <span>Stronger cities.</span>
          </h1>
          <p>
            From the first photograph to the final repair.
            <br />
            CIVIQ AI brings residents, evidence and maintenance teams together
            in one intelligent city workspace.
          </p>
          <div className="button-row">
            <Button asChild>
              <Link href="/report">
                Report a problem <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                Explore council demo <ArrowRight size={17} />
              </Link>
            </Button>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={17} />
            Free for residents <span /> Transparent decisions <span /> Verified
            outcomes
          </div>
        </div>
        <div className="hero-visual">
          <div className="city-art">
            <div className="grid-plane" />
            <div className="city-building b1" />
            <div className="city-building b2" />
            <div className="city-building b3" />
            <div className="city-building b4" />
            <div className="city-building b5" />
            <div className="route-line" />
            <span className="map-pin p1">
              <MapPin />
            </span>
            <span className="map-pin p2">
              <Check size={19} />
            </span>
            <span className="map-pin p3">
              <MapPin />
            </span>
            <div className="visual-caption">
              SOUTHAMPTON <small>50.9097° N · 1.4044° W</small>
            </div>
          </div>
          <div className="floating-card fc1">
            <span className="float-icon">
              <Camera size={20} />
            </span>
            <div>
              <strong>One report. A clear next step.</strong>
              <small>Photograph → location → action</small>
            </div>
          </div>
          <div className="floating-card fc2">
            <span className="float-icon green">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <strong>Repair, reviewed.</strong>
              <small>Evidence-backed human verification</small>
            </div>
          </div>
          <div className="visual-label">
            CONCEPTUAL CITY ILLUSTRATION · NOT LIVE DATA
          </div>
        </div>
      </section>
      <section className="workflow-band">
        <span>
          FROM REPORTED
          <br />
          <strong>TO RESOLVED.</strong>
        </span>
        {[
          [Camera, "Capture"],
          [MapPin, "Locate"],
          [Layers, "Coordinate"],
          [Route, "Repair"],
          [ShieldCheck, "Verify"],
        ].map(([Icon, label], n) => {
          const I = Icon as typeof Camera;
          return (
            <Link href="/demo" key={n}>
              <I size={22} />
              <span>{label as string}</span>
              {n < 4 && <ChevronRight size={17} />}
            </Link>
          );
        })}
      </section>
      <section className="landing-section problem-section">
        <div>
          <div className="eyebrow">THE SOUTHAMPTON OPPORTUNITY</div>
          <h2>
            Local problems.
            <br />A more connected response.
          </h2>
          <p>
            Infrastructure reports deserve more than a form submission.
            Maintenance teams need clear evidence, coordinated work and a
            reliable path to closure.
          </p>
          <a
            href="https://data.southampton.gov.uk/place/environment/waste/"
            target="_blank"
            rel="noreferrer"
          >
            Explore the Southampton Data Observatory <ArrowUpRight size={16} />
          </a>
        </div>
        <SouthamptonEvidence />
      </section>
      <section className="landing-section">
        <div className="section-heading">
          <div className="eyebrow">BUILT AROUND THE WHOLE JOURNEY</div>
          <h2>
            Collect evidence. Coordinate action.
            <br />
            Close the loop.
          </h2>
          <p>
            One shared picture of what needs attention, why it matters and what
            happens next.
          </p>
        </div>
        <div className="feature-grid">
          {[
            [
              Camera,
              "A better first report",
              "Upload a photograph, pinpoint the location and describe what matters. No resident account required.",
            ],
            [
              Layers,
              "Less duplication. More clarity.",
              "Review nearby reports with explainable geographic and text matching. Every independent report keeps its evidence.",
            ],
            [
              Activity,
              "Priorities you can explain",
              "See the factors behind every score. Human officers review classifications and record reasoned overrides.",
            ],
            [
              Users,
              "Coordinated city maintenance",
              "Assign service teams, schedule work and keep every status change in a permanent timeline.",
            ],
            [
              ShieldCheck,
              "Evidence before closure",
              "Compare before and after photographs. Manual verification and resident reopening keep the outcome visible.",
            ],
            [
              ChartNoAxesCombined,
              "A grounded view of impact",
              "Explore stored issue data and model business value with editable assumptions. No invented performance claims.",
            ],
          ].map(([Icon, title, text], n) => {
            const I = Icon as typeof Camera;
            return (
              <article key={n}>
                <span className="feature-icon">
                  <I size={24} />
                </span>
                <h3>{title as string}</h3>
                <p>{text as string}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="trust-section">
        <div>
          <Badge>RESPONSIBLE BY DESIGN</Badge>
          <h2>
            Intelligence with
            <br />
            human accountability.
          </h2>
          <p>
            Local vision and sentence models support transparent triage.
            Officers review model suggestions and verify every repair outcome.
          </p>
          <Link href="/about-data">
            See the methods and limitations <ArrowRight size={17} />
          </Link>
        </div>
        <div className="trust-list">
          {[
            "Visible model availability and demo status",
            "Explanations beside matching and priority scores",
            "Evidence preserved across independent reports",
            "Staff decisions recorded in an audit trail",
          ].map((s) => (
            <div key={s}>
              <CheckCircle2 size={20} />
              {s}
            </div>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="section-heading">
          <div className="eyebrow">A PROPOSED B2G SAAS MODEL</div>
          <h2>Free to report. Built for city operations.</h2>
          <p>
            Illustrative subscription pricing. No customer commitments or
            council partnerships claimed.
          </p>
        </div>
        <div className="pricing-grid">
          {[
            ["Pilot", "£500", "One focused local pilot"],
            ["City", "£1,500", "A coordinated city workspace"],
            ["Enterprise", "£3,000+", "Configurable multi-area operations"],
          ].map(([name, price, text], n) => (
            <article className={n === 1 ? "featured" : ""} key={name}>
              <small>ILLUSTRATIVE</small>
              <h3>{name}</h3>
              <strong>
                {price}
                <span> / month</span>
              </strong>
              <p>{text}</p>
              <Button variant={n === 1 ? "default" : "outline"} asChild>
                <Link href="/demo">
                  Explore the demonstration <ArrowRight size={16} />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <Calculator />
      </section>
      <section className="closing-cta">
        <div className="eyebrow">SOUTHAMPTON IS JUST THE BEGINNING</div>
        <h2>
          Better streets start
          <br />
          with a clearer picture.
        </h2>
        <p>
          Configurable categories, service teams and workflows provide a
          foundation for a second city. Official boundaries and local data
          require city-specific validation.
        </p>
        <Button asChild>
          <Link href="/report">
            Make your first report <ArrowUpRight size={18} />
          </Link>
        </Button>
      </section>
    </main>
  );
}

export function Demo() {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Start with the resident",
      text: "Upload a real photograph, choose a Southampton location and describe the problem. Local model mode analyses the image; demo mode uses explicitly labelled text rules.",
      href: "/report",
      cta: "Try resident reporting",
    },
    {
      title: "Review an explainable duplicate",
      text: "The Portswood pothole has four independent fictional reports. They retain individual references and evidence under one canonical issue.",
      href: "/dashboard/issues/demo-1",
      cta: "Inspect the pothole",
    },
    {
      title: "Catch a matching failure",
      text: "The nearby streetlights A101 and A102 are separate assets. An intentionally incorrect seed match should be rejected by a human.",
      href: "/dashboard/issues/demo-3",
      cta: "Review the failure case",
    },
    {
      title: "Coordinate the maintenance",
      text: "Assign a service team and progress through the maintenance lifecycle. The timeline records every decision.",
      href: "/dashboard/issues/demo-4",
      cta: "Open the maintenance workflow",
    },
    {
      title: "Verify the repair outcome",
      text: "Compare fictional before and after evidence. Manual human verification is required; optional image embeddings support review, and no model score establishes repair safety.",
      href: "/dashboard/issues/demo-12",
      cta: "Inspect verified evidence",
    },
    {
      title: "Follow the public outcome",
      text: "Residents can track progress, review repair evidence and request reopening with their unique reference.",
      href: "/track?ref=CIV-DEMO-012",
      cta: "Track the completed issue",
    },
    {
      title: "Evaluate the business model",
      text: "Explore operational metrics derived from stored data and edit financial assumptions. Scenario outputs are not measured savings.",
      href: "/dashboard/insights",
      cta: "Explore insights",
    },
  ];
  const s = steps[step];
  return (
    <main className="public-content narrow">
      <PageHeading
        eyebrow="SOTONSHIP 2026 · JUDGE WALKTHROUGH"
        title="From a report to a result."
        subtitle="A seven-stop interactive tour of the working local application."
      />
      <div className="card demo-tour">
        <Badge>
          STEP {step + 1} OF {steps.length}
        </Badge>
        <div className="tour-icon">
          <Route size={40} />
        </div>
        <h2>{s.title}</h2>
        <p>{s.text}</p>
        <Button asChild>
          <Link href={s.href}>
            {s.cta}
            <ArrowUpRight size={17} />
          </Link>
        </Button>
        <div className="tour-controls">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Previous
          </Button>
          <div>
            {steps.map((_, n) => (
              <button
                key={n}
                className={n === step ? "active" : ""}
                aria-label={`Demo step ${n + 1}`}
                onClick={() => setStep(n)}
              />
            ))}
          </div>
          <Button
            variant="outline"
            disabled={step === steps.length - 1}
            onClick={() => setStep(step + 1)}
          >
            Next
          </Button>
        </div>
      </div>
      <div className="notice">
        All seed reports and evidence illustrations are fictional. V2 local
        model evaluation uses separate licensed international photographs. The
        four-image smoke result is not a representative accuracy benchmark.
      </div>
    </main>
  );
}

export function AboutData() {
  return (
    <main className="public-content prose">
      <PageHeading
        eyebrow="DATA, MODELS & PROVENANCE"
        title="Trust starts with clarity."
        subtitle="Know what is observed, what is inferred and where a person decides."
      />
      <section className="card detail-section">
        <h2>Official Southampton evidence</h2>
        <SouthamptonEvidence />
        <h2>Five different data classifications</h2>
        <p>
          Official aggregate statistics, public historical issue records, actual
          user submissions, model evaluation images and synthetic demonstrations
          are kept separate in the database and interface. No genuine
          council-level geolocated issue feed has been imported. No coordinates
          are assigned to international evaluation samples.
        </p>
        <h2>Real local image classification</h2>
        <p>
          Local model mode uses the Apache-2.0 google/siglip-base-patch16-224
          checkpoint on actual sanitized uploaded images. It returns candidate
          descriptions, raw logits, sigmoid similarities, model revision,
          inference time and a timestamp. These similarities are not calibrated
          probabilities. Ambiguous or low-support outputs abstain; residents and
          officers can correct the category.
        </p>
        <p>
          Visibly damaged lamp infrastructure can be a candidate; a daylight
          photograph cannot establish an electrical outage. Severity and safety
          wording are separate text rules, not conclusions from image
          similarity.
        </p>
        <h2>Semantic duplicate review</h2>
        <p>
          Apache-2.0 sentence-transformers/all-MiniLM-L6-v2 embeddings compare
          descriptions with cosine similarity. Distance, category, time and
          supplied asset IDs also constrain candidates. Geographic and keyword
          matching remain available when embeddings fail, with an explicit
          fallback label. Human confirmation is always required; original
          reports and evidence remain stored.
        </p>
        <h2>Evaluation with limits</h2>
        <p>
          The included smoke evaluation uses four licensed Commons images: two
          potholes and two graffiti photographs from several places. Labels were
          derived from source descriptions and visually checked by the coding
          agent, not adjudicated by independent human annotators. Measured
          outputs are stored with model revision and date. Four convenient
          images cannot establish general civic accuracy or Southampton
          performance.
        </p>
        <h2>Synthetic demonstrations and user reports</h2>
        <p>
          The repeatable seed includes 18 fictional reports across 15 canonical
          issues. SVG evidence is clearly labelled illustration. User reports
          have a separate USER SUBMITTED classification. Anonymous submissions
          do not prove reporter independence. Hotspot views separate source
          types and count canonical issues rather than repeated reports.
        </p>
        <h2>Priority, service routing and repair review</h2>
        <p>
          Configurable weights combine text-derived severity, reported
          accessibility impacts, age/recurrence, confirmations, neutral location
          context and evidence uncertainty. They are not official council
          policy. Service recommendations come from configurable category
          ownership, not verified municipal boundaries. Before/after cosine
          similarity is experimental supporting evidence; a person must approve
          closure and residents may request reopening.
        </p>
        <h2>Maps, imports and deployment</h2>
        <p>
          <a href="https://www.openstreetmap.org/copyright">
            OpenStreetMap contributors
          </a>{" "}
          provide map tiles. The input bounding box is not an official
          Southampton boundary. Imported records require licence review,
          attribution, source URL, dates, coverage and limitations. Historical
          issues need supplied locations. Model weights and large datasets are
          excluded from Git.
        </p>
        <p>
          The Next.js app and loopback Python service run separately. Deploying
          Next.js to Vercel does not deploy Python inference; a separately
          secured inference host and persistent storage are required. This
          prototype is not an official council service.
        </p>
      </section>
    </main>
  );
}

export function Privacy() {
  return (
    <main className="public-content prose">
      <PageHeading
        eyebrow="PRIVACY & DATA HANDLING"
        title="Only what the workflow needs."
        subtitle="A plain-language notice for the local CIVIQ AI demonstration."
      />
      <section className="card detail-section">
        <h2>What is stored</h2>
        <p>
          Reports contain a description, infrastructure coordinates, a street or
          landmark, photographs and a random tracking reference. No name, email
          or telephone number is requested. SQLite stores records; JPEG files
          are saved on the local server disk. Uploads are validated, resized and
          re-encoded, removing metadata.
        </p>
        <h2>Public information</h2>
        <p>
          Issue descriptions, report locations, submitted photographs, public
          maintenance updates and repair outcomes may be viewed through the
          public map, media URLs and tracking page. Do not upload faces, vehicle
          plates, home access details or other personal information. Tracking
          references are random, but are not a substitute for authentication.
        </p>
        <h2>Staff access</h2>
        <p>
          Local development demo mode permits an example officer. Production
          disables that bypass and requires a server-configured staff token.
          This is a local demonstration access model, not a production council
          identity system. Private staff notes, overrides and duplicate reviews
          are excluded from public tracking responses.
        </p>
        <h2>Retention & removal</h2>
        <p>
          Records persist across restarts. There is no automatic retention
          schedule or resident deletion portal. The local operator can stop the
          server and remove the SQLite database and data/uploads directory to
          erase the demo, then rerun setup. Demo reset replaces only synthetic
          seed records and preserves locally submitted reports and their
          evidence.
        </p>
        <h2>External connections</h2>
        <p>
          OpenStreetMap tile requests disclose usual network information to its
          tile service. When local model mode is enabled, sanitized images are
          sent to the Python inference service configured by the server
          operator; by default it runs on this same computer. No paid external
          model provider is configured. No analytics tracker or paid service is
          configured. This notice describes implemented behaviour and makes no
          regulatory-compliance claim.
        </p>
        <h2>Safety & limitations</h2>
        <p>
          This application is not an official council reporting service or
          emergency channel. It is not continuously monitored. For immediate
          danger, consult{" "}
          <a href="https://www.gov.uk/contact-emergency-services">
            official emergency-service guidance
          </a>
          . Before public deployment, implement production identity, moderation,
          retention, privacy review, infrastructure controls and a verified
          council workflow.
        </p>
      </section>
    </main>
  );
}

export function SouthamptonEvidence() {
  const [source, setSource] = useState<{
    url: string;
    period: string;
    retrievedAt: string;
    payload: string;
    note: string;
  } | null>(null);
  useEffect(() => {
    api<typeof source>("evidence")
      .then(setSource)
      .catch(() => {});
  }, []);
  let payload: {
    statistic?: number;
    unit?: string;
    sourceUpdated?: string;
    verifiedOn?: string;
  } = {};
  if (source) {
    try {
      payload = JSON.parse(source.payload);
    } catch {}
  }
  return (
    <div className="evidence-panel">
      <Badge>OFFICIAL AGGREGATE · {source?.period || "2024/25"}</Badge>
      <strong>{payload.statistic ?? "Unavailable"}</strong>
      <h3>
        {payload.unit || "Verified source metadata is loading or unavailable"}
      </h3>
      <p>
        Southampton Data Observatory · Waste
        <br />
        Source update: {payload.sourceUpdated || "Unavailable"} · checked:{" "}
        {payload.verifiedOn || "Unavailable"}
      </p>
      <small>
        {source?.note ||
          "No statistic is invented when the verified source record is unavailable."}
      </small>
      {source && (
        <a className="source-link" href={source.url}>
          Read the original source <ArrowUpRight size={13} />
        </a>
      )}
    </div>
  );
}

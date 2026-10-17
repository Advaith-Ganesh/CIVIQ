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
export function Calculator() {
  const [v, setV] = useState([12000, 25, 5, 25, 1500]);
  const model = financialModel(
    ...(v as [number, number, number, number, number]),
  );
  return (
    <div className="calculator">
      <div>
        <Badge>ILLUSTRATIVE MODEL · NOT MEASURED SAVINGS</Badge>
        <h2>Make the assumptions yours.</h2>
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
        <div className="official-stat">
          <Badge>OFFICIAL AGGREGATE · 2024/25</Badge>
          <strong>47.1</strong>
          <h3>fly-tipping incidents per 1,000 residents</h3>
          <p>
            Southampton Data Observatory · Waste
            <br />
            Reference period 2024/25 · Page updated 29 June 2026
          </p>
          <small>
            Reporting practices can affect comparisons. This statistic is
            separate from CIVIQ AI’s fictional issue records.
          </small>
        </div>
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
            Phase 1 runs on transparent text rules and geographic matching.
            Image interpretation and repair verification remain human decisions.
          </p>
          <Link href="/about-data">
            See the methods and limitations <ArrowRight size={17} />
          </Link>
        </div>
        <div className="trust-list">
          {[
            "Visible DEMO MODE on every page",
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
      text: "Upload a real photograph, choose a Southampton location and describe the problem. The category suggestion uses text rules only.",
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
      text: "Compare fictional before and after evidence. Manual human verification is required; no arbitrary image is given a simulated AI result.",
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
        All seed reports and evidence illustrations are fictional. Phase 1
        evaluates the deterministic workflow. Genuine AI evaluation belongs to
        Phase 2.
      </div>
    </main>
  );
}

export function AboutData() {
  return (
    <main className="public-content prose">
      <PageHeading
        eyebrow="DATA, METHODS & LIMITATIONS"
        title="Trust starts with clarity."
        subtitle="Know what the application knows, what it assumes and where humans decide."
      />
      <section className="card detail-section">
        <h2>Official Southampton context</h2>
        <p>
          The{" "}
          <a href="https://data.southampton.gov.uk/place/environment/waste/">
            Southampton Data Observatory’s Waste page
          </a>{" "}
          reports 47.1 fly-tipping incidents per 1,000 residents in 2024/25. Its
          page was updated on 29 June 2026 and checked for this build on 17
          October 2026. Differences in recording practices can affect
          comparisons.
        </p>
        <p>
          This is an official aggregate statistic, not an input feed for the
          issue map. No council complaint dataset has been imported. The brief’s
          total of 12,208 incidents was not independently confirmed in the page
          text and is therefore not presented as a verified total.
        </p>
        <h2>Fictional demonstration records</h2>
        <p>
          The repeatable seed contains 18 reports across 15 canonical issues.
          All seed issues are labelled DEMO DATA. Locations and SVG evidence
          illustrations are synthetic and represent no real complaint. Your
          locally submitted records are saved separately from seed records.
        </p>
        <h2>Deterministic assistance</h2>
        <p>
          Text classification matches editable category keywords. Confidence
          represents rule coverage. It does not assess photographs or establish
          public danger. Similar descriptions, compatible categories, distance
          and age produce duplicate candidates; residents and officers
          explicitly confirm associations.
        </p>
        <p>
          Distinct streetlight asset identifiers prevent matching when supplied.
          Uncertain cases require human review. An intentionally incorrect
          streetlight match demonstrates a failure case.
        </p>
        <h2>Priority methodology</h2>
        <p>
          A configurable score out of 100 combines text-derived severity (35),
          accessibility impact (20), age and recurrence (15), confirmations
          (10), assumed neutral location context (10), and rule confidence (10).
          Context defaults to 0.5 because no verified context dataset is
          available. This is not official Southampton City Council policy. Human
          overrides require a reason and audit event.
        </p>
        <h2>Maps & boundaries</h2>
        <p>
          Map tiles are supplied by{" "}
          <a href="https://www.openstreetmap.org/copyright">
            OpenStreetMap contributors
          </a>{" "}
          and require internet access. The local bounding box is only a demo
          input constraint. It is not an official administrative boundary.
          Resident infrastructure coordinates are public; do not submit
          sensitive locations.
        </p>
        <h2>Phase 2 AI architecture</h2>
        <p>
          Vision, embeddings, multimodal matching, repair assessment and summary
          adapters are defined, but no OpenAI calls are implemented. Setting
          AI_PROVIDER=openai returns a clear unsupported-provider error. The
          interface never claims a live model is operating.
        </p>
        <h2>Commercial assumptions</h2>
        <p>
          All tiers are proposed illustrative pricing. The calculator values
          assumed staff time and subtracts annual subscription cost. This
          difference is not net profit or realised financial savings. A second
          city requires official boundary data, reviewed categories, source
          provenance, local workflows, authentication and retention decisions.
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
          tile service. No photographs are sent to an AI provider. No analytics
          tracker or paid service is configured. This notice describes
          implemented behaviour and makes no regulatory-compliance claim.
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

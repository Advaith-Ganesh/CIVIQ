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
import {
  detailsSchema,
  Report,
  Tracked,
  Tracking,
  PublicMap,
} from "./resident";
import {
  Dashboard,
  IssueTable,
  Issues,
  IssueDetail,
  Teams,
  Insights,
  SettingsPage,
} from "./operations";
import { Calculator, Landing, Demo, AboutData, Privacy } from "./marketing";
const nav = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/dashboard/issues", "Issue management", ClipboardList],
  ["/map", "City map", Map],
  ["/dashboard/teams", "Maintenance teams", Users],
  ["/dashboard/insights", "Insights & impact", ChartNoAxesCombined],
  ["/dashboard/settings", "Settings", Settings],
] as const;

export default function App() {
  const pathname = usePathname();
  const council = pathname.startsWith("/dashboard");
  const [meta, setMeta] = useState<Meta>(initialMeta),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    api<Meta>("meta")
      .then(setMeta)
      .catch(() => {});
  }, []);
  return (
    <>
      {council ? (
        <>
          <aside className={`sidebar ${mobile ? "open" : ""}`}>
            <Link className="brand" href="/">
              <Brand />
            </Link>
            <div className="workspace">
              <span className="city-icon">
                <Building2 size={20} />
              </span>
              <div>
                Southampton<small>City operations workspace</small>
              </div>
            </div>
            <div className="nav-label">WORKSPACE</div>
            <nav>
              {nav.map(([url, label, Icon]) => (
                <Link
                  key={url}
                  href={url}
                  onClick={() => setMobile(false)}
                  className={
                    (
                      url === "/dashboard"
                        ? pathname === url
                        : pathname.startsWith(url)
                    )
                      ? "active"
                      : ""
                  }
                >
                  <Icon size={19} />
                  {label}
                  {url === "/dashboard" && <span className="nav-dot" />}
                </Link>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <Link href="/demo">
                <CircleHelp size={18} /> Guided demo <ArrowUpRight size={15} />
              </Link>
              <div className="demo-panel">
                <span className="dot" /> {meta.mode}
                <p>
                  Transparent rules.
                  <br />
                  Human decisions.
                </p>
                <Link href="/about-data">About this demonstration ↗</Link>
              </div>
              <div className="profile">
                <span>SO</span>
                <div>
                  Demo officer<small>Local demonstration</small>
                </div>
                <ShieldCheck size={17} />
              </div>
            </div>
          </aside>
          <div className="shell">
            <header className="topbar">
              <button
                className="mobile-toggle"
                aria-label="Toggle navigation"
                onClick={() => setMobile(!mobile)}
              >
                <Menu />
              </button>
              <span>
                Workspace <ChevronRight size={14} />{" "}
                <strong>
                  {nav.find(([url]) =>
                    url === "/dashboard"
                      ? pathname === url
                      : pathname.startsWith(url),
                  )?.[1] || "Issue detail"}
                </strong>
              </span>
              <div>
                <Badge type="green">
                  <span className="tiny-dot" /> {meta.mode}
                </Badge>
                <Link href="/report" className="top-link">
                  Resident portal <ArrowUpRight size={15} />
                </Link>
              </div>
            </header>
            <main className="main-content">
              {pathname === "/dashboard" ? (
                <Dashboard meta={meta} />
              ) : pathname === "/dashboard/issues" ? (
                <Issues meta={meta} />
              ) : pathname.startsWith("/dashboard/issues/") ? (
                <IssueDetail id={pathname.split("/").pop()!} meta={meta} />
              ) : pathname === "/dashboard/teams" ? (
                <Teams
                  meta={meta}
                  refresh={() => api<Meta>("meta").then(setMeta)}
                />
              ) : pathname === "/dashboard/insights" ? (
                <Insights />
              ) : pathname === "/dashboard/settings" ? (
                <SettingsPage
                  meta={meta}
                  refresh={() => api<Meta>("meta").then(setMeta)}
                />
              ) : (
                <Empty text="Page not found" />
              )}
            </main>
            <footer className="app-footer">
              CIVIQ AI · SotonShip 2026{" "}
              <span>
                Fictional demo records · Not an official council service
              </span>
            </footer>
          </div>
        </>
      ) : (
        <>
          <header className="public-header">
            <Link className="brand" href="/">
              <Brand />
            </Link>
            <nav>
              <Link href="/map">Explore the city</Link>
              <Link href="/track">Track a report</Link>
              <Link href="/about-data">Our approach</Link>
            </nav>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                Council workspace <ArrowUpRight size={16} />
              </Link>
            </Button>
          </header>
          <div className="public-mode">
            <span className="dot" />
            {meta.mode} · SotonShip 2026 · Independent demonstration, not an
            official council service
          </div>
          {pathname === "/" ? (
            <Landing />
          ) : pathname === "/report" ? (
            <Report meta={meta} />
          ) : pathname === "/track" ? (
            <Tracking />
          ) : pathname === "/map" ? (
            <PublicMap meta={meta} />
          ) : pathname === "/demo" ? (
            <Demo />
          ) : pathname === "/privacy" ? (
            <Privacy />
          ) : pathname === "/about-data" ? (
            <AboutData />
          ) : (
            <div className="public-content">
              <h1>Page not found</h1>
              <Link href="/">Return home</Link>
            </div>
          )}
          <footer className="public-footer">
            <Brand />
            <p>Smarter Streets. Stronger Cities.</p>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/about-data">Data & limitations</Link>
              <Link href="/demo">Judge walkthrough</Link>
            </div>
            <small>
              Built for SotonShip 2026 · Southampton City track · No partnership
              claimed
            </small>
          </footer>
        </>
      )}
    </>
  );
}

"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  LayoutDashboard,
  Map,
  ClipboardList,
  Users,
  ChartNoAxesCombined,
  Settings,
  CircleHelp,
  Search,
  ChevronRight,
  ShieldCheck,
  Building2,
  Menu,
  FlaskConical,
  Database,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { Meta, initialMeta, api, Badge, Empty, Brand } from "./shared";
import { Report, Tracking, PublicMap } from "./resident";
import {
  Dashboard,
  Issues,
  IssueDetail,
  Teams,
  Insights,
  SettingsPage,
} from "./operations";
import { AILab, DataSources, Hotspots, OperationsSearch } from "./intelligence";
import { Landing, Demo, AboutData, Privacy } from "./marketing";
const nav = [
  ["/dashboard", "Command centre", LayoutDashboard],
  ["/dashboard/issues", "Issue management", ClipboardList],
  ["/map", "City map", Map],
  ["/dashboard/teams", "Maintenance teams", Users],
  ["/dashboard/insights", "Insights & impact", ChartNoAxesCombined],
  ["/dashboard/hotspots", "Hotspots", MapPinned],
  ["/dashboard/search", "Operations search", Search],
  ["/dashboard/ai-lab", "AI Lab", FlaskConical],
  ["/dashboard/data-sources", "Data sources", Database],
  ["/dashboard/settings", "Settings", Settings],
] as const;

export default function App() {
  const pathname = usePathname();
  const council = pathname.startsWith("/dashboard");
  const [meta, setMeta] = useState<Meta>(initialMeta),
    [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const refresh = () =>
      api<Meta>("meta")
        .then(setMeta)
        .catch(() => {});
    refresh();
    window.addEventListener("civiq-meta-updated", refresh);
    return () => window.removeEventListener("civiq-meta-updated", refresh);
  }, [pathname]);
  return (
    <>
      {council ? (
        <>
          <aside
            className={`sidebar ${mobile ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
          >
            <Link className="brand" href="/">
              <Brand />
            </Link>
            <button
              className="sidebar-collapse"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </button>
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
                  aria-label={label}
                  title={label}
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
                  <span className="nav-text">{label}</span>
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
                  Evidence-led operations.
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
          <div className={`shell ${collapsed ? "nav-collapsed" : ""}`}>
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
                <Badge
                  type={meta.mode.includes("UNAVAILABLE") ? "amber" : "blue"}
                >
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
              ) : pathname === "/dashboard/ai-lab" ? (
                <AILab />
              ) : pathname === "/dashboard/data-sources" ? (
                <DataSources />
              ) : pathname === "/dashboard/hotspots" ? (
                <Hotspots meta={meta} />
              ) : pathname === "/dashboard/search" ? (
                <OperationsSearch meta={meta} />
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
              <span>Provenance shown per record · Independent prototype</span>
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

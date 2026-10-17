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
export const CityMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading Southampton map…</div>,
});

export const CategoryChart = dynamic(() => import("./charts"), { ssr: false });

export type Photo = { id: string; path: string };

export type Match = {
  id: string;
  issueId: string;
  score: number;
  distance: number;
  explanation: string;
  decision: string;
};

export type Issue = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  category: { name: string };
  lat: number;
  lng: number;
  location: string;
  status: string;
  severity: number;
  priority: number;
  override: number | null;
  synthetic: boolean;
  createdAt: string;
  closedAt: string | null;
  reports: {
    id: string;
    reference: string;
    description: string;
    synthetic: boolean;
    createdAt: string;
    photographs: Photo[];
    matches: Match[];
  }[];
  assignments: {
    team: { id: string; name: string };
    scheduledAt: string | null;
  }[];
  events: {
    id: string;
    kind: string;
    message: string;
    public: boolean;
    createdAt: string;
    actor: { name: string };
  }[];
  repairs: {
    id: string;
    outcome: string;
    verified: boolean;
    photograph: Photo;
  }[];
  assessments: { confidence: number; explanation: string; provider: string }[];
  calculated: {
    score: number;
    recurrence: number;
    breakdown: { name: string; weight: number; points: number }[];
  };
};

export type Meta = {
  categories: {
    id: string;
    name: string;
    keywords: string;
    teamId: string | null;
    active: boolean;
  }[];
  teams: { id: string; name: string; area: string }[];
  localDemo: boolean;
  mode: string;
};

export type Metrics = {
  reports: number;
  unique: number;
  duplicates: number;
  potential: number;
  review: number;
  high: number;
  scheduled: number;
  resolved: number;
  average: number | null;
};

export const initialMeta: Meta = {
  categories: defaultCategories.map(([id, name, keywords]) => ({
    id,
    name,
    keywords,
    teamId: null,
    active: true,
  })),
  teams: [],
  localDemo: false,
  mode: "DEMO MODE",
};

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("civiq-staff") || ""
      : "";
  const res = await fetch(`/api/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export async function upload(file: File): Promise<Photo> {
  const data = new FormData();
  data.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: data });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}

export const date = (v: string) =>
  new Date(v).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function Badge({
  children,
  type = "",
}: {
  children: React.ReactNode;
  type?: string;
}) {
  return <span className={`badge ${type}`}>{children}</span>;
}

export function Status({ value }: { value: string }) {
  return (
    <Badge
      type={
        value === "Verified closed"
          ? "green"
          : value === "Reopened"
            ? "amber"
            : value === "Submitted"
              ? "grey"
              : "blue"
      }
    >
      <span className="tiny-dot" />
      {value}
    </Badge>
  );
}

export function Score({ issue }: { issue: Issue }) {
  const n = issue.override ?? issue.calculated.score;
  return (
    <span className={`score ${n >= 65 ? "urgent" : n >= 40 ? "medium" : ""}`}>
      {n}
      <small>/100</small>
    </span>
  );
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow || "SOUTHAMPTON OPERATIONS"}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Message({ text }: { text: string }) {
  return text ? (
    <div role="status" className="message">
      {text}
    </div>
  ) : null;
}

export function Empty({
  text = "No issues match these filters.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Layers />
      <h3>{text}</h3>
      <p>New reports will appear here when they are submitted.</p>
    </div>
  );
}

export function Brand() {
  return (
    <>
      <span className="brand-mark">
        <Building2 size={23} />
      </span>
      <span>
        CIVIQ<span className="brand-ai"> AI</span>
      </span>
    </>
  );
}

export function StaffGate({ reload }: { reload: () => void }) {
  const [token, setToken] = useState("");
  return (
    <div className="card gate">
      <ShieldCheck />
      <h2>Staff access</h2>
      <p>
        Enter the STAFF_TOKEN configured on this server. Local development demo
        mode permits a demonstration officer.
      </p>
      <label>
        Staff token
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      <Button
        onClick={() => {
          sessionStorage.setItem("civiq-staff", token);
          reload();
        }}
      >
        Unlock workspace
      </Button>
    </div>
  );
}

export function useIssues() {
  const [data, setData] = useState<{
      issues: Issue[];
      metrics: Metrics;
    } | null>(null),
    [error, setError] = useState("");
  const reload = useCallback(() => {
    api<{ issues: Issue[]; metrics: Metrics }>("issues")
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);
  return { data, error, reload };
}

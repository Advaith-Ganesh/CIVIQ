"use client";
import { ScanEye, TriangleAlert } from "lucide-react";
import { Badge } from "./shared";
import type { VisionResult } from "@/lib/local-model";
export function VisionResultCard({ result }: { result: VisionResult }) {
  return (
    <section
      className={`vision-result ${result.available ? "" : "unavailable"}`}
      aria-label="Image model assessment"
    >
      <div className="vision-title">
        <span className="vision-icon">
          {result.available ? (
            <ScanEye size={21} />
          ) : (
            <TriangleAlert size={21} />
          )}
        </span>
        <div>
          <Badge type={result.available ? "blue" : "amber"}>
            {result.available
              ? "LIVE MODEL · REAL IMAGE INFERENCE"
              : "AI UNAVAILABLE · MANUAL CLASSIFICATION"}
          </Badge>
          <h3>
            {result.available
              ? result.abstained
                ? "Model abstained — review required"
                : result.candidates[0]?.label.replace("a photograph of ", "") ||
                  "Image suggestion"
              : "Your report can still be submitted"}
          </h3>
        </div>
      </div>
      <p>{result.reliabilityWarning}</p>
      {result.error && <small className="model-error">{result.error}</small>}
      {result.available && (
        <>
          <div className="model-details">
            <span>{result.modelId}</span>
            <span>
              {result.durationMs?.toFixed(0)} ms ·{" "}
              {result.inferredAt
                ? new Date(result.inferredAt).toLocaleTimeString("en-GB")
                : ""}
            </span>
          </div>
          <table className="candidate-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Raw logit</th>
                <th>Sigmoid similarity</th>
              </tr>
            </thead>
            <tbody>
              {result.candidates.slice(0, 4).map((c) => (
                <tr key={c.categoryId}>
                  <td>{c.categoryId}</td>
                  <td>{c.rawScore.toFixed(3)}</td>
                  <td>{c.score.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <small>
            Raw similarities are not calibrated probabilities. Model revision{" "}
            {result.revision?.slice(0, 12)}. A daylight image cannot establish a
            streetlight electrical outage.
          </small>
        </>
      )}
    </section>
  );
}

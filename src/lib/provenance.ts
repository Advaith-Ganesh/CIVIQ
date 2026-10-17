export const dataTypes = [
  "OFFICIAL_AGGREGATE",
  "PUBLIC_HISTORICAL",
  "USER_SUBMITTED",
  "MODEL_EVALUATION",
  "SYNTHETIC_DEMO",
] as const;
export type DataType = (typeof dataTypes)[number];
export const dataLabels: Record<string, string> = {
  OFFICIAL_AGGREGATE: "OFFICIAL AGGREGATE",
  PUBLIC_HISTORICAL: "PUBLIC HISTORICAL DATA",
  USER_SUBMITTED: "USER SUBMITTED",
  MODEL_EVALUATION: "MODEL EVALUATION",
  SYNTHETIC_DEMO: "SYNTHETIC DEMO",
};
export function recordType(record: { synthetic?: boolean; dataType?: string }) {
  return record.synthetic
    ? "SYNTHETIC_DEMO"
    : record.dataType || "USER_SUBMITTED";
}
export const accessibilityOptions = [
  ["blockedPavement", "Blocked pavement"],
  ["wheelchairObstruction", "Wheelchair access obstruction"],
  ["unsafeCrossing", "Unsafe pedestrian crossing"],
  ["tactileObstruction", "Obstructed tactile paving"],
  ["restrictedAccess", "Restricted pedestrian access"],
] as const;

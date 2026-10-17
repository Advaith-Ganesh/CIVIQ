import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CIVIQ AI — Smarter Streets. Stronger Cities.",
  description:
    "Southampton civic maintenance intelligence. Local demonstration with transparent rules and human review.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}

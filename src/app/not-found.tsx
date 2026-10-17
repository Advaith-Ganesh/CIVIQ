import Link from "next/link";
export default function NotFound() {
  return (
    <main className="public-content">
      <h1>Page not found</h1>
      <Link href="/">Return to CIVIQ AI</Link>
    </main>
  );
}

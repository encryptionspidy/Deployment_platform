import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deploy Platform Dashboard",
  description: "Self-hosted multi-tenant CI/CD platform & SRE observability dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-950 text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "FairLend AI - AI Fairness Audit Dashboard",
  description: "Detect unfairness in loan approval datasets and ML model outputs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NavSidebar } from "@/components/nav-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MacroPulse — Event Impact Analysis",
  description:
    "Macro event impact analysis toolkit: event study econometrics, institutional flow correlation, and sector sensitivity for US policy events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Providers>
          <div className="flex min-h-screen">
            <NavSidebar />
            <main className="flex-1 pl-56">
              <div className="h-14 border-b border-border flex items-center px-6">
                <h1 className="text-sm font-medium text-muted-foreground">
                  Event Impact Analysis
                </h1>
              </div>
              <div className="p-6">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

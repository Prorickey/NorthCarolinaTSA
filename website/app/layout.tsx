import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import Root from "./root";
import Privacy from "./privacy";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "App Management",
  description: "The website dashboard to manage the NCTSA app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const headerList = headers();
  const pathname = (await headerList).get("x-current-path");

  if(pathname === "/privacy") {
    return (
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
          <Privacy />
        </body>
      </html>
    );
  }

  if(pathname == "/static/finalists.pdf" || pathname == "/static/special_events.pdf" || pathname == "/static/candidates.pdf") {
    return (
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
          {children}
        </body>
      </html>
    )
  }

  if (!session) {
    console.log("No session found, redirecting to sign in page");
    if (pathname != "/signin") return redirect("/signin");
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <Root>
          {children}
        </Root>
      </body>
    </html>
  );
}

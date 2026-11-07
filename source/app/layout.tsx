import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Centring — More room for your good work",
  description: "A little help with the funding part. Centring helps nonprofit teams explore opportunities, shape their ideas, and take the next step.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}

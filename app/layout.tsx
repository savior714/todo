import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FamilySync MVP",
  description: "FamilySync MVP baseline",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

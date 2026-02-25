import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Momentarise",
  description: "Life OS — Capture, Transform, Plan, Execute, Review",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${inter.className} font-sans antialiased`}>
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}

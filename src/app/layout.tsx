import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { AppHeader } from "./app-header";
import { currentProfile } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Um espaço simples para cuidar das suas finanças pessoais.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppHeader profile={(await currentProfile()).id} />
        {children}
      </body>
    </html>
  );
}

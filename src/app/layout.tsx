import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "./app-header";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Um espaço simples para cuidar das suas finanças pessoais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}

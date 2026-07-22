export const metadata = {
  title: "GYMPLUS Backend",
  description: "API interna do GYMPLUS (CRM/operações)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

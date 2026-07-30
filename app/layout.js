import "./styles.css";

export const metadata = {
  title: "Winnie's Workbench",
  description: "A soft, personal daily workbench."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff8fb"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

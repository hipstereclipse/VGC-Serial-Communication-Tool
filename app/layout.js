import "./globals.css";

const themeBootScript = `
  (() => {
    try {
      const saved = localStorage.getItem("vgc50x-theme");
      const theme = saved === "light" || saved === "dark"
        ? saved
        : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
    } catch {
      document.documentElement.dataset.theme = "dark";
    }
  })();
`;

export const metadata = {
  title: "INFICON Serial Console",
  description:
    "A local-first Web Serial console for INFICON VGC031 and VGC50x vacuum gauge controllers.",
  applicationName: "INFICON Serial Console",
  manifest: "./manifest.webmanifest",
  icons: {
    icon: "./icon.svg"
  }
};

export const viewport = {
  colorScheme: "dark",
  themeColor: "#0b1118",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

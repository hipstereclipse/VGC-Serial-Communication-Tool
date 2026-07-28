import "./globals.css";

export const metadata = {
  title: "VGC50x Serial Console",
  description:
    "A local-first Web Serial console for INFICON VGC501, VGC502, and VGC503 vacuum gauge controllers.",
  applicationName: "VGC50x Serial Console",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg"
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

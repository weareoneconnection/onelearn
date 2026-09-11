import type { CapacitorConfig } from "@capacitor/cli";

// The iOS app is a native shell around the live site: web and app share one codebase
// and one backend. Only the shell (icons, permissions, native plugins) lives in ios/.
const config: CapacitorConfig = {
  appId: "ai.oneailabs.onelearn",
  appName: "OneLearn",
  // Shown only if the site cannot load (e.g. offline at first launch).
  webDir: "capacitor/www",
  server: {
    // CAP_SERVER_URL lets a local build point the shell at a dev server for testing.
    url: process.env.CAP_SERVER_URL ?? "https://www.onelearn.ltd",
    cleartext: Boolean(process.env.CAP_SERVER_URL?.startsWith("http://")),
    allowNavigation: ["onelearn.ltd", "*.onelearn.ltd"],
  },
  ios: {
    backgroundColor: "#060b13",
    // The site pads its sticky header with env(safe-area-inset-top) itself.
    contentInset: "never",
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

// The iOS app is a native shell around the live site: web and app share one codebase
// and one backend. Only the shell (icons, permissions, native plugins) lives in ios/.
const config: CapacitorConfig = {
  appId: "ai.oneailabs.onelearn",
  appName: "OneLearn",
  // Shown only if the site cannot load (e.g. offline at first launch).
  webDir: "capacitor/www",
  server: {
    url: "https://www.onelearn.ltd",
    cleartext: false,
    allowNavigation: ["onelearn.ltd", "*.onelearn.ltd"],
  },
  ios: {
    backgroundColor: "#060b13",
    contentInset: "never",
  },
};

export default config;

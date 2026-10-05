import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.xoxe.game",
  appName: "XoXe",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
};

export default config;

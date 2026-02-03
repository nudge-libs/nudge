import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/bin.tsx"],
  format: ["esm"],
  outDir: "dist",
  dts: true,
  clean: true,
  exports: true,
});

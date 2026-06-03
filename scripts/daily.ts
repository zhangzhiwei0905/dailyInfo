import "./_env";

import { generateDailyBrief } from "../lib/web/generation-service";
import { sources } from "../lib/sources/registry";
import { todayKey } from "../lib/utils";

async function main() {
  const date = todayKey();
  const result = await generateDailyBrief({
    date,
    sources,
    outputDir: "daily_reports",
    writeFiles: true,
    outputMarkdown: process.env.OUTPUT_MARKDOWN === "true",
    includeTrading: true,
    log: console.log,
  });
  console.log(
    `[daily] wrote daily_reports/${date}/${date}.{json,html,articles.json}` +
      (result.markdown ? ", md" : ""),
  );
  console.log("[daily] done.");
}

main().catch((error) => {
  console.error("[daily] FAILED:", error);
  process.exit(1);
});

import fs from "fs";
import path from "path";

const ANALYSIS_DIR = path.join(process.cwd(), "data", "analysis");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  // Return index of all available dates
  if (!date || date === "index") {
    const indexPath = path.join(ANALYSIS_DIR, "index.json");
    if (!fs.existsSync(indexPath)) {
      return Response.json({ error: "Analysis data not found. Run data/export_analysis.py first." }, { status: 404 });
    }
    const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    return Response.json({ data: index });
  }

  // Return bars for a specific date
  const filePath = path.join(ANALYSIS_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) {
    // Fall back to latest available
    const files = fs.readdirSync(ANALYSIS_DIR)
      .filter(f => f.endsWith(".json") && f !== "index.json")
      .sort();
    if (files.length === 0) {
      return Response.json({ error: "No analysis data available." }, { status: 404 });
    }
    const latest = files[files.length - 1];
    const latestDate = latest.replace(".json", "");
    const bars = JSON.parse(fs.readFileSync(path.join(ANALYSIS_DIR, latest), "utf-8").replace(/\bNaN\b/g, "null"));
    return Response.json({ date: latestDate, bars, fallback: true });
  }

  const raw = fs.readFileSync(filePath, "utf-8").replace(/\bNaN\b/g, "null");
  const bars = JSON.parse(raw);
  return Response.json({ date, bars });
}

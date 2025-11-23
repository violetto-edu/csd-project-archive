#!/usr/bin/env node

/**
 * Script to fetch Google Sheets data and update batch markdown files
 * Usage:
 *   node scripts/update-batches.js                    (uses default sheet for 2022)
 *   node scripts/update-batches.js [sheet-id] [year] [gid]
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { parse } = require("csv-parse/sync");

// Configuration
const DEFAULT_SHEET_ID = "1usKC2Wq8kW6Wuo5yx5rK6SJuFEZIPCDckxsY8zlszgs";
const DEFAULT_YEAR = "2022";
const DEFAULT_GID = "0"; // Usually 0 for form responses

const customSheetId = process.argv[2];
const customYear = process.argv[3];
const customGid = process.argv[4];

// Validate year when custom sheet ID is provided
if (customSheetId && !customYear) {
  console.error("❌ Error: Year is required when using a custom sheet ID");
  console.error(
    "   Usage: node scripts/update-batches.js [sheet-id] [year] [gid]"
  );
  process.exit(1);
}

const SHEET_ID = customSheetId || DEFAULT_SHEET_ID;
const YEAR = customYear || DEFAULT_YEAR;
const GID = customGid || DEFAULT_GID;

// Try multiple export URL formats
const CSV_URLS = [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`,
];
const BATCHES_DIR = path.join(__dirname, "..", "_batches", YEAR);

/**
 * Fetch CSV from Google Sheets
 */
async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl) => {
      https
        .get(requestUrl, (res) => {
          // Handle redirects (301, 302, 307, 308)
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            // Follow redirect
            return makeRequest(res.headers.location);
          }

          if (res.statusCode !== 200) {
            reject(
              new Error(
                `Failed to fetch CSV: ${res.statusCode} ${res.statusMessage}`
              )
            );
            return;
          }

          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve(data);
          });
        })
        .on("error", reject);
    };

    makeRequest(url);
  });
}

/**
 * Parse batch number from "Batch 9" format to "batch-09"
 */
function parseBatchNumber(batchStr) {
  const match = batchStr.match(/batch\s*(\d+)/i);
  if (!match) {
    return null;
  }
  const num = parseInt(match[1], 10);
  return `batch-${num.toString().padStart(2, "0")}`;
}

/**
 * Parse front matter from markdown file
 */
function parseFrontMatter(content) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return { frontMatter: {}, body: content };
  }

  const frontMatterText = match[1];
  const body = match[2];

  // Parse YAML-like front matter
  const frontMatter = {};
  const lines = frontMatterText.split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    frontMatter[key] = value;
  }

  return { frontMatter, body };
}

/**
 * Generate front matter string from object
 */
function generateFrontMatter(frontMatter) {
  const lines = Object.entries(frontMatter).map(([key, value]) => {
    // Quote all string values (especially URLs and descriptions)
    if (typeof value === "string") {
      // Escape quotes in values
      const escapedValue = value.replace(/"/g, '\\"');
      return `${key}: "${escapedValue}"`;
    }
    return `${key}: ${value}`;
  });
  return `---\n${lines.join("\n")}\n---\n`;
}

/**
 * Update batch file with new data
 */
function updateBatchFile(batchSlug, data) {
  const filePath = path.join(BATCHES_DIR, `${batchSlug}.md`);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const { frontMatter, body } = parseFrontMatter(content);

  // Update front matter fields
  if (data.description !== undefined) {
    frontMatter.description = data.description || "";
  }
  if (data.journal_link !== undefined) {
    frontMatter.journal_link = data.journal_link || "";
  }
  if (data.ppt_link !== undefined) {
    frontMatter.ppt_link = data.ppt_link || "";
  }
  if (data.report_link !== undefined) {
    frontMatter.report_link = data.report_link || "";
  }
  if (data.code_link !== undefined) {
    frontMatter.code_link = data.code_link || "";
  }

  // Update abstract in body if it exists
  let updatedBody = body;
  if (data.abstract) {
    const abstractRegex =
      /^### Project Abstract\s*\n\n([\s\S]*?)(?=\n###|\n---|$)/m;
    if (abstractRegex.test(updatedBody)) {
      updatedBody = updatedBody.replace(
        abstractRegex,
        `### Project Abstract\n\n${data.abstract}\n`
      );
    } else {
      // Add abstract section if it doesn't exist
      updatedBody = `### Project Abstract\n\n${data.abstract}\n\n${updatedBody}`;
    }
  }

  // Write updated content
  const newContent = generateFrontMatter(frontMatter) + updatedBody;
  fs.writeFileSync(filePath, newContent, "utf-8");

  return true;
}

/**
 * Main function
 */
async function main() {
  console.log("📥 Fetching CSV from Google Sheets...");
  console.log(`   Sheet ID: ${SHEET_ID}`);
  console.log(`   Year: ${YEAR}`);
  console.log(`   Directory: ${BATCHES_DIR}\n`);
  console.log("   Note: Make sure the sheet is publicly viewable or shared\n");

  let csvData;
  let lastError;

  // Try multiple export URL formats
  for (let i = 0; i < CSV_URLS.length; i++) {
    const url = CSV_URLS[i];
    try {
      console.log(`   Trying URL format ${i + 1}...`);
      csvData = await fetchCSV(url);
      console.log(`   ✅ Success!\n`);
      break;
    } catch (error) {
      lastError = error;
      if (i < CSV_URLS.length - 1) {
        console.log(`   ⚠️  Failed, trying next format...`);
      }
    }
  }

  if (!csvData) {
    console.error("❌ Failed to fetch CSV from Google Sheets");
    console.error("   Error:", lastError.message);
    console.error("\n💡 Troubleshooting:");
    console.error("   1. Make sure the sheet is shared publicly:");
    console.error(
      "      - Open the sheet → Click 'Share' → 'Change to anyone with the link'"
    );
    console.error("      - Set permission to 'Viewer'");
    console.error("   2. For form responses, try publishing the sheet:");
    console.error("      - File → Share → Publish to web → Publish");
    console.error(
      "   3. Check if the GID is correct (try different values like 0, 1, etc.)"
    );
    process.exit(1);
  }

  try {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`✅ Fetched ${records.length} record(s)\n`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
      const batchNumber = record["Select your batch number."];
      if (!batchNumber) {
        console.warn("⚠️  Skipping record with no batch number");
        skipped++;
        continue;
      }

      const batchSlug = parseBatchNumber(batchNumber);
      if (!batchSlug) {
        console.warn(`⚠️  Could not parse batch number: ${batchNumber}`);
        skipped++;
        continue;
      }

      const data = {
        title: record["Project title"] || "",
        description: record["Project title"] || "", // Use title as description
        abstract: record["Short abstract of the project"] || "",
        journal_link:
          record[
            "Public Google drive link to project journal (PDF preferred)"
          ] || "",
        ppt_link:
          record[
            "Public Google drive link to project presentation (PDF/PPTX preferred)"
          ] || "",
        report_link:
          record[
            "Public Google drive link to project report (PDF preferred)"
          ] || "",
        code_link: record["Link to GitHub repository or deployment link"] || "",
      };

      console.log(`📝 Updating ${batchSlug}...`);
      if (updateBatchFile(batchSlug, data)) {
        console.log(`   ✅ Updated: ${data.title || "Untitled"}`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(
      `\n✨ Done! Updated ${updated} file(s), skipped ${skipped} record(s)`
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

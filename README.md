# Project Archive

A digital archive for managing and showcasing student projects from the Department of Computer Science and Design.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- **Ruby** (required for [Jekyll](https://jekyllrb.com/))
- **Node.js** (required for [Tailwind CSS](https://tailwindcss.com/))

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/violetto-rose/csd-project-archive.git
   cd csd-project-archive
   ```

2. **Install Ruby dependencies:**

   ```bash
   gem install bundler
   bundle install
   ```

3. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

### Running the Project Locally

You need to run both the CSS watcher and the Jekyll server in separate terminals:

1. **Start Tailwind CSS in watch mode:**

   ```bash
   npm run watch:css
   ```

2. **Start the Jekyll server:**
   ```bash
   bundle exec jekyll serve
   ```

Visit [http://localhost:4000](http://localhost:4000) to view the site.

### Updating Batch Data from Google Sheets

The project includes an automated script to fetch form responses from Google Sheets and update batch markdown files:

**Using the default sheet (2022 batches):**

```bash
npm run update:batches
```

**Using a custom Google Sheet:**

```bash
npm run update:batches -- [sheet-id] [year] [gid]
```

Example:

```bash
npm run update:batches -- abc123xyz 2023 0
```

**Note:** The Google Sheet must be publicly viewable (or the export must be accessible) for the script to work. Make sure to:

1. Open the sheet → Click "Share" → "Change to anyone with the link"
2. Set permission to "Viewer"

The script will automatically:

- Fetch CSV data from the Google Sheet
- Parse batch numbers and project information
- Update front matter (title, description, links)
- Update the project abstract in the markdown body

## Before Committing

**Reminder:** Before committing your changes, make sure to build the latest CSS:

```bash
npm run precommit
```

This ensures your production CSS is updated and committed.

## Managing Content

All project batch data is managed in Markdown files in the `_batches/[year]/` directory.

### Automated Updates (Recommended)

Use the update script to automatically sync data from Google Sheets form responses:

```bash
npm run update:batches
```

This will fetch the latest form submissions and update all batch files automatically.

### Manual Updates

You can also manually edit batch files:

1. Open (or create) the appropriate file: `_batches/[year]/batch-XX.md`
2. Update the front matter with the relevant links:
   ```yaml
   ---
   title: "Batch 01"
   slug: "batch-01"
   year: 2022
   permalink: /2022/batch-01/
   description: "Project description"
   journal_link: "https://..."
   ppt_link: "https://..."
   code_link: "https://..."
   report_link: "https://..."
   ---
   ```
3. Add or update the project abstract and team members in the Markdown body.

## License

This project is open source under the [MIT License](LICENSE).

# Philosophical Blog & Website

A static website hosted on **Netlify**. This project uses plain HTML, CSS, and JS with no built-in tools.

## 📁 Structure
- `index.html`: Home page.
- `about.html`: About page.
- `library.html`: List of all articles.
- `text.html`: The master template for articles. It fetches data from `data/texts.json` and parses Markdown from the `texts/` folder.
- `texts/`: Contains the actual article content in `.md` files.
- `data/texts.json`: Metadata for articles (title, date, reading time, etc.).
- `scripts/`: Utility scripts.

## 🚀 Local Development
To test the site locally:
1. Open the project in **VS Code**.
2. Use the **Live Server** extension (or the built-in emulator) to launch `index.html`.
3. Ensure your browser allows local fetching of JSON and Markdown files.

## 📡 RSS Feed
The `rss.xml` file is generated via a Python script. No external libraries needed.
To update the feed, run:
```bash
python3 scripts/generate_rss.py
# The Cabinet

Welcome to The Cabinet - A living cabinet of essays, treatises, and longform notes.
This site is a home for slow reading: careful arguments, field notes, and reflective drafts. Each piece was written to be read without distraction :) 

A static website hosted on **Netlify**. This project uses plain HTML, CSS, and JS with no built-in tools.

##  Built with simplicity
- 0 dependencies: no react, no tailwind, no bundlers
- RSS optimized: pure XML generation
- Markdown as a base for articles

##  License
This project is a "hybrid" repository containing both the engine and the articles

* **The Code** (infrastructure, CSS, and logic) is licensed under the [MIT License](LICENSE#1-code).
* **The Content** (essays, philosophical reflections, and prose) is licensed under [CC BY-NC-SA 4.0](LICENSE#2-content-essays--philosophical-works).

By contributing to this repository, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md) and license your contributions under these same terms.

##  Structure
- `index.html`: Home page.
- `about.html`: About page.
- `library.html`: List of all articles.
- `text.html`: The master template for articles. It fetches data from `data/texts.json` and parses Markdown from the `texts/` folder.
- `texts/`: Contains the actual article content in `.md` files.
- `data/texts.json`: Metadata for articles (title, date, reading time, etc.).
- `scripts/`: Utility scripts.

##  RSS feed
The `rss.xml` file is generated via a Python script. No external libraries needed.
To update the feed, run:
```bash
python3 scripts/generate_rss.py
```

##  Visual content workflow
| Task     | Action                                                 |
|----------|--------------------------------------------------------|
| Write    | Create new-post.md in /texts/                          |
| Register | Add metadata entry to data/texts.json                  |
| Sync     | Run python3 scripts/generate_rss.py to update the feed |

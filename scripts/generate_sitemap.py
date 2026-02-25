import os
import glob
from datetime import datetime, timezone

SITE_URL = "https://fromthecabinet.com"
STATIC_PAGES = {
    "index.html": {"priority": "1.0", "url": "/"},
    "about.html": {"priority": "0.8", "url": "/about.html"},
    "library.html": {"priority": "0.8", "url": "/library.html"},
    "privacy-policy.html": {"priority": "0.5", "url": "/privacy-policy.html"}
}

def generate_sitemap():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    texts_dir = os.path.join(base_dir, "texts")
    sitemap_xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for file, info in STATIC_PAGES.items():
        file_path = os.path.join(base_dir, file)
        if os.path.exists(file_path):
            mod_time = datetime.fromtimestamp(os.path.getmtime(file_path), timezone.utc).strftime("%Y-%m-%d")
        else:
            mod_time = current_date

        url = SITE_URL + info["url"]
        sitemap_xml.append('  <url>')
        sitemap_xml.append(f'    <loc>{url}</loc>')
        sitemap_xml.append(f'    <lastmod>{mod_time}</lastmod>')
        sitemap_xml.append('    <changefreq>monthly</changefreq>')
        sitemap_xml.append(f'    <priority>{info["priority"]}</priority>')
        sitemap_xml.append('  </url>')

    if os.path.exists(texts_dir):
        for md_file in sorted(glob.glob(os.path.join(texts_dir, "*.md"))):
            filename = os.path.basename(md_file)
            slug = os.path.splitext(filename)[0]
            
            mod_time = datetime.fromtimestamp(os.path.getmtime(md_file), timezone.utc).strftime("%Y-%m-%d")
            url = f"{SITE_URL}/text.html?slug={slug}"
            
            sitemap_xml.append('  <url>')
            sitemap_xml.append(f'    <loc>{url}</loc>')
            sitemap_xml.append(f'    <lastmod>{mod_time}</lastmod>')
            sitemap_xml.append('    <changefreq>monthly</changefreq>')
            sitemap_xml.append('    <priority>0.7</priority>')
            sitemap_xml.append('  </url>')

    sitemap_xml.append('</urlset>')

    sitemap_path = os.path.join(base_dir, "sitemap.xml")
    
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sitemap_xml))
        f.write("\n")

    print(f"sitemap.xml successfully generated at: {sitemap_path}")

if __name__ == "__main__":
    generate_sitemap()

#!/usr/bin/env python3
import argparse
import datetime as dt
import email.utils
import html
import json
import re
from pathlib import Path
from urllib.parse import quote, urljoin

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "texts.json"
OUTPUT_PATH = ROOT / "rss.xml"

DEFAULT_SITE_URL = "https://example.com/"
DEFAULT_TITLE = "The Cabinet"
DEFAULT_DESCRIPTION = "Essays, treatises, and longform notes from The Cabinet."


def parse_date(value):
  if not value:
    return None
  try:
    parsed = dt.datetime.fromisoformat(value)
  except ValueError:
    return None
  if parsed.tzinfo is None:
    parsed = parsed.replace(tzinfo=dt.timezone.utc)
  return parsed


def render_inline_markdown(text):
  escaped = html.escape(text)
  escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
  escaped = re.sub(r"\*(.+?)\*", r"<em>\1</em>", escaped)
  escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
  return escaped


def markdown_to_html(markdown):
  lines = markdown.replace("\r", "").split("\n")
  blocks = []
  paragraph = []
  quote = []
  list_state = None

  def flush_paragraph():
    if paragraph:
      blocks.append({"type": "p", "text": " ".join(paragraph)})
      paragraph.clear()

  def flush_quote():
    if quote:
      blocks.append({"type": "blockquote", "text": " ".join(quote)})
      quote.clear()

  def flush_list():
    nonlocal list_state
    if list_state and list_state["items"]:
      blocks.append(list_state)
    list_state = None

  for line in lines:
    trimmed = line.strip()
    if not trimmed:
      flush_paragraph()
      flush_quote()
      flush_list()
      continue

    heading_match = re.match(r"^(#{1,3})\s+(.*)$", trimmed)
    if heading_match:
      flush_paragraph()
      flush_quote()
      flush_list()
      level = len(heading_match.group(1))
      blocks.append({"type": f"h{min(level + 1, 4)}", "text": heading_match.group(2)})
      continue

    if trimmed.startswith(">"):
      flush_paragraph()
      flush_list()
      quote.append(trimmed[1:].lstrip())
      continue

    ol_match = re.match(r"^\d+\.\s+(.*)$", trimmed)
    if ol_match:
      flush_paragraph()
      flush_quote()
      if not list_state or list_state["type"] != "ol":
        flush_list()
        list_state = {"type": "ol", "items": []}
      list_state["items"].append(ol_match.group(1))
      continue

    ul_match = re.match(r"^[-*+]\s+(.*)$", trimmed)
    if ul_match:
      flush_paragraph()
      flush_quote()
      if not list_state or list_state["type"] != "ul":
        flush_list()
        list_state = {"type": "ul", "items": []}
      list_state["items"].append(ul_match.group(1))
      continue

    flush_quote()
    flush_list()
    paragraph.append(trimmed)

  flush_paragraph()
  flush_quote()
  flush_list()

  rendered = []
  for block in blocks:
    if block["type"] == "p":
      rendered.append(f"<p>{render_inline_markdown(block['text'])}</p>")
    elif block["type"] == "blockquote":
      rendered.append(f"<blockquote>{render_inline_markdown(block['text'])}</blockquote>")
    elif block["type"] in ("ul", "ol"):
      items = "".join(
        f"<li>{render_inline_markdown(item)}</li>" for item in block["items"]
      )
      rendered.append(f"<{block['type']}>{items}</{block['type']}>")
    else:
      rendered.append(f"<{block['type']}>{render_inline_markdown(block['text'])}</{block['type']}>")
  return "".join(rendered)


def extract_summary(entry, markdown_text):
  for key in ("summary", "excerpt"):
    value = entry.get(key)
    if value:
      return value
  for paragraph in re.split(r"\n\s*\n", markdown_text.strip()):
    text = " ".join(line.strip() for line in paragraph.splitlines())
    if text:
      return text
  return ""


def cdata_safe(value):
  return value.replace("]]>", "]]]]><![CDATA[>")


def build_rss(entries, site_url, title, description):
  base_url = site_url.rstrip("/") + "/"
  channel_link = base_url
  rss_url = urljoin(base_url, "rss.xml")
  last_build = entries[0]["date"] if entries else None
  if last_build is None:
    last_build = dt.datetime.now(tz=dt.timezone.utc)
  last_build_date = email.utils.format_datetime(last_build)

  items = []
  for entry in entries:
    slug = entry["slug"]
    item_link = urljoin(base_url, f"text.html?slug={quote(slug)}")
    pub_date = entry["date"] or dt.datetime.now(tz=dt.timezone.utc)
    pub_date_str = email.utils.format_datetime(pub_date)
    summary = html.escape(entry["summary"])
    content_html = entry["content_html"]
    content_block = ""
    if content_html:
      content_block = (
        "<content:encoded><![CDATA["
        + cdata_safe(content_html)
        + "]]></content:encoded>"
      )

    lines = [
      "    <item>",
      f"      <title>{html.escape(entry['title'])}</title>",
      f"      <link>{item_link}</link>",
      f"      <guid isPermaLink=\"true\">{item_link}</guid>",
      f"      <pubDate>{pub_date_str}</pubDate>",
      f"      <description>{summary}</description>",
    ]
    if content_block:
      lines.append(f"      {content_block}")
    lines.append("    </item>")
    items.append("\n".join(lines))

  xml = "\n".join(
    [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<rss version=\"2.0\"",
      "  xmlns:atom=\"http://www.w3.org/2005/Atom\"",
      "  xmlns:content=\"http://purl.org/rss/1.0/modules/content/\">",
      "  <channel>",
      f"    <title>{html.escape(title)}</title>",
      f"    <link>{channel_link}</link>",
      f"    <description>{html.escape(description)}</description>",
      "    <language>en-us</language>",
      f"    <lastBuildDate>{last_build_date}</lastBuildDate>",
      f"    <atom:link href=\"{rss_url}\" rel=\"self\" type=\"application/rss+xml\" />",
      *items,
      "  </channel>",
      "</rss>",
      "",
    ]
  )
  return xml


def main():
  parser = argparse.ArgumentParser(description="Generate rss.xml from texts.json.")
  parser.add_argument(
    "--site-url",
    default=DEFAULT_SITE_URL,
    help="Base site URL, e.g. https://example.com/",
  )
  parser.add_argument("--title", default=DEFAULT_TITLE, help="Feed title")
  parser.add_argument("--description", default=DEFAULT_DESCRIPTION, help="Feed description")
  parser.add_argument(
    "--output",
    default=str(OUTPUT_PATH),
    help="Output path for rss.xml",
  )
  args = parser.parse_args()

  with DATA_PATH.open("r", encoding="utf-8") as handle:
    data = json.load(handle)

  entries = []
  for entry in data:
    content_path = ROOT / entry.get("content", "")
    markdown_text = ""
    if content_path.is_file():
      markdown_text = content_path.read_text(encoding="utf-8")
    summary = extract_summary(entry, markdown_text)
    content_html = markdown_to_html(markdown_text) if markdown_text else ""
    entries.append(
      {
        "slug": entry.get("slug", ""),
        "title": entry.get("title", ""),
        "date": parse_date(entry.get("date")),
        "summary": summary,
        "content_html": content_html,
      }
    )

  entries.sort(
    key=lambda item: item["date"] or dt.datetime.min.replace(tzinfo=dt.timezone.utc),
    reverse=True,
  )

  output_path = Path(args.output)
  xml = build_rss(entries, args.site_url, args.title, args.description)
  output_path.write_text(xml, encoding="utf-8")


if __name__ == "__main__":
  main()

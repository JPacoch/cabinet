(() => {
  const TEXTS_URL = "data/texts.json";
  let cachedTexts = null;
  let revealObserver = null;
  let revealObserverTall = null;
  const REVEAL_THRESHOLD = 0.2;
  const REVEAL_TALL_THRESHOLD = 0;
  const THEME_STORAGE_KEY = "cabinet-theme";

  const getStoredTheme = () => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        return stored;
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  };

  const getPreferredTheme = () => {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) {
      return;
    }
    const label = toggle.querySelector("[data-theme-label]");
    const isDark = theme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.classList.toggle("is-dark", isDark);
    if (label) {
      label.textContent = isDark ? "Light" : "Dark";
    }
  };

  const initThemeToggle = () => {
    const toggle = document.querySelector("[data-theme-toggle]");
    const storedTheme = getStoredTheme();
    const initialTheme = storedTheme || getPreferredTheme();
    applyTheme(initialTheme);

    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (error) {
        console.error(error);
      }
      applyTheme(nextTheme);
    });

    const media = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    if (media && !storedTheme) {
      media.addEventListener("change", (event) => {
        applyTheme(event.matches ? "dark" : "light");
      });
    }
  };

  const handleReveal = (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  };

  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const renderInlineMarkdown = (text) => {
    let output = escapeHtml(text);
    output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    output = output.replace(/\*(.+?)\*/g, "<em>$1</em>");
    output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
    return output;
  };

  const markdownToHtml = (markdown) => {
    // First pass: collect sidenote definitions
    const sidenotes = new Map();
    const sidenoteDefs = markdown.match(/^\[\^(\d+)\]:\s*(.+)$/gm);

    if (sidenoteDefs) {
      sidenoteDefs.forEach((def) => {
        const match = def.match(/^\[\^(\d+)\]:\s*(.+)$/);
        if (match) {
          const [, num, content] = match;
          sidenotes.set(num, content.trim());
        }
      });
    }

    let cleanedMarkdown = markdown.replace(/^\[\^(\d+)\]:\s*.+$/gm, '');

    const lines = cleanedMarkdown.replace(/\r/g, "").split("\n");
    const blocks = [];
    let paragraph = [];
    let quote = [];
    let list = null;

    const flushParagraph = () => {
      if (paragraph.length) {
        blocks.push({ type: "p", text: paragraph.join(" ") });
        paragraph = [];
      }
    };

    const flushQuote = () => {
      if (quote.length) {
        blocks.push({ type: "blockquote", text: quote.join(" ") });
        quote = [];
      }
    };

    const flushList = () => {
      if (list && list.items.length) {
        blocks.push(list);
      }
      list = null;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushQuote();
        flushList();
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushQuote();
        flushList();
        const level = headingMatch[1].length;
        blocks.push({ type: `h${Math.min(level + 1, 4)}`, text: headingMatch[2] });
        return;
      }

      if (trimmed.startsWith(">")) {
        flushParagraph();
        flushList();
        quote.push(trimmed.replace(/^>\s?/, ""));
        return;
      }

      const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        flushParagraph();
        flushQuote();
        if (!list || list.type !== "ol") {
          flushList();
          list = { type: "ol", items: [] };
        }
        list.items.push(olMatch[1]);
        return;
      }

      const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
      if (ulMatch) {
        flushParagraph();
        flushQuote();
        if (!list || list.type !== "ul") {
          flushList();
          list = { type: "ul", items: [] };
        }
        list.items.push(ulMatch[1]);
        return;
      }

      flushQuote();
      flushList();
      paragraph.push(trimmed);
    });

    flushParagraph();
    flushQuote();
    flushList();

    const processSidenotes = (renderedHtml) => {
      return renderedHtml.replace(/\[\^(\d+)\]/g, (match, num) => {
        const content = sidenotes.get(num);
        if (content) {
          const renderedContent = renderInlineMarkdown(content);
          return `<span class="sidenote"><sup class="sidenote-ref">${num}</sup><span class="sidenote-content"><span class="sidenote-number">${num}.</span> ${renderedContent}</span></span>`;
        }
        return match;
      });
    };

    return blocks
      .map((block) => {
        if (block.type === "p") {
          const rendered = renderInlineMarkdown(block.text);
          return `<p>${processSidenotes(rendered)}</p>`;
        }
        if (block.type === "blockquote") {
          const rendered = renderInlineMarkdown(block.text);
          return `<blockquote>${processSidenotes(rendered)}</blockquote>`;
        }
        if (block.type === "ul" || block.type === "ol") {
          const items = block.items
            .map((item) => {
              const rendered = renderInlineMarkdown(item);
              return `<li>${processSidenotes(rendered)}</li>`;
            })
            .join("");
          return `<${block.type}>${items}</${block.type}>`;
        }
        const rendered = renderInlineMarkdown(block.text);
        return `<${block.type}>${processSidenotes(rendered)}</${block.type}>`;
      })
      .join("");
  };

  const formatTags = (tags) => {
    if (!Array.isArray(tags) || tags.length === 0) {
      return "";
    }
    return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  };

  const getDisplayDate = (item) => {
    if (item.date) {
      const parts = item.date.split("-");
      if (parts.length >= 2) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIdx = parseInt(parts[1], 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${months[monthIdx]} ${parts[0]}`;
        }
      }
    }
    return item.updated;
  };

  const getTexts = async () => {
    if (cachedTexts) {
      return cachedTexts;
    }
    try {
      const response = await fetch(TEXTS_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load texts.");
      }
      const data = await response.json();
      cachedTexts = data.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      return cachedTexts;
    } catch (error) {
      console.error(error);
      cachedTexts = [];
      return cachedTexts;
    }
  };

  const initReveal = () => {
    const revealItems = Array.from(
      document.querySelectorAll("[data-reveal]:not(.reveal-ready)")
    );
    if (revealItems.length === 0) {
      return;
    }

    revealItems.forEach((item, index) => {
      item.classList.add("reveal-ready");
      item.style.transitionDelay = `${index * 0.08}s`;
    });

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("in-view"));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(handleReveal, {
        threshold: REVEAL_THRESHOLD,
      });
    }

    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const tallCutoff =
      viewportHeight > 0 ? viewportHeight / REVEAL_THRESHOLD : 0;

    revealItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const needsTallObserver =
        item.hasAttribute("data-article") || (tallCutoff && rect.height > tallCutoff);
      const isVisible =
        viewportHeight > 0 && rect.top < viewportHeight && rect.bottom > 0;

      if (needsTallObserver && isVisible) {
        item.classList.add("in-view");
        return;
      }

      if (needsTallObserver && !revealObserverTall) {
        revealObserverTall = new IntersectionObserver(handleReveal, {
          threshold: REVEAL_TALL_THRESHOLD,
        });
      }

      const observer = needsTallObserver && revealObserverTall
        ? revealObserverTall
        : revealObserver;
      observer.observe(item);
    });
  };

  const renderHome = (texts) => {
    const grid = document.querySelector("[data-texts-grid]");
    if (!grid) {
      return;
    }

    const count = Number(grid.dataset.count) || 3;
    const items = texts.slice(0, count);

    if (items.length === 0) {
      grid.innerHTML = "<p class=\"section-subtitle\">New texts will appear here soon.</p>";
      return;
    }

    grid.innerHTML = items
      .map((item) => {
        const tags = (item.cardTags && item.cardTags.length ? item.cardTags : item.tags || [])
          .slice(0, 2);
        return `
          <a class="card" href="text.html?slug=${encodeURIComponent(item.slug)}" data-reveal>
            <div class="meta">${escapeHtml(item.type)}</div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.excerpt || item.summary || "")}</p>
            <div class="tag-row">${formatTags(tags)}</div>
          </a>
        `;
      })
      .join("");
  };

  const renderLibraryList = (list, items, emptyState) => {
    if (!list) {
      return;
    }

    list.innerHTML = items
      .map((item) => {
        return `
          <article class="library-item" data-reveal>
            <div class="library-meta">
              <span>${escapeHtml(item.type)}</span>
              <span>${escapeHtml(item.readingTime)}</span>
              <span>${escapeHtml(getDisplayDate(item))}</span>
            </div>
            <h3><a href="text.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.summary || item.excerpt || "")}</p>
            <div class="tag-row">${formatTags(item.tags || [])}</div>
          </article>
        `;
      })
      .join("");

    if (emptyState) {
      emptyState.hidden = items.length !== 0;
    }

    initReveal();
  };

  const renderLibrary = (texts) => {
    const list = document.querySelector("[data-library-list]");
    if (!list) {
      return;
    }

    const searchInput = document.querySelector("[data-library-search]");
    const tagContainer = document.querySelector("[data-library-tags]");
    const tagToggle = document.querySelector("[data-tag-toggle]");
    const emptyState = document.querySelector("[data-library-empty]");
    const activeTags = new Set();
    const tagLimit = 12;

    const normalize = (value) => String(value || "").toLowerCase();

    const buildTagButtons = () => {
      if (!tagContainer) {
        return;
      }
      const tagCounts = new Map();
      texts.forEach((text) => {
        (text.tags || []).forEach((tag) => {
          const key = String(tag);
          tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
        });
      });
      const tags = Array.from(tagCounts.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }
          return a[0].localeCompare(b[0]);
        })
        .map(([tag]) => tag);
      const commonTags = tags.slice(0, tagLimit);
      const extraTags = tags.slice(tagLimit);
      const allButton = `
        <button class="tag tag-button" type="button" data-tag="__all" aria-pressed="true">All</button>
      `;
      const renderTagButton = (tag, isExtra) => {
        return `<button class="tag tag-button${isExtra ? " tag-extra" : ""}" type="button" data-tag="${escapeHtml(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`;
      };
      tagContainer.innerHTML =
        allButton +
        commonTags.map((tag) => renderTagButton(tag, false)).join("") +
        extraTags.map((tag) => renderTagButton(tag, true)).join("");

      tagContainer.classList.remove("is-expanded");
      if (tagToggle) {
        const hasExtras = extraTags.length > 0;
        tagToggle.hidden = !hasExtras;
        tagToggle.setAttribute("aria-expanded", "false");
        tagToggle.textContent = "Show more tags";
      }
    };

    const updateTagButtons = () => {
      if (!tagContainer) {
        return;
      }
      tagContainer.querySelectorAll("button[data-tag]").forEach((button) => {
        const tag = button.dataset.tag;
        const isActive = tag === "__all" ? activeTags.size === 0 : activeTags.has(tag);
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    };

    const applyFilters = () => {
      const term = normalize(searchInput ? searchInput.value.trim() : "");
      const filtered = texts.filter((text) => {
        const haystack = [
          text.title,
          text.summary,
          text.excerpt,
          (text.tags || []).join(" "),
        ]
          .map((value) => normalize(value))
          .join(" ");

        const matchesTerm = term === "" || haystack.includes(term);
        const matchesTags =
          activeTags.size === 0 ||
          Array.from(activeTags).every((tag) =>
            (text.tags || []).some((textTag) => normalize(textTag) === normalize(tag))
          );
        return matchesTerm && matchesTags;
      });

      renderLibraryList(list, filtered, emptyState);
    };

    if (tagContainer) {
      tagContainer.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-tag]");
        if (!button) {
          return;
        }
        const tag = button.dataset.tag;
        if (tag === "__all") {
          activeTags.clear();
        } else {
          if (activeTags.has(tag)) {
            activeTags.delete(tag);
          } else {
            activeTags.add(tag);
          }
        }
        updateTagButtons();
        applyFilters();
      });
    }

    if (tagToggle && tagContainer) {
      tagToggle.addEventListener("click", () => {
        const isExpanded = tagContainer.classList.toggle("is-expanded");
        tagToggle.setAttribute("aria-expanded", String(isExpanded));
        tagToggle.textContent = isExpanded ? "Show fewer tags" : "Show more tags";
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        applyFilters();
      });
    }

    buildTagButtons();
    updateTagButtons();
    applyFilters();
  };

  const setupShareToolbar = (entry) => {
    const shareToolbar = document.querySelector("[data-share-toolbar]");
    if (!shareToolbar) {
      return;
    }

    if (!entry) {
      shareToolbar.hidden = true;
      return;
    }

    const shareUrl = window.location.href;
    const shareTitle = entry.title || document.title;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const shareMap = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    };

    shareToolbar.querySelectorAll("a[data-share]").forEach((link) => {
      const platform = link.dataset.share;
      if (shareMap[platform]) {
        link.href = shareMap[platform];
      }
    });

    const statusEl = shareToolbar.querySelector("[data-share-status]");
    const copyButton = shareToolbar.querySelector('button[data-share="copy"]');
    if (copyButton && !copyButton.dataset.ready) {
      copyButton.dataset.ready = "true";
      copyButton.addEventListener("click", async () => {
        const announce = (message) => {
          if (statusEl) {
            statusEl.textContent = message;
          }
        };
        const markCopied = () => {
          copyButton.classList.add("is-copied");
          announce("Link copied to clipboard.");
          window.setTimeout(() => {
            copyButton.classList.remove("is-copied");
            announce("");
          }, 2000);
        };

        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(shareUrl);
            markCopied();
            return;
          }

          const textarea = document.createElement("textarea");
          textarea.value = shareUrl;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (success) {
            markCopied();
            return;
          }
        } catch (error) {
          console.error(error);
        }

        announce("Copy failed. Select the address bar to copy.");
      });
    }

    shareToolbar.hidden = false;
  };

  const renderArticle = async (texts) => {
    const article = document.querySelector("[data-article]");
    if (!article) {
      return;
    }

    const titleEl = article.querySelector("[data-article-title]");
    const metaEl = article.querySelector("[data-article-meta]");
    const bodyEl = article.querySelector("[data-article-body]");
    const errorEl = article.querySelector("[data-article-error]");
    const tagsEl = document.querySelector("[data-article-tags]");
    const slug = new URLSearchParams(window.location.search).get("slug");

    const showError = (message) => {
      if (titleEl) {
        titleEl.textContent = "Text not found";
      }
      if (metaEl) {
        metaEl.innerHTML = "";
      }
      if (bodyEl) {
        bodyEl.innerHTML = "";
      }
      if (tagsEl) {
        tagsEl.textContent = "";
      }
      setupShareToolbar(null);
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
    };

    if (!slug) {
      showError("Choose a text from the library to start reading.");
      return;
    }

    const entry = texts.find((text) => text.slug === slug);
    if (!entry) {
      showError("This text could not be found. Return to the library to choose another entry.");
      return;
    }

    if (errorEl) {
      errorEl.hidden = true;
    }

    if (titleEl) {
      titleEl.textContent = entry.title;
    }

    document.title = `${entry.title} | The Cabinet`;
    setupShareToolbar(entry);

    if (metaEl) {
      metaEl.innerHTML = "";
      [entry.type, entry.readingTime, `Updated ${getDisplayDate(entry)}`].forEach((label) => {
        if (!label) {
          return;
        }
        const span = document.createElement("span");
        span.textContent = label;
        metaEl.appendChild(span);
      });
    }

    if (tagsEl) {
      tagsEl.textContent = entry.tags && entry.tags.length
        ? `Filed under: ${entry.tags.join(", ")}`
        : "";
    }

    try {
      const response = await fetch(entry.content, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load text.");
      }
      const markdown = await response.text();
      if (bodyEl) {
        bodyEl.innerHTML = markdownToHtml(markdown);
      }
    } catch (error) {
      console.error(error);
      showError("This text could not be loaded. Please try again later.");
    }
  };

  const init = async () => {
    initThemeToggle();
    const needsTexts = document.querySelector(
      "[data-texts-grid], [data-library-list], [data-article]"
    );
    if (needsTexts) {
      const texts = await getTexts();
      renderHome(texts);
      renderLibrary(texts);
      await renderArticle(texts);
    }
    initReveal();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* Newsletter Modal Logic */
window.toggleModal = function (show) {
  const modal = document.getElementById('newsletterModal');
  if (!modal) return;

  if (show) {
    modal.classList.remove('closing');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active');
      modal.classList.remove('closing');
      document.body.style.overflow = '';
    }, 300);
  }
};

window.addEventListener('click', (event) => {
  const modal = document.getElementById('newsletterModal');
  if (event.target === modal) {
    window.toggleModal(false);
  }
});

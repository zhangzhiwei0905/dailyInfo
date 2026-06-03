import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fetchRss } from "../lib/sources/rss";

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Short Chinese RSS description</title>
      <link>https://example.com/zh</link>
      <pubDate>Wed, 03 Jun 2026 12:00:00 +0000</pubDate>
      <description><![CDATA[短句]]></description>
    </item>
    <item>
      <title>Short English RSS description</title>
      <link>https://example.com/en</link>
      <pubDate>Wed, 03 Jun 2026 13:00:00 +0000</pubDate>
      <description><![CDATA[Brief.]]></description>
    </item>
    <item>
      <title>Long RSS description should not become excerpt</title>
      <link>https://example.com/long-description</link>
      <pubDate>Wed, 03 Jun 2026 14:00:00 +0000</pubDate>
      <description><![CDATA[This RSS description is intentionally long enough to look usable, but it is still only feed metadata and should not be used as the displayed source excerpt when the original article body is available.]]></description>
    </item>
  </channel>
</rss>`;

const pages: Record<string, string> = {
  "/zh": `<!doctype html><html><body><article>
    <p>这是第一段正文，包含足够的信息来替代 RSS 里过短的描述，说明事件背景和核心事实。</p>
    <p>这是第二段正文，继续补充关键细节，确保原文摘录像真正的文章摘录。</p>
  </article></body></html>`,
  "/en": `<!doctype html><html><body><main>
    <p>This is the first real paragraph from an English article with enough context to replace a short RSS teaser.</p>
    <p>This is the second paragraph with more concrete details for the source excerpt.</p>
  </main></body></html>`,
  "/long-description": `<!doctype html><html><body><article>
    <p>This paragraph comes from the actual article body and should be preferred over a long RSS description.</p>
    <p>The source excerpt should therefore reflect body text rather than feed metadata.</p>
  </article></body></html>`,
};

function listen(server: ReturnType<typeof createServer>) {
  return new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.equal(typeof address, "object");
      assert.ok(address);
      resolve((address as AddressInfo).port);
    });
  });
}

async function main() {
  let baseUrl = "";
  const server = createServer((request, response) => {
    const path = request.url ?? "/";
    if (path === "/feed") {
      response.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8" });
      response.end(rss.replaceAll("https://example.com", baseUrl));
      return;
    }
    const page = pages[path];
    if (page) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(page);
      return;
    }
    response.writeHead(404);
    response.end("");
  });

  try {
    const port = await listen(server);
    baseUrl = `http://127.0.0.1:${port}`;
    const items = await fetchRss("mock-rss", `${baseUrl}/feed`, "tech", {
      hydrateShortExcerpt: true,
    });

    assert.equal(items.length, 3);
    assert.match(items[0].excerpt ?? "", /第一段正文/);
    assert.match(items[0].excerpt ?? "", /第二段正文/);
    assert.notEqual(items[0].excerpt, "短句", "short RSS teaser should be replaced");
    assert.match(items[1].excerpt ?? "", /first real paragraph/);
    assert.match(items[1].excerpt ?? "", /second paragraph/);
    assert.notEqual(items[1].excerpt, "Brief.", "short English teaser should be replaced");
    assert.match(items[2].excerpt ?? "", /actual article body/);
    assert.match(items[2].excerpt ?? "", /body text rather than feed metadata/);
    assert.doesNotMatch(items[2].excerpt ?? "", /RSS description is intentionally long/);
    console.log("[rss-excerpt-smoke-test] ok");
  } finally {
    server.close();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

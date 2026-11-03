import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { URL } from "node:url";

const htmlPath = new URL("../code.html", import.meta.url);

test("Stitch landing screen contains the shell and preserved 3D scene", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /<header[\s>]/);
  assert.match(html, /data-path="landing"/);
  assert.match(html, /data-path="preview"/);
  assert.match(html, /threejs-container-ANIMATION_4/);
  assert.match(html, /timeline-tab-btn/);
});

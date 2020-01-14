// ==UserScript==
// @name NGA Auto Refresh
// @version 0.1.3
// @description Refresh NGA post automatically.
// @license MIT
// @author eight04 <eight04@gmail.com> (https://github.com/eight04)
// @homepageURL https://github.com/eight04/nga-auto-refresh
// @supportURL https://github.com/eight04/nga-auto-refresh/issues
// @namespace https://github.com/eight04
// @match *://bbs.nga.cn/read.php*
// @grant none
// ==/UserScript==

/* eslint-env browser */
(async () => {
  const updateInterval = 60 * 1000;
  const statusText = createStatusText();
  let lastUpdate = Date.now();
  // https://github.com/Tampermonkey/tampermonkey/issues/705
  const setTimeout = window.setTimeout.bind(window);
  const fetch = window.fetch.bind(window);

  while (!document.querySelector("[title=加载下一页]")) {
    while (Date.now() - lastUpdate < updateInterval) {
      updateStatus();
      await delay(1000);
    }
    updateStatus("loading");
    let r;
    try {
      r = await fetch(location.href);
      if (!r.ok) {
        throw new Error("connection error");
      }
    } catch (err) {
      console.error(err, r);
      continue;
    }
    const buffer = await r.arrayBuffer();
    const parser = new DOMParser;
    const root = parser.parseFromString(await decodeGBK(buffer), "text/html");
    const loadedIds = getLoadedIds();

    const nodes = root.querySelector("#m_posts_c").children;
    const posts = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const id = nodes[i].firstElementChild.firstElementChild.id;
      if (loadedIds.has(id)) {
        continue;
      }
      posts.push({
        table: nodes[i],
        js: createScript(nodes[i + 1])
      });
    }
    
    if (posts.length) {
      // update userinfo
      for (const script of root.querySelectorAll("script")) {
        if (script.textContent.includes("userinfostart")) {
          document.head.appendChild(createScript(script));
          break;
        }
      }
      
      // update post
      const container = document.querySelector("#m_posts_c");
      for (const post of posts) {
        container.append(post.table, post.js);
      }

    }
    // update pagination
    const buttonBar = document.querySelector("#pagebbtm");
    const newButtonBar = root.querySelector("#pagebbtm");
    buttonBar.parentNode.replaceChild(newButtonBar, buttonBar);
    refreshScripts(newButtonBar);
    
    lastUpdate = Date.now();
  }

  updateStatus("current page completed");

  function getLoadedIds() {
    const s = new Set;
    const rows = document.querySelectorAll(".postrow");
    for (const row of rows) {
      s.add(row.id);
    }
    return s;
  }

  function createStatusText() {
    const posts = document.querySelector("#m_posts");
    const el = document.createElement("div");
    el.style.margin = "10px";
    el.style.textAlign = "center";
    posts.parentNode.insertBefore(el, posts.nextSibling);
    return el;
  }

  function updateStatus(text) {
    if (!text) {
      text = Math.round((updateInterval - (Date.now() - lastUpdate)) / 1000);
    }
    statusText.textContent = text;
  }

  function delay(s) {
    return new Promise(resolve => setTimeout(resolve, s));
  }
  
  function decodeGBK(buffer) {
    const decoder = new TextDecoder("gbk");
    return decoder.decode(buffer);
  }
  
  function createScript(script) {
    const newScript = document.createElement("script");
    newScript.textContent = script.textContent;
    return newScript;
  }
  
  function refreshScripts(el) {
    const scripts = el.querySelectorAll("script");
    for (const script of scripts) {
      const newScript = createScript(script);
      script.parentNode.replaceChild(newScript, script);
    }
  }
})();

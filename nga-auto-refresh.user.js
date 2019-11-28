// ==UserScript==
// @name NGA Auto Refresh
// @version 0.0.0
// @description Refresh NGA post automatically.
// @license MIT
// @author eight04 <eight04@gmail.com> (https://github.com/eight04)
// @homepageURL https://github.com/eight04/nga-auto-refresh
// @supportURL https://github.com/eight04/nga-auto-refresh/issues
// @include *://bbs.nga.cn/read.php*
// @grant none
// ==/UserScript==

/* eslint-env browser */
(async () => {
  const updateInterval = 60 * 1000;
  const statusText = createStatusText();
  let lastUpdate = Date.now();

  while (!document.querySelector("[title=加载下一页]")) {
    while (Date.now() - lastUpdate < updateInterval) {
      updateStatus();
      await delay(1000);
    }
    updateStatus("loading");
    const buffer = await (await fetch(location.href)).arrayBuffer();
    const parser = new DOMParser;
    const root = parser.parseFromString(await decodeGBK(buffer), "text/html");
    const lastCommentID = getLastPostID();

    const nodes = root.querySelector("#m_posts_c").children;
    const posts = [];
    for (let i = 0; i < nodes.length; i += 2) {
      posts.push({
        table: nodes[i],
        js: createScript(nodes[i + 1])
      });
    }
    const index = posts.findIndex(p => p.table.firstElementChild.firstElementChild.id.endsWith(lastCommentID));
    if (index < 0) {
      throw new Error(`cannot find comment ${lastCommentID}`);
    }
    
    const newPosts = posts.slice(index + 1);
    if (newPosts.length) {
      // update userinfo
      for (const script of root.querySelectorAll("script")) {
        if (script.textContent.includes("userinfostart")) {
          document.head.appendChild(createScript(script));
          break;
        }
      }
      
      // update post
      const container = document.querySelector("#m_posts_c");
      for (const post of newPosts) {
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

  function getLastPostID() {
    const posts = document.querySelectorAll(".postrow");
    return posts[posts.length - 1].id.match(/\d+$/)[0];
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

// ==UserScript==
// @name         B站播放次数统计
// @namespace    bilibili-playcount-panel
// @version      2.2
// @description  只要触发ended事件即统计次数，显示带封面、作者、时间的Top10（默认收起，还原原版UI）
// @match        *://www.bilibili.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = "bili_play_counts_v2";

  function getData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getBV() {
    const m = location.pathname.match(/\/video\/(BV\w+)/);
    return m ? m[1] : null;
  }

  // 抓取封面图 URL
  function getCover() {
    const meta = document.querySelector('meta[property="og:image"]');
    return meta ? meta.content : "";
  }

  // 抓取作者名
  function getAuthor() {
    const authorElem = document.querySelector('.up-name') || document.querySelector('.name');
    return authorElem ? authorElem.innerText.trim() : "未知";
  }

  function waitVideo() {
    const video = document.querySelector("video");
    if (!video) {
      setTimeout(waitVideo, 500);
      return;
    }

    let countedThisRound = false;

    // 只要视频结束，就执行统计逻辑
    video.addEventListener("ended", () => {
      if (countedThisRound) return;

      const bv = getBV();
      if (!bv) return;

      const data = getData();
      const now = new Date();
      const dateStr = `${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (!data[bv]) {
        data[bv] = {
            title: document.title.replace("_哔哩哔哩_bilibili", "").trim(),
            count: 0,
            cover: getCover(),
            author: getAuthor()
        };
      }

      data[bv].count += 1;
      data[bv].lastSeen = dateStr;
      countedThisRound = true;

      saveData(data);
      updatePanel();

      console.log(`🎬 记录成功：${data[bv].title}`);
    });

    // 切换视频时重置逻辑（针对多P视频或自动连播）
    video.addEventListener("play", () => {
      countedThisRound = false;
    });
  }

  function createPanel() {
    if (document.getElementById("bili-panel")) return;

    const panel = document.createElement("div");
    panel.id = "bili-panel";
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 260px;
      max-height: 400px;
      background: rgba(30,30,30,0.95);
      color: #fff;
      z-index: 99999;
      border-radius: 12px;
      padding: 10px;
      font-size: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
      display: flex;
      flex-direction: column;
    `;

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>🎵 播放 Top10</strong>
        <span id="bili-toggle" style="cursor:pointer;">➕</span>
      </div>
      <div id="bili-list" style="margin-top:8px;overflow:auto;max-height:360px;display:none;"></div>
    `;

    document.body.appendChild(panel);

    let collapsed = true;
    panel.querySelector("#bili-toggle").onclick = () => {
      collapsed = !collapsed;
      panel.querySelector("#bili-list").style.display = collapsed ? "none" : "block";
      panel.querySelector("#bili-toggle").innerText = collapsed ? "➕" : "➖";
    };
  }

  function updatePanel() {
    const data = getData();
    const list = document.getElementById("bili-list");
    if (!list) return;

    const items = Object.entries(data)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    list.innerHTML = items.map(([bv, item], i) => `
      <a href="https://www.bilibili.com/video/${bv}" target="_blank" style="text-decoration:none; color:inherit; display:flex; margin-bottom:10px; align-items:flex-start;">
        <img src="${item.cover}" referrerpolicy="no-referrer" style="width:70px; height:44px; border-radius:4px; margin-right:8px; object-fit:cover;">
        <div style="flex:1; overflow:hidden;">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:bold; margin-bottom:2px;">${item.title}</div>
            <div style="color:#aaa; font-size:10px;">UP: ${item.author}</div>
            <div style="display:flex; justify-content:space-between; color:#00aeec; font-size:10px; margin-top:2px;">
                <span>播放 ${item.count} 次</span>
                <span style="color:#666;">${item.lastSeen || ''}</span>
            </div>
        </div>
      </a>
    `).join("");
  }

  createPanel();
  waitVideo();
  updatePanel();
})();
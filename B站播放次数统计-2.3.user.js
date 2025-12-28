// ==UserScript==
// @name         B站播放次数统计
// @namespace    bilibili-playcount-panel
// @version      2.3
// @description  只要触发ended事件即统计次数，显示带封面、作者、时间的Top10（亮色UI版）
// @match        *://www.bilibili.com/*
// @grant        none
// @license      MIT
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

  function getCover() {
    const meta = document.querySelector('meta[property="og:image"]');
    return meta ? meta.content : "";
  }

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
      background: rgba(255, 255, 255, 0.98);
      color: #18191c;
      z-index: 99999;
      border-radius: 12px;
      padding: 8px;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      border: 1px solid #e3e5e7;
      display: flex;
      flex-direction: column;
      font-family: -apple-system,BlinkMacSystemFont,Helvetica Neue,Helvetica,Arial,Microsoft YaHei,PingFang SC,sans-serif;
    `;

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid #f1f2f3;">
        <strong style="color:#fb7299;display:flex;align-items:center;gap:4px;">
          <svg style="width:16px;height:16px;" viewBox="0 0 1024 1024"><path fill="currentColor" d="M732.1 202.9c-20.9 0-37.9 17-37.9 37.9V315H329.8v-74.2c0-20.9-17-37.9-37.9-37.9s-37.9 17-37.9 37.9v74.2H172c-48.4 0-87.7 39.3-87.7 87.7v446.4c0 48.4 39.3 87.7 87.7 87.7h680c48.4 0 87.7-39.3 87.7-87.7V314.9c0-48.4-39.3-87.7-87.7-87.7h-82v-74.3c0-20.9-17-37.9-37.9-37.9zM884.2 849c0 6.6-5.4 12-12 12H172c-6.6 0-12-5.4-12-12V470.1h724.2V849zM512 556.7l163.7 114.3-163.7 114.3V556.7z"></path></svg>
          播放 Top10
        </strong>
        <span id="bili-toggle" style="cursor:pointer;color:#9499a0;font-size:12px;user-select:none;">展开 ▾</span>
      </div>
      <div id="bili-list" style="overflow-y:auto;overflow-x:hidden;max-height:380px;display:none;padding-right:4px;"></div>
    `;

    document.body.appendChild(panel);

    let collapsed = true;
    panel.querySelector("#bili-toggle").onclick = () => {
      collapsed = !collapsed;
      panel.querySelector("#bili-list").style.display = collapsed ? "none" : "block";
      panel.querySelector("#bili-toggle").innerText = collapsed ? "展开 ▾" : "收起 ▴";
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
      <a href="https://www.bilibili.com/video/${bv}" target="_blank" style="text-decoration:none; color:inherit; display:flex; margin-bottom:12px; align-items:flex-start; transition: opacity 0.2s;">
        <div style="position:relative;">
            <img src="${item.cover}" referrerpolicy="no-referrer" style="width:80px; height:50px; border-radius:6px; margin-right:10px; object-fit:cover; border:1px solid #e3e5e7;">
            <span style="position:absolute; left:0; top:0; background:rgba(251,114,153,0.9); color:white; font-size:10px; padding:0 4px; border-radius:6px 0 6px 0;">${i+1}</span>
        </div>
        <div style="flex:1; overflow:hidden;">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:500; margin-bottom:2px; font-size:12px; color:#18191c;" title="${item.title}">${item.title}</div>
            <div style="color:#9499a0; font-size:11px;">UP: ${item.author}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span style="color:#fb7299; font-size:11px; font-weight:bold;">播放 ${item.count} 次</span>
                <span style="color:#bdc1c6; font-size:10px;">${item.lastSeen || ''}</span>
            </div>
        </div>
      </a>
    `).join("");
  }

  createPanel();
  waitVideo();
  updatePanel();
})();
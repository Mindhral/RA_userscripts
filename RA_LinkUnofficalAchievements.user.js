// ==UserScript==
// @name         RA_LinkUnofficalAchievements
// @namespace    RA
// @version      0.3
// @description  Adds a link to unofficial achievements on a game's page
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('f') === '5') return;

    const achievementTitle = document.querySelector('#achievement > h2');
    if (achievementTitle == null) return;
    if (achievementTitle.innerText !== 'Achievements') return;

    const link = document.createElement('a');
    urlParams.set('f', '5');
    link.href = window.location.pathname + '?' + urlParams.toString();
    link.innerHTML = 'view the unofficial achievements';
    achievementTitle.after(link);
});
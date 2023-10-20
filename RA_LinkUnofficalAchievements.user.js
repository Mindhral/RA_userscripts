// ==UserScript==
// @name         RA_LinkUnofficalAchievements
// @namespace    RA
// @version      0.1
// @description  Adds a link to unofficial achievements on a game's page
// @author       Mindhral
// @match        https://retroachievements.org/game/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

(function() {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('f') === '5') return
    console.log(urlParams)
    console.log(urlParams.get('f'))

    const achievementTitle = document.querySelector('#achievement > h2')
    if (achievementTitle == null) return

    const link = document.createElement('a')
    urlParams.set('f', '5')
    console.log(window.location.pathname)
    console.log(urlParams.toString())
    link.href = window.location.pathname + '?' + urlParams.toString()
    link.innerHTML = 'view the unofficial achievements'
    achievementTitle.after(link)
})();
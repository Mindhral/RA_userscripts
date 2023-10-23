// ==UserScript==
// @name         RA_HideProfileAchievementsBadges
// @namespace    RA
// @version      0.1
// @description  Hides achievements badges on profile page
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

const Settings = {
    maxBadgesCount: 48,
    showBadgesCount: 32
};

(function() {
    const badgeContainers = document.querySelectorAll('div.recentlyplayed > div:nth-of-type(2n)');
    badgeContainers.forEach(div => {
        if (div.children.length <= Settings.maxBadgesCount) return;
        for (let i=Settings.showBadgesCount; i < div.children.length; i++) {
            div.children[i].classList.add('hidden')
        }
        const showButton = document.createElement('button');
        showButton.className='btn'
        showButton.style['margin-top']='0.3em'
        showButton.innerHTML='Show all'
        div.append(showButton)
        showButton.addEventListener('click', () => {
            showButton.remove()
            for (let i=Settings.showBadgesCount; i < div.children.length; i++) {
                div.children[i].classList.remove('hidden')
            }
        });
    });
})();
// ==UserScript==
// @name         RA_Progress2JSON
// @namespace    RA
// @version      0.3
// @description  Adds a button to progress section on profile page to copy the data in JSON format
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        unsafeWindow
// ==/UserScript==

const createIcon = (icon, title) => {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'icon';
    iconDiv.style.cssText = 'font-size: 0.65em; cursor: pointer';
    iconDiv.title = title;
    iconDiv.innerHTML = icon;
    return iconDiv;
}

document.addEventListener("DOMContentLoaded", () => {
    // only active for authentified user's own page
    const currentUserDiv = document.querySelector('div.dropdown-menu-right div.dropdown-header');
    if (currentUserDiv == null) return;
    const currentUser = currentUserDiv.textContent;
    const pageUserDiv = document.querySelector('div.usersummary h3');
    const pageUser = pageUserDiv.textContent;
    if (currentUser !== pageUser) return;

    const completedGamesTitle = document.querySelector('div#completedgames h3');
    if (completedGamesTitle == null) return;

    // HTML DOM manipulations
    completedGamesTitle.classList.add('flex');
    const titleSpan = document.createElement('span');
    titleSpan.className = 'grow';
    titleSpan.innerHTML = completedGamesTitle.innerHTML;
    const copyIconDiv = createIcon('📋', 'copy progress as JSON');
    const linkIconDiv = createIcon('🔗', 'open JSON in new tab');
    completedGamesTitle.replaceChildren(titleSpan, copyIconDiv, linkIconDiv);

    // building object row by row (i.e game by game)
    const addRowInfo = progress => row => {
      const gameId = parseInt(row.getElementsByTagName('a')[0].href.split('/').at(-1));
      const hcProgressArr = row.getElementsByClassName('completion-hardcore')[0].title.match(/Hardcore: (\d+)\/(\d+)/);
      const hcUnlocked = parseInt(hcProgressArr[1]);
      const total = parseInt(hcProgressArr[2]);
      const scProgressArr = row.getElementsByClassName('progressbar-label')[0].innerText.match(/(\d+) of \d+/);
      const scUnlocked = parseInt(scProgressArr[1]);
      progress[gameId] = { 'NumAch': total, 'Earned': scUnlocked, 'HCEarned': hcUnlocked };
    };

    // building complete JSON
    const getProgressJson = () => {
        const progress = {};
        const rows = document.querySelectorAll('#usercompletedgamescomponent tr');
        rows.forEach(addRowInfo(progress));
        return JSON.stringify(progress);
    };
    copyIconDiv.addEventListener('click', () => {
        navigator.clipboard.writeText(getProgressJson());
        copyIconDiv.style.cursor = 'grabbing';
        setTimeout(() => { copyIconDiv.style.cursor = 'pointer' }, 500);
    });
    linkIconDiv.addEventListener('click', () => {
        const newWindow = unsafeWindow.open('', 'progress');
        newWindow.location = 'data:application/json,' + getProgressJson();
    });
});
// ==UserScript==
// @name         RA_Played2CSV
// @namespace    RA
// @version      0.4.1
// @description  Adds button to progress section on profile page to copy data on played games in CSV format or open it in a new tab
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @exclude      https://retroachievements.org/user/*/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        unsafeWindow
// ==/UserScript==

const fieldSeparator = ',';
const lineSeparator = '\r\n';

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
    const pageUserDiv = document.querySelector('article h1');
    const pageUser = pageUserDiv.textContent;
    if (currentUser !== pageUser) return;

    const completedGamesTitle = document.querySelector('div#completedgames h3');
    if (completedGamesTitle == null) return;

    // HTML DOM manipulations
    completedGamesTitle.classList.add('flex');
    const emptySpan = document.createElement('span');
    emptySpan.className = 'grow';
    const link = document.createElement('a');
    link.title = 'open CSV in new tab';
    link.style.cssText = 'font-size: 0.65em;cursor: pointer';
    link.innerHTML = 'csv';
    const copyIconDiv = createIcon('📋', 'copy data as CSV');
    completedGamesTitle.append(emptySpan, link, copyIconDiv);

    // building object row by row (i.e game by game)
    const getRowInfo = row => {
        const id = parseInt(row.getElementsByTagName('a')[0].href.split('/').at(-1));
        const firstPara = row.querySelector('p');
        const title = row.querySelector('a img').getAttribute('alt').replace(/~.+~/, '').trim().replace(' game badge', '');
        const tags = [...row.querySelector('p').querySelectorAll('span.tag span:first-child')].map(span => span.innerText);
        const consoleName = row.querySelector('td:first-child div > span:not(.tag)').innerText.trim();
        const progressTitle = row.querySelector('div[role="progressbar"]').title;
        const hcProgressMatch = progressTitle.match(/(\d+)\/(\d+) \(hardcore\)/);
        const hcUnlocked = hcProgressMatch ? parseInt(hcProgressMatch[1]) : 0;
        const scProgressMatch = progressTitle.match(/(\d+)\/(\d+) \(softcore\)/);
        const scUnlocked = scProgressMatch ? parseInt(scProgressMatch[1]) : hcUnlocked;
        const total = parseInt(hcProgressMatch ? hcProgressMatch[2] : scProgressMatch[2]);
        const status = row.querySelector('div[data-award]').dataset.award;
        return { id, title, tags, console: consoleName, hcUnlocked, scUnlocked, total, status, 'unlock date': '' };
    };

    // building complete Object
    const getRowsInfo = () => {
        const rowsData = [...document.querySelectorAll('#usercompletedgamescomponent tr')]
            .map(getRowInfo)
            .sort((r1, r2) => r1.id - r2.id);
        const awardsDivs = document.querySelectorAll('aside > div .component > div');
        awardsDivs.forEach(div => {
            const id = parseInt(div.dataset.gameid);
            const row = rowsData.find(r => r.id === id);
            if (row) row['unlock date'] = new Date(div.dataset.date).toLocaleString();
        });
        return rowsData;
    };

    // convert a value to String and escape it for CSV
    const stringifyColumn = val => {
        const str = val.toString();
        return str.includes(fieldSeparator) || str.includes('"') ? `"${str.replace('"', '""')}"` : str;
    }

    // complete CSV string from an array of objects
    const toCSV = rows => {
        return Object.keys(rows[0]).map(stringifyColumn).join(fieldSeparator) + lineSeparator
            + rows.map(r => Object.values(r).map(stringifyColumn).join(fieldSeparator)).join(lineSeparator);
    };

    copyIconDiv.addEventListener('click', () => {
        navigator.clipboard.writeText(toCSV(getRowsInfo()));
        copyIconDiv.style.cursor = 'grabbing';
        setTimeout(() => { copyIconDiv.style.cursor = 'pointer' }, 500);
    });
    link.addEventListener('click', () => {
        unsafeWindow.open('data:text/csv,' + encodeURI(toCSV(getRowsInfo())), 'played');
    });
});
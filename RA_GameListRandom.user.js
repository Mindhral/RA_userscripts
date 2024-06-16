// ==UserScript==
// @name         RA_GameListRandom
// @namespace    RA
// @version      0.2.1
// @description  On Game list pages (Want to play, All games), adds a button to shuffle the list if it's single page or one to select a random game if it's paginated
// @author       Mindhral
// @match        https://retroachievements.org/gameList.php*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

function shuffle(array) {
    let index = array.length;
    while (index > 1) {
        let newIdx = Math.floor(Math.random() * index);
        index--;
        [array[index], array[newIdx]] = [array[newIdx], array[index]];
    }
    return array;
}

function getGamesRows() {
    return [...document.querySelectorAll('table.table-highlight tr:not(.do-not-highlight)')];
}

function addButton(label) {
    const filtersDiv = document.querySelector('article div[align="right"]');
    // dev pages get exluded here
    if (!filtersDiv) return null;

    const button = document.createElement('button');
    button.className = 'btn';
    button.style['margin-right'] = '1em';
    button.innerHTML = label;
    filtersDiv.prepend(button);
    return button;
}

function addRandomGameButton() {
    const gamesCount = parseInt(document.querySelector('article > h2 + p')?.innerText.match(/\d+/)[0]) || 0
    if (!gamesCount) return; // offset > gamesCount ?
    const button = addButton('Random game');
    if (!button) return;
    button.addEventListener('click', () => {
        const rndIdx = Math.floor(Math.random() * gamesCount);
        const urlParams = new URLSearchParams(window.location.search);
        const offset = parseInt(urlParams.get('o')) || 0;
        if (rndIdx >= offset && rndIdx < offset + 50) {
            const displayIdx = rndIdx - offset;
            window.location.hash = 'g' + displayIdx;
            filterGame(displayIdx);
        } else {
            const pageGameOffset = rndIdx % 50;
            const newUrl = new URL(window.location);
            urlParams.set('o', rndIdx - pageGameOffset);
            newUrl.hash = 'g' + pageGameOffset;
            newUrl.search = urlParams;
            window.location = newUrl;
        }
    });
}

function filterGame(idx) {
    getGamesRows().forEach((element, i) => {
        const f = (i == idx) ? 'remove' : 'add';
        element.classList[f]('hidden');
    });

    if (document.getElementById('allGamesButton')) return;
    const allGamesButton = addButton('All games');
    allGamesButton.id = 'allGamesButton';
    allGamesButton.title = 'Show all games from the current page';
    allGamesButton.addEventListener('click', () => {
        getGamesRows().forEach((element) => element.classList.remove('hidden'));
        allGamesButton.remove();
        window.location.hash = '';
        const offset = parseInt(new URLSearchParams(window.location.search).get('o')) || 0;
    });
}

function addShuffleButton() {
    const allRows = getGamesRows();
    if (allRows.length == 0) return; // unsupported consoles, ...

    const button = addButton('Shuffle');
    if (!button) return; // dev pages
    button.addEventListener('click', () => {
        shuffle(allRows);
        const lastIdx = allRows.length - 1;
        const last = allRows[lastIdx];
        for (let i = 0; i < lastIdx; i++) last.before(allRows[i]);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // special case of hubs list
    const consoleId = new URLSearchParams(window.location.search).get('c');
    // Hubs and Events
    if(consoleId == '100' || consoleId == '101') return;
    // presence of pagination
    if (document.querySelector('article > div.text-right')) {
        addRandomGameButton();
        const urlHash = window.location.hash;
        if (urlHash.match(/^#g\d+$/)) filterGame(parseInt(urlHash.slice(2)));
    } else {
        addShuffleButton();
    }
});
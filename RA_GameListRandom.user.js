// ==UserScript==
// @name         RA_GameListRandom
// @namespace    RA
// @version      0.3
// @description  On Want to play page, adds a button to select a random game with the current filter selection
// @author       Mindhral
// @match        https://retroachievements.org/game-list/play*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

let paginationBlock;
let filterIndex;
let randomButton;
let allGamesButton;

function getElementsByXpath(root, xpath) {
    const results = document.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const nodes = [];
    let node;
    while (node = results.iterateNext()) nodes.push(node);
    return nodes;
}

function setVisible(element, visible) {
    const method = visible ? 'remove' : 'add';
    element?.classList[method]('hidden');
}

function isVisible(element) {
    return !element.classList.contains('hidden');
}

function getGamesRows() {
    return [...document.querySelectorAll('article table tbody tr')];
}

function addButton(label) {
    let filtersDiv;
    for (const gameCountPara of getElementsByXpath(document, '//p[contains(.,"games")]')) {
        const match = gameCountPara.innerText.match(/^(\d+) of \d+ games$/);
        if (match) filtersDiv = gameCountPara.parentElement;
        break;
    }
    if (!filtersDiv) return null;
    const refButton = filtersDiv.querySelector('button:last-of-type');

    const button = document.createElement('button');
    button.className = refButton?.className || 'btn';
    button.innerHTML = label;
    filtersDiv.prepend(button);
    return button;
}

function getGamesCount() {
    for (const gameCountPara of getElementsByXpath(document, '//p[contains(.,"games")]')) {
        const match = gameCountPara.innerText.match(/^(\d+) of \d+ games$/);
        if (match) return match[1];
    }
}

function getPagination() {
    const paginationMatch = paginationBlock.parentElement.querySelector('p').innerText.match(/Page (\d+) of (\d+)$/);
    const idxToInt = idx => parseInt(paginationMatch?.[idx]) || 1;
    return {current: idxToInt(1), max: idxToInt(2)};
}

let itemsPerPage;
function getItemsPerPage() {
    if (itemsPerPage) return itemsPerPage;

    const pagination = getPagination();
    const rowsCount = getGamesRows().length;
    if (pagination.max == 1) {
        // only 1 page: we can't know the max value, but the rows count will work for the current situation
        return rowsCount;
    }
    if (pagination.current < pagination.max) {
        // not the last page: the rows count is the max value
        itemsPerPage = rowsCount;
    } else {
        // last page: we divide the total rows for the prevous pages by their number
        itemsPerPage = (getGamesCount() - rowsCount) / (pagination.max - 1);
    }
    return itemsPerPage;
}

function addRandomGameButton() {
    const gamesCount = getGamesCount();
    if (!gamesCount) return; // offset > gamesCount ?
    randomButton = addButton('Random game');
    if (!randomButton) return;
    setVisible(randomButton, gamesCount > 0);
    randomButton.addEventListener('click', () => {
        const rndIdx = Math.floor(Math.random() * getGamesCount());
        const targetPage = 1 + Math.floor(rndIdx / getItemsPerPage());
        const urlParams = new URLSearchParams(window.location.search);
        const pagination = getPagination();
        const filterIdx = rndIdx % getItemsPerPage();
        if (targetPage == pagination.current) {
            filterGame(filterIdx);
            return;
        }
        const buttonIdx = (() => { switch (targetPage) {
            case pagination.current - 1: return 2;
            case pagination.current + 1 : return 3;
            case 1: return 1;
            case pagination.max: return 4;
            default: return -1;
        }})();
        if (buttonIdx >= 0) {
            filterIndex = filterIdx;
            if (buttonIdx > 0) paginationBlock.querySelector(`button:nth-child(${buttonIdx})`).click();
        } else {
            const newUrl = new URL(window.location);
            urlParams.set('page[number]', targetPage);
            newUrl.search = urlParams;
            newUrl.hash = 'g' + filterIdx;
            window.location = newUrl;
        }
    });
}

function addAllGamesButton() {
    allGamesButton = addButton('All games');
    allGamesButton.id = 'allGamesButton';
    allGamesButton.title = 'Show all games from the current page';
    allGamesButton.addEventListener('click', () => {
        getGamesRows().forEach((element) => setVisible(element, true));
        setVisible(allGamesButton, false);
        setVisible(paginationBlock, true);
    });
}

function updateState() {
    setVisible(randomButton, getGamesCount() > 0);
    if (filterIndex) {
        filterGame(filterIndex);
        filterIndex = null;
    } else if (isVisible(allGamesButton)) {
        allGamesButton.click();
    }
}

function filterGame(idx) {
    getGamesRows().forEach((element, i) => setVisible(element, i == idx));

    setVisible(paginationBlock, false);
    setVisible(allGamesButton, true);
}

window.addEventListener("load", () => {
    paginationBlock = document.querySelector('nav[aria-label="pagination"]');
    addRandomGameButton();
    addAllGamesButton();
    setVisible(allGamesButton, false);

    const newNodesObserver = new MutationObserver(updateState);
    const newNodesConfig = { childList: true, subtree: true, characterData: true };
    newNodesObserver.observe(document.querySelector('article tbody'), newNodesConfig);

    const urlHash = window.location.hash;
    if (urlHash.match(/^#g\d+$/)) {
        filterGame(parseInt(urlHash.slice(2)));
        window.location.hash = '';
    }
});
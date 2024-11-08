// ==UserScript==
// @name         RA_GameListRandom
// @namespace    RA
// @version      0.5
// @description  On Want to play page, adds a button to select a random game with the current filter selection
// @author       Mindhral
// @match        https://retroachievements.org/games*
// @match        https://retroachievements.org/game-list/play*
// @exclude      https://retroachievements.org/games/*
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

function parseUSInt(str, def = 0) {
    return parseInt(str?.replaceAll(',', '') ?? def);
}

// sets the value of an <input> element handled by React
function setNativeValue(element, value) {
    let lastValue = element.value;
    element.value = value;
    let event = new Event("input", { target: element, bubbles: true });
    event.simulated = true; // React 15
  	element._valueTracker?.setValue(lastValue); // React 16
    element.dispatchEvent(event);
}

function getGamesRows() {
    return [...document.querySelectorAll('article table tbody tr')];
}

function addButton(label) {
    let filtersDiv;
    for (const gameCountPara of getElementsByXpath(document, '//p[contains(.,"games")]')) {
        const match = gameCountPara.innerText.match(/^[\d,]+ of [\d,]+ games$/);
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
        const match = gameCountPara.innerText.match(/^([\d,]+) of [\d,]+ games$/);
        if (match) return parseUSInt(match[1]);
    }
}

function getPagination() {
    const current = parseInt(paginationBlock.querySelector('input').value);
    const paginationMatch = paginationBlock.innerText.match(/Page\s+of (\d+)$/);
    const max = parseUSInt(paginationMatch?.[1], 1);
    return {current, max};
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
    const pageInput = paginationBlock.querySelector('input');
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
        filterIndex = filterIdx;
        setNativeValue(pageInput, targetPage);
    });
}

function addAllGamesButton() {
    allGamesButton = addButton('All games');
    if (!allGamesButton) return;
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
    if (filterIndex != null) {
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
    const addButtons = () => {
        paginationBlock = document.querySelector('nav[aria-label="pagination"]');
        if (!paginationBlock) return false;
        addRandomGameButton();
        addAllGamesButton();
        setVisible(allGamesButton, false);

        // listen for changes in the games list table: new/deleted lines, or line content change
        // should trigger every time a new page is loaded, or the filter criteria change
        const newNodesObserver = new MutationObserver(updateState);
        const newNodesConfig = { childList: true, subtree: true, characterData: true };
        newNodesObserver.observe(document.querySelector('article tbody'), newNodesConfig);
        return true;
    };

    if (!addButtons()) {
        const navNodeObserver = new MutationObserver(() => {
            if (addButtons()) navNodeObserver.disconnect();
        });
        navNodeObserver.observe(document.querySelector('article'), { childList: true, subtree: true });
    }
});
// ==UserScript==
// @name         RA_ScrollProfileAwards
// @namespace    RA
// @version      0.4
// @description  Set a max height for the game award section on profile pages, and a scroll bar if necessary
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @match        https://retroachievements.org/controlpanel.php*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const PropertyPrefix = 'ScrollProfileAwards.';
const Settings = {
    maxHeight: GM_getValue(PropertyPrefix + 'maxHeight', 75), // unit: em
    minGameCount: GM_getValue(PropertyPrefix + 'minGameCount', 100)
};

function newElement(tagName, parent, className = null, innerHTML = null) {
    const result = document.createElement(tagName);
    parent.append(result);
    if (className != null) result.className = className;
    if (innerHTML != null) result.innerHTML = innerHTML;
    return result;
}

function settingsPage() {
    const xpathRes = document.evaluate("//div[h3[text()='Settings']]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const settingsDiv = xpathRes.iterateNext();
    if (settingsDiv == null) return;

    const newDiv = document.createElement('div');
    newDiv.className = 'component';
    settingsDiv.insertAdjacentElement('afterend', newDiv);
    const title = newElement('h4', newDiv, null, 'Scroll Profile Awards');
    const table = newElement('table', newDiv, 'table-highlight');
    const tbody = newElement('tbody', table);

    const minGamesLine = newElement('tr', tbody);
    newElement('td', minGamesLine, null, 'Minimum number of games for showing the scroll bar');
    const minGamesCell = newElement('td', minGamesLine);
    const minGamesInput = newElement('input', minGamesCell);
    minGamesInput.type = 'number';
    minGamesInput.value = Settings.minGameCount;
    minGamesInput.style.width = '7em';

    const maxHeightLine = newElement('tr', tbody);
    newElement('td', maxHeightLine, null, 'Maximum height of the section with the scroll bar');
    const maxHeightCell = newElement('td', maxHeightLine);
    const maxHeightInput = newElement('input', maxHeightCell);
    maxHeightInput.type = 'number';
    maxHeightInput.value = Settings.maxHeight;
    maxHeightInput.min = 10;
    maxHeightInput.style.width = '7em';
    const unitSpan = newElement('span', maxHeightCell, null, ' em');
    unitSpan.title = 'em: font-size of the element';
    unitSpan.style.cursor = 'help';

    maxHeightInput.addEventListener('input', () => {
        if (!maxHeightInput.reportValidity()) return;
        GM_setValue(PropertyPrefix + 'maxHeight', parseInt(maxHeightInput.value));
    });
    minGamesInput.addEventListener('input', () => {
        if (!minGamesInput.reportValidity()) return;
        GM_setValue(PropertyPrefix + 'minGameCount', parseInt(minGamesInput.value));
    });
}

function profilePage() {
    const awardsDiv = document.querySelector('div#gameawards div.component');
    if (awardsDiv.children.length < Settings.minGameCount) return;
    awardsDiv.style['overflow-y'] = 'auto';
    awardsDiv.style['max-height'] = Settings.maxHeight + 'em';
    if (window.matchMedia('(min-width: 1280px)').matches) {
        awardsDiv.style['padding-left'] = '0.75rem';
        awardsDiv.style['padding-right'] = '0.75rem';
    } else if (window.matchMedia('(min-width: 768px)').matches) {
        awardsDiv.style['padding-left'] = '0';
        awardsDiv.style['padding-right'] = '0';
        awardsDiv.style.gap = '0.2rem';
    }
}

if (window.location.pathname.startsWith('/controlpanel.php')) {
    document.addEventListener("DOMContentLoaded", settingsPage);
} else {
    document.addEventListener("DOMContentLoaded", profilePage);
}
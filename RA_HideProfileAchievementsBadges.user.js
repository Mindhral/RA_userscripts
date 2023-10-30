// ==UserScript==
// @name         RA_HideProfileAchievementsBadges
// @namespace    RA
// @version      0.2
// @description  Hides achievements badges on profile page
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @match        https://retroachievements.org/controlpanel.php*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const PropertyPrefix = 'HideProfileAchievementsBadges.';
const Settings = {
    maxBadgesCount: GM_getValue(PropertyPrefix + 'maxBadgesCount', 48),
    showBadgesCount: GM_getValue(PropertyPrefix + 'showBadgesCount', 32)
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
    const title = newElement('h4', newDiv, null, 'Hide Profile Achievements Badges');
    const table = newElement('table', newDiv, 'table-highlight');
    const tbody = newElement('tbody', table);

    const maxBadgesLine = newElement('tr', tbody);
    newElement('td', maxBadgesLine, null, 'Maximum number of badges before hiding any');
    const maxBadgesCell = newElement('td', maxBadgesLine);
    const maxBadgesInput = newElement('input', maxBadgesCell);
    maxBadgesInput.type = 'number';
    maxBadgesInput.value = Settings.maxBadgesCount;
    maxBadgesInput.min = 0;
    maxBadgesInput.style.width = '7em';
    maxBadgesInput.append(' em');

    const shownBadgesLine = newElement('tr', tbody);
    newElement('td', shownBadgesLine, null, 'Number of badges always displayed');
    const shownBadgesCell = newElement('td',shownBadgesLine);
    const shownBadgesInput = newElement('input', shownBadgesCell);
    shownBadgesInput.type = 'number';
    shownBadgesInput.value = Settings.showBadgesCount;
    shownBadgesInput.min = 0;
    shownBadgesInput.style.width = '7em';

    maxBadgesInput.addEventListener('input', () => {
        if (!maxBadgesInput.reportValidity()) return;
        GM_setValue(PropertyPrefix + 'maxBadgesCount', parseInt(maxBadgesInput.value));
    });
    shownBadgesInput.addEventListener('input', () => {
        if (!shownBadgesInput.reportValidity()) return;
        GM_setValue(PropertyPrefix + 'showBadgesCount', parseInt(shownBadgesInput.value));
    });
}

function profilePage() {
    const badgeContainers = document.querySelectorAll('div.recentlyplayed > div:nth-of-type(2n)');
    badgeContainers.forEach(div => {
        if (div.children.length <= Settings.maxBadgesCount) return;
        for (let i=Settings.showBadgesCount; i < div.children.length; i++) {
            div.children[i].classList.add('hidden')
        }
        const showButton = document.createElement('button');
        showButton.className='btn'
        showButton.style['margin-top']='0.5em'
        showButton.style['margin-left']='0.8em'
        showButton.innerHTML='Show all'
        div.append(showButton)
        showButton.addEventListener('click', () => {
            showButton.remove()
            for (let i=Settings.showBadgesCount; i < div.children.length; i++) {
                div.children[i].classList.remove('hidden')
            }
        });
    });
}

if (window.location.pathname.startsWith('/controlpanel.php')) {
    settingsPage();
} else {
    profilePage();
}
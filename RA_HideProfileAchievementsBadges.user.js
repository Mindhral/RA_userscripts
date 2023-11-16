// ==UserScript==
// @name         RA_HideProfileAchievementsBadges
// @namespace    RA
// @version      0.5
// @description  Hides achievements badges on profile page
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @match        https://retroachievements.org/controlpanel.php*
// @exclude      https://retroachievements.org/user/*/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const PropertyPrefix = 'HideProfileAchievementsBadges.';
const Settings = {
    maxBadgesCount: GM_getValue(PropertyPrefix + 'maxBadgesCount', 45),
    showBadgesCount: GM_getValue(PropertyPrefix + 'showBadgesCount', 30),
    opacityGradientCount: GM_getValue(PropertyPrefix + 'opacityGradientCount', 15)
};

function newElement(tagName, parent, className = null, innerHTML = null) {
    const result = document.createElement(tagName);
    parent.append(result);
    if (className != null) result.className = className;
    if (innerHTML != null) result.innerHTML = innerHTML;
    return result;
}

function settingsPage() {
    console.log(1);
    const xpathRes = document.evaluate("//div[h3[text()='Settings']]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const settingsDiv = xpathRes.iterateNext();
    if (settingsDiv == null) return;
    console.log(2);
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

    const shownBadgesLine = newElement('tr', tbody);
    newElement('td', shownBadgesLine, null, 'Number of badges always displayed');
    const shownBadgesCell = newElement('td', shownBadgesLine);
    const shownBadgesInput = newElement('input', shownBadgesCell);
    shownBadgesInput.type = 'number';
    shownBadgesInput.value = Settings.showBadgesCount;
    shownBadgesInput.min = Settings.opacityGradientCount;
    shownBadgesInput.style.width = '7em';

    const opacityGradientLine = newElement('tr', tbody);
    newElement('td', opacityGradientLine, null, 'Number of badges in the transparency gradient');
    const opacityGradientCell = newElement('td', opacityGradientLine);
    const opacityGradientInput = newElement('input', opacityGradientCell);
    opacityGradientInput.type = 'number';
    opacityGradientInput.value = Settings.opacityGradientCount;
    opacityGradientInput.min = 0;
    opacityGradientInput.max = Settings.showBadgesCount;
    opacityGradientInput.style.width = '7em';
    console.log(3);

    maxBadgesInput.addEventListener('input', () => {
        if (!maxBadgesInput.reportValidity()) return;
        GM_setValue(PropertyPrefix + 'maxBadgesCount', parseInt(maxBadgesInput.value));
    });
    shownBadgesInput.addEventListener('input', () => {
        if (!shownBadgesInput.reportValidity()) return;
        opacityGradientInput.max = shownBadgesInput.value;
        GM_setValue(PropertyPrefix + 'showBadgesCount', parseInt(shownBadgesInput.value));
    });
    opacityGradientInput.addEventListener('input', () => {
        if (!opacityGradientInput.reportValidity()) return;
        shownBadgesInput.min = opacityGradientInput.value;
        GM_setValue(PropertyPrefix + 'opacityGradientCount', parseInt(opacityGradientInput.value));
    });
    console.log(4);
}

function profilePage() {
    const badgeContainers = document.querySelectorAll('div.transition-all > hr + div');
    badgeContainers.forEach(div => {
        if (div.children.length <= Settings.maxBadgesCount) return;
        for (let i = Settings.showBadgesCount; i < div.children.length; i++) {
            div.children[i].classList.add('hidden')
        }
        for (let i = 1; i <= Settings.opacityGradientCount; i++) {
            div.children[Settings.showBadgesCount - i].style.opacity = i / (Settings.opacityGradientCount + 1);
        }
        const showButton = document.createElement('button');
        showButton.className='btn'
        showButton.style['margin-top']='0.5em'
        showButton.style['margin-left']='0.8em'
        showButton.innerHTML='Show all'
        div.append(showButton)
        showButton.addEventListener('click', () => {
            showButton.remove()
            for (let i = Settings.showBadgesCount; i < div.children.length; i++) {
                div.children[i].classList.remove('hidden')
            }
            for (let i = 1; i <= Settings.opacityGradientCount; i++) {
                div.children[Settings.showBadgesCount - i].style.opacity = null;
            }
        });
    });
}

if (window.location.pathname.startsWith('/controlpanel.php')) {
    document.addEventListener("DOMContentLoaded", settingsPage);
} else {
    document.addEventListener("DOMContentLoaded", profilePage);
}
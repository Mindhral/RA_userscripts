// ==UserScript==
// @name         RA_EnhancedCheevosFilters
// @namespace    RA
// @version      0.5
// @description  Allows to hide achievements unlocked in hardcore only, or with missable tag
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @match        https://retroachievements.org/controlpanel.php*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const PropertyPrefix = 'EnhancedCheevosFilters.';
const Settings = {
    replaceHideCompletedCheckbox: GM_getValue(PropertyPrefix + 'replaceHideCompletedCheckbox', true),
    addMissableFilter: GM_getValue(PropertyPrefix + 'addMissableFilter', true)
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
    const title = newElement('h4', newDiv, null, 'Enhanced Cheevos Filters');
    const table = newElement('table', newDiv, 'table-highlight');
    const tbody = newElement('tbody', table);

    const replaceCheckboxLine = newElement('tr', tbody);
    newElement('td', replaceCheckboxLine, null, 'Replace <em>Hide unlocked achievements</em> checkbox');
    const replaceCheckboxCell = newElement('td', replaceCheckboxLine);
    const replaceCheckboxInput = newElement('input', replaceCheckboxCell);
    replaceCheckboxInput.type = 'checkbox';
    replaceCheckboxInput.checked = Settings.replaceHideCompletedCheckbox;

    const missableFilterLine = newElement('tr', tbody);
    newElement('td', missableFilterLine, null, 'Add filter on Missable tag');
    const missableFilterCell = newElement('td', missableFilterLine);
    const missableFilterInput = newElement('input', missableFilterCell);
    missableFilterInput.type = 'checkbox';
    missableFilterInput.checked = Settings.addMissableFilter;

    replaceCheckboxInput.addEventListener('input', () => {
        GM_setValue(PropertyPrefix + 'replaceHideCompletedCheckbox', replaceCheckboxInput.checked);
    });
    missableFilterInput.addEventListener('change', () => {
        GM_setValue(PropertyPrefix + 'addMissableFilter', missableFilterInput.checked);
    });
}

function gamePage() {
    const achievementsList = document.querySelector('#achievement ul');
    if (achievementsList == null) return;
    const allRows = achievementsList.querySelectorAll('li');
    if (allRows.length == 0) return;
    const filterDiv = achievementsList.previousElementSibling.firstElementChild;
    filterDiv.classList.add('grid', 'gap-y-1');

    const visibilityFunctions = [];
    const checkVisibilities = () => {
        const isVisible = row => visibilityFunctions.every(f => f(row));

        const checkVisibility = row => {
            if (isVisible(row)) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        };
        allRows.forEach(checkVisibility);
    };

    // Replaces the unlock filter checkbox by unlock filter radios
    (function() {
        if (!Settings.replaceHideCompletedCheckbox) return;
        const initialValue = 'none';
        const checkbox = filterDiv.querySelector("input[type='checkbox']");
        if (checkbox == null) return;

        let currentFilter;
        visibilityFunctions.push(row => currentFilter(row));
        const createUnlockRadioLabel = (value, filter) => {
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'hideCheevos';
            input.value = value;
            if (value === initialValue) {
                input.checked = true;
                currentFilter = filter;
            }
            input.addEventListener('change', () => {
                currentFilter = filter;
                checkVisibilities();
            });
            const label = document.createElement('label');
            label.append(input, '\n', value, '\n');
            return label;
        };

        const unlockedSpan = document.createElement('span');
        unlockedSpan.append('Hide:\n',
                            createUnlockRadioLabel('unlocked', row => !row.classList.contains('unlocked-row')),
                            createUnlockRadioLabel('hardcore', row => row.getElementsByClassName('goldimagebig').length == 0),
                            createUnlockRadioLabel('none', row => true));
        const parentDiv = checkbox.parentElement.parentElement;
        parentDiv.replaceWith(unlockedSpan);
    })();

    // Add missable filter checkbox
    (function() {
        if (!Settings.addMissableFilter) return;
        if (achievementsList.querySelector('span.missable') == null) return;

        const createCheckboxLabel = (labelTxt, checked, rowFilter) => {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = checked;
            visibilityFunctions.push(row => {
                return !input.checked || rowFilter(row);
            });
            input.addEventListener('change', checkVisibilities);
            const label = document.createElement('label');
            label.append(input, '\n', labelTxt, '\n');
            return label;
        };
        const missableSpan = document.createElement('span');
        missableSpan.append('Flag:\n', createCheckboxLabel("Missable", false, row => row.querySelector('span.missable') != null));

        filterDiv.append(missableSpan);
    })();
}

if (window.location.pathname.startsWith('/controlpanel.php')) {
    document.addEventListener("DOMContentLoaded", settingsPage);
} else {
    document.addEventListener("DOMContentLoaded", gamePage);
}
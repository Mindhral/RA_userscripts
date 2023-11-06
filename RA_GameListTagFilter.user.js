// ==UserScript==
// @name         RA_GameListTagFilter
// @namespace    RA
// @version      0.1
// @description  Allows to filter games on a type tag (subset, hack, ...)
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/gameList.php*
// @match        https://retroachievements.org/setRequestList.php*
// @match        https://retroachievements.org/claimlist.php*
// @match        https://retroachievements.org/gameSearch.php*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

function getTags(row) {
    const tagsSpans = [...row.querySelectorAll('span.tag span:first-child')];
    if (tagsSpans.length == 0) return [ '-', 'none'];
    const tags = tagsSpans.map(span => span.innerText).filter(text => text.length > 0);
    return ['-', ...tags];
}

function getAllTags(rows) {
    return [...new Set(rows.flatMap(getTags))];
}

function buildSelect(tags, selectedTag) {
    const select = document.createElement('select');
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.innerHTML = tag;
        option.selected = (tag === selectedTag);
        select.append(option);
    });
    return select;
}

const Pages = {
    gameList: {
        addSelect: select => {
            const filtersDiv = document.querySelector('article div[align="right"]');
            if (filtersDiv == null) return false;

            select.style['margin-right'] = '1em';
            filtersDiv.prepend('Tag: ', select);
            return true;
        }
    },
    setRequestList:{
        addSelect: select => {
            const parentDiv = document.querySelector('div.embedded > div.grid');
            if (parentDiv == null) return false;
            const newDiv = document.createElement('div');
            newDiv.className = parentDiv.lastElementChild.className;
            parentDiv.append(newDiv);
            const label = document.createElement('label');
            label.className = parentDiv.getElementsByTagName('label')[0].className;
            label.innerHTML = 'Tag';
            select.className = parentDiv.getElementsByTagName('select')[0].className;
            newDiv.append(label, select);
            return true;
        }
    },
    claimlist:{
        addSelect: select => {
            const embeddedElements = document.getElementsByClassName('embedded');
            if (embeddedElements.length == 0) return false;
            const previousSibling = embeddedElements.item(embeddedElements.length - 1);
            const newDiv = document.createElement('div');
            newDiv.className = 'embedded';
            const label = document.createElement('label');
            label.innerHTML = 'Tag: ';
            newDiv.append(label, select);
            previousSibling.classList.add('mb-1');
            previousSibling.after(newDiv);
            return true;
        }
    },
    gameSearch: {
        addSelect: select => {
            const consoleSelect = document.querySelector('h3 + div select');
            if (consoleSelect == null) return false;
            const div = consoleSelect.parentElement;
            const label = document.createElement('label');
            label.innerHTML = 'Tag: ';
            div.append(label, select);
            return true;
        }
    }
};


function textToInt(text) {
    if (text == null) return 0;
    return text.length > 0 ? parseInt(text.replace(',', '')) : 0;
}

function updateTotals(rows) {
    const noHighlightRows = document.querySelectorAll('table.table-highlight tr.do-not-highlight');
    if (noHighlightRows.length < 2) return;
    let totalGames = 0;
    let totalUnlock = 0;
    let totalAch = 0;
    let totalPoints = 0;
    let totalRetroPoints = 0;
    let totalLBs = 0;
    for (const row of rows) {
        if (row.classList.contains('hidden')) continue;
        totalGames++;
        const achMatch = row.children[1].innerText.match(/(?:([^/]+) \/ )?(.+)/);
        totalUnlock += textToInt(achMatch[1] ?? 0);
        totalAch += textToInt(achMatch[2]);
        const pointsMatch = row.children[2].innerText.match(/(.+) \((.+)\)/);
        if (pointsMatch != null) {
            totalPoints += textToInt(pointsMatch[1]);
            totalRetroPoints += textToInt(pointsMatch[2]);
        }
        totalLBs += textToInt(row.children[5].innerText);
    }

    const totalCells = noHighlightRows[1].children;
    totalCells[0].innerHTML = totalCells[0].innerHTML.replace(/[\d,]+/, totalGames.toLocaleString('en-US'));
    let achText = totalAch.toLocaleString('en-US');
    if (totalUnlock > 0) achText = totalUnlock.toLocaleString('en-US') + ' / ' + achText;
    totalCells[1].innerHTML = totalCells[1].innerHTML.replace(/([\d,]+ \/ )?[\d,]+/, achText);
    totalCells[2].innerHTML = totalCells[2].innerHTML.replace(/[\d,]+/, totalPoints.toLocaleString('en-US')).replace(/\([\d,]+\)/, '(' + totalRetroPoints.toLocaleString('en-US') + ')');
    totalCells[5].innerHTML = totalCells[5].innerHTML.replace(/[\d,]+/, totalLBs.toLocaleString('en-US'));
}

document.addEventListener("DOMContentLoaded", () => {

    const allRows = [...document.querySelectorAll('table.table-highlight tr:not(.do-not-highlight)')];
    if (allRows.length == 0) return;
    const allTags = getAllTags(allRows);
    if (allTags.length <= 2) return; // only '-' and another

    let currentTag = '-';
    const pageName = window.location.pathname.match(/\/([^/]*).php/)[1];
    const select = buildSelect(allTags, currentTag);
    if (!Pages[pageName].addSelect(select)) return;

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

        updateTotals(allRows);
    };

    visibilityFunctions.push(row => getTags(row).includes(currentTag));
    select.addEventListener('change', () => {
        currentTag = select.selectedOptions[0].value;
        checkVisibilities();
    });
});

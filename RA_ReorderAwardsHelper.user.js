// ==UserScript==
// @name         RA_ReorderAwardsHelper
// @namespace    RA
// @version      0.1
// @description  Allows to sort game awards automatically on Reorder Site Awards page
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/reorderSiteAwards.php*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

const MainSorts = {
    'title': {
        label: 'Title',
        extractInfo: r => { r.title = document.evaluate("td[2]/span/text()", r.element, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null).iterateNext().wholeText.trim(); },
        compare: (r1, r2) => r1.title.localeCompare(r2.title)
    },
    'date': {
        label: 'Obtention date',
        extractInfo: r => { r.date = Date.parse(r.element.getElementsByTagName('div')[0].dataset.date); },
        compare: (r1, r2) => r1.date - r2.date
    },
    'initial': {
        label: 'Initial order',
        extractInfo: r => { },
        compare: (r1, r2) => r1.index - r2.index
    }
};

const Compares = {
    reverse: c => (a, b) => c(b, a),
    compose: (c1, c2) => (a,b) => {
        const res1 = c1(a,b);
        return res1 == 0 ? c2(a,b) : res1;
    },
    comparing: f => (a, b) => f(a) - f(b)
};

const createOption = (value, labelTxt, parent) => {
    const option = document.createElement('option');
    if (value) option.value = value;
    option.innerHTML = labelTxt;
    parent.append(option);
    return option;
};

const createButton = (label, parent) => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.innerHTML = label;
    parent.append(' ', button);
    return button;
};

document.addEventListener("DOMContentLoaded", () => {
    const awardsTable = document.getElementById('game-reorder-table');
    if (awardsTable == null) return;
    const awardsRows = awardsTable.getElementsByClassName('award-table-row');
    if (awardsRows.length == 0) return;

    const rowInfos = [...awardsRows].map((row, index) => ({element: row, index: index}));
    for (const sort of Object.values(MainSorts)) {
        rowInfos.forEach(sort.extractInfo);
    }
    rowInfos.forEach(rowInfo => {
        rowInfo.gameId = rowInfo.element.getElementsByTagName('div')[0].dataset.gameid;
        rowInfo.mastered = rowInfo.element.querySelector('img.goldimage') != null;
        rowInfo.tags = [...rowInfo.element.querySelectorAll('span.tag > span:first-child')].map(e => e.textContent);
    });

    const sortRows = compare => {
        const tbody = awardsTable.getElementsByTagName('tbody')[0];
        rowInfos.sort(compare).forEach(r => tbody.append(r.element));
    }

    const sortDiv = document.createElement('div');
    sortDiv.className = awardsTable.previousElementSibling.className;
    awardsTable.before(sortDiv);

    const mainSortDiv = document.createElement('div');
    sortDiv.append(mainSortDiv);
    const mainSortLabel = document.createElement('label');
    mainSortLabel.innerHTML = 'Sort by: ';
    const mainSortSelect = document.createElement('select');
    for (const [sortName, sort] of Object.entries(MainSorts)) {
        createOption(sortName, sort.label, mainSortSelect);
    }
    mainSortDiv.append(mainSortLabel, ' ', mainSortSelect);
    const ascSortButton = createButton('Asc', mainSortDiv);
    const descSortButton = createButton('Desc', mainSortDiv);

    const getCompare = () => MainSorts[mainSortSelect.selectedOptions[0].value].compare;
    ascSortButton.addEventListener('click', () => sortRows(getCompare()));
    descSortButton.addEventListener('click', () => sortRows(Compares.reverse(getCompare())));

    const groupSortDiv = document.createElement('div');
    sortDiv.append(groupSortDiv);
    const groupSortLabel = document.createElement('label');
    groupSortLabel.innerHTML = 'Put: ';
    const groupSortSelect = document.createElement('select');
    createOption('mastered', 'Mastered', groupSortSelect);
    createOption(null, '--', groupSortSelect).disabled = true;
    createOption('notag', '&lt;untagged&gt;', groupSortSelect);
    const allTags = new Set(rowInfos.flatMap(r => r.tags));
    allTags.forEach(tag => {
        createOption(tag, tag, groupSortSelect);
    });
    createOption('multiple', 'tags...', groupSortSelect).title = 'select multiple tags';
    const multipleTagsSelect = document.createElement('select');
    multipleTagsSelect.multiple = true;
    multipleTagsSelect.className = 'hidden';
    multipleTagsSelect.style['vertical-align'] = 'top';
    multipleTagsSelect.title = 'Ctrl+click or Shift+click for multiple selection'
    createOption('notag', '&lt;untagged&gt;', multipleTagsSelect);
    allTags.forEach(tag => {
        createOption(tag, tag, multipleTagsSelect);
    });
    groupSortDiv.append(groupSortLabel, ' ', groupSortSelect, ' ', multipleTagsSelect);
    const groupFirstButton = createButton('First', groupSortDiv);
    const groupLastButton = createButton('Last', groupSortDiv);

    groupSortSelect.addEventListener('change', () => {
        if (groupSortSelect.selectedOptions[0].value === 'multiple') {
            multipleTagsSelect.classList.remove('hidden');
        } else {
            multipleTagsSelect.classList.add('hidden');
        }
    });

    const tagFilter = tag => row => row.tags.includes(tag);
    const getGroupFilter = () => {
        const selected = groupSortSelect.selectedOptions[0].value;
        if (selected === 'mastered') return row => row.mastered;
        if (selected === 'notag') return row => row.tags.length == 0;
        if (selected === 'multiple') {
            const tags = [...multipleTagsSelect.selectedOptions].map(o => o.value);
            return row => tags.some(t => (t === 'notag' && row.tags.length == 0) || row.tags.includes(t));
        }
        return row => row.tags.includes(selected);
    }
    const getGroupCompare = () => Compares.comparing(getGroupFilter());
    groupFirstButton.addEventListener('click', () => sortRows(Compares.reverse(getGroupCompare())));
    groupLastButton.addEventListener('click', () => sortRows(getGroupCompare()));
});

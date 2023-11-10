// ==UserScript==
// @name         RA_EnhancedHubSort
// @namespace    RA
// @version      0.2
// @description  Sorts entries in a hub locally, with additional sort and filtering options
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

const Sorts = {
    'original': {
        label: 'Original',
        compare: (r1, r2) => r1.index - r2.index
    },
    'title': {
        label: 'Title',
        compare: (r1, r2) => r1.title.localeCompare(r2.title)
    },
    'points': {
        label: 'Points',
        compare: (r1, r2) => r1.points - r2.points
    },
    'retropoints': {
        label: 'RetroPoints',
        compare: (r1, r2) => r1.retropoints - r2.retropoints
    },
    'random': {
        label: 'Random',
        compare: (r1, r2) => 0
    }
};

const Status = {
    'all': {
        label: 'All',
        visibilityFunction: r => true
    },
    'with-ach': {
        label: 'With achievements',
        visibilityFunction: r => r.points >= 0
    },
    'without-ach': {
        label: 'Without achievements',
        visibilityFunction: r => r.points < 0
    }
}

const sortBlockHTML = `<div class="embedded p-4 my-4 w-full"><div class="grid sm:flex sm:divide-x-2 divide-embed-highlight">
  <div class="grid gap-y-1 sm:pr-[40px]">
    <label class="font-bold text-xs">Sort</label>
    <span>
      <select id="sortSelect"></select>
      <label><input id="descSort" type="checkbox"> desc.</label>
      <label><input id="hubsLast" type="checkbox"> hubs last</label>
    </span>
  </div>
  <div class="grid gap-y-1 sm:px-8">
    <label class="font-bold text-xs">Console</label>
    <select id="consoleSelect"><option value="all">All</option></select>
  </div>
  <div class="grid gap-y-1 sm:px-8">
    <label class="font-bold text-xs">Tag</label>
    <select id="tagSelect"><option value="all">All</option></select>
  </div>
  <div class="grid gap-y-1 sm:px-8">
    <label class="font-bold text-xs">Status</label>
    <select id="statusSelect"></select>
  </div>
</div></div>`;

const Compares = {
    reverse: c => (a, b) => c(b, a),
    compose: (c1, c2) => (a,b) => {
        const res1 = c1(a,b);
        return res1 == 0 ? c2(a,b) : res1;
    }
}

function getElementByXpath(root, xpath) {
  return document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function createOption(value, labelTxt, select) {
    const option = document.createElement('option');
    option.value = value;
    option.innerHTML = labelTxt;
    select.append(option);
    return option;
}

function shuffle(array) {
    let index = array.length;
    while (index > 1) {
        let newIdx = Math.floor(Math.random() * index);
        index--;
        [array[index], array[newIdx]] = [array[newIdx], array[index]];
    }
    return array;
}

document.addEventListener("DOMContentLoaded", () => {
    const consoleName = document.querySelector('h1 div span')?.innerText?.trim();
    if (consoleName !== 'Hubs') return;

    const gamesTable = document.querySelector('#achievement .component table.table-highlight');
    if (!gamesTable) return;

    const rows = [...gamesTable.getElementsByTagName('tr')];
    if (rows.length == 0) return;

    // Fix missing column on Hubs rows
    const addMissingColumns = () => {
        const getColCount = row => row.getElementsByTagName('td').length;
        const addColumn = row => row.append(document.createElement('td'));

        const maxColCount = Math.max(...rows.map(getColCount));
        rows.filter(row => getColCount(row) < maxColCount).forEach(addColumn);
    };
    addMissingColumns(rows);

    // Get data to be used in sorting and filtering
    const getRowData = row => {
        const id = parseInt(row.getElementsByTagName('a')[0].href.split('/').at(-1));
        const title = getElementByXpath(row, 'td[1]//a/p/text()').wholeText.trim();
        const tags = [...row.querySelectorAll('span.tag span:first-child')].map(span => span.innerText).filter(text => text.length > 0);
        if (tags.length == 0) tags.push('&lt;none&gt;');
        const cons = row.querySelector('td:first-child div > span:not(.tag)')?.innerText.trim()?? 'Hubs';
        const pointsMatch = row.querySelector('td:last-child')?.innerText.match(/([\d,]+) points\s+\(([\d,]+)\)/);
        const points = pointsMatch ? parseInt(pointsMatch[1].replace(',', '')) : -1;
        const retropoints = pointsMatch ? parseInt(pointsMatch[2].replace(',', '')) : -1;
        return {id, title, console: cons, tags, points, retropoints, element: row, visible: true};
    };
    const rowsData = rows.map(getRowData);

    // Adds HTML
    const sortDiv = getElementByXpath(document, '//article//div[*[contains(text(), "Sort:")]]');
    sortDiv.outerHTML = sortBlockHTML;
    const sortSelect = document.getElementById('sortSelect');
    for (const [sortName, sort] of Object.entries(Sorts)) {
        createOption(sortName, sort.label, sortSelect);
    }
    const consoleSelect = document.getElementById('consoleSelect');
    [...new Set(rowsData.map(r => r.console))].sort().forEach(c => createOption(c, c, consoleSelect));
    const tagSelect = document.getElementById('tagSelect');
    new Set(rowsData.flatMap(r => r.tags)).forEach(tag => createOption(tag, tag, tagSelect));
    const statusSelect = document.getElementById('statusSelect');
    for (const [name, status] of Object.entries(Status)) {
        createOption(name, status.label, statusSelect);
    }

    const updateList = () => {
        // slower than using 'hidden' class, but allows to keep alternating row colors
        gamesTable.getElementsByTagName('tbody')[0]
            .replaceChildren(...rowsData.filter(r => r.visible).map(r => r.element));
    };

    // sorting logic
    const descCheckbox = document.getElementById('descSort');
    const hubsLastCheckbox = document.getElementById('hubsLast');
    const isHub = r => r.title.startsWith('[');
    const hubsCompare = (r1, r2) => isHub(r1) - isHub(r2);
    const updateSort = () => {
        // set index late in case another script changed the order
        if (rowsData[0].index == null) {
            rowsData.forEach((row, i) => {row.index = i});
        }
        const sort = Sorts[sortSelect.selectedOptions[0].value];
        // forced to do a special case as random sort using compare only (Math.random()-0.5) is not evenly distributed
        if (sort == Sorts.random) shuffle(rowsData);
        let compare = sort.compare;
        if (descCheckbox.checked) compare = Compares.reverse(compare);
        if (hubsLastCheckbox.checked) compare = Compares.compose(hubsCompare, compare);

        rowsData.sort(compare);
        updateList();
    };
    sortSelect.addEventListener('change', updateSort);
    descCheckbox.addEventListener('change', updateSort);
    hubsLastCheckbox.addEventListener('change', updateSort);

    // filtering logic
    const visibilityFunctions = [];
    const checkVisibilities = () => {
        rowsData.forEach(row => { row.visible = visibilityFunctions.every(f => f(row)) });
        updateList();
    };
    let selectedConsole = 'all';
    visibilityFunctions.push(row => selectedConsole === 'all' || row.console === selectedConsole);
    consoleSelect.addEventListener('change', () => {
        selectedConsole = consoleSelect.selectedOptions[0].value;
        checkVisibilities();
    });
    let selectedTag = 'all';
    visibilityFunctions.push(row => selectedTag === 'all' || row.tags.includes(selectedTag));
    tagSelect.addEventListener('change', () => {
        selectedTag = tagSelect.selectedOptions[0].value;
        checkVisibilities();
    });
    let selectedStatus = Status.all;
    visibilityFunctions.push(row => selectedStatus.visibilityFunction(row));
    statusSelect.addEventListener('change', () => {
        selectedStatus = Status[statusSelect.selectedOptions[0].value];
        checkVisibilities();
    });
});

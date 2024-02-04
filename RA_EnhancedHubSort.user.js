// ==UserScript==
// @name         RA_EnhancedHubSort
// @namespace    RA
// @version      0.3
// @description  Sorts entries in a hub locally, with additional sort and filtering options
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @match        https://retroachievements.org/system/*/games*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

const pageName = window.location.pathname.split('/')[1];

const Sorts = {
    'original': {
        label: 'Original',
        compare: (r1, r2) => r1.index - r2.index
    },
    'title': {
        label: 'Title',
        compare: (r1, r2) => r1.title.localeCompare(r2.title)
    },
    'achievements': {
        label: 'Most achievements',
        compare: (r1, r2) => r2.achievements - r1.achievements
    },
    'points': {
        label: 'Most points',
        compare: (r1, r2) => r2.points - r1.points
    },
    'retroratio': {
        label: 'Highest RetroRatio',
        compare: (r1, r2) => r2.retroratio - r1.retroratio
    },
    'leaderboards': {
        label: 'Most leaderboards',
        compare: (r1, r2) => r2.leaderboards - r1.leaderboards
    },
    'players': {
        label: 'Most players',
        compare: (r1, r2) => r2.players - r1.players
    },
    'hcProgress': {
        label: 'Most hardcore progress',
        compare: (r1, r2) => r2.hcProgress - r1.hcProgress
    },
    'scProgress': {
        label: 'Most progress',
        compare: (r1, r2) => r2.scProgress - r1.scProgress
    },
    'random': {
        label: 'Random',
        compare: (r1, r2) => 0
    }
};

const Status1 = {
    'all': {
        label: '--',
        title: 'No restriction',
        visibilityFunction: r => true
    },
    'with-ach': {
        label: 'With achievements',
        title: 'With official achievements',
        visibilityFunction: r => r.points >= 0
    },
    'with-progress': {
        label: 'With progress',
        title: 'With any progress in softcore or in hardcore',
        visibilityFunction: r => r.scProgress > 0
    },
    'with-sc-progress': {
        label: 'With progress (sc)',
        title: 'With any softcore progress',
        visibilityFunction: r => r.scProgress > r.hcProgress
    },
    'with-hc-progress': {
        label: 'With progress (hc)',
        title: 'With any hardcore progress',
        visibilityFunction: r => r.hcProgress > 0
    },
    'beaten': {
        label: 'Beaten',
        title: 'With any award in softcore or in hardcore',
        visibilityFunction: r => r.status && r.status != 'unfinished'
    },
    'completed': {
        label: 'Completed',
        title: 'Completed (softcore) or mastered (hardcore)',
        visibilityFunction: r => [ 'completed', 'mastered' ].includes(r.status)
    },
    'mastered': {
        label: 'Mastered',
        title: 'Mastered (hardcore)',
        visibilityFunction: r => r.status == 'mastered'
    }
}
const Status2 = {
    'without-ach': {
        label: 'Without achievements',
        title: 'Without official achievements',
        visibilityFunction: r => r.points < 0
    },
    'without-progress': {
        label: 'Without progress',
        title: 'Without progress, whether in softcore or hardcore',
        visibilityFunction: r => r.scProgress == 0
    },
    'empty': {},
    'without-hc-progress': {
        label: 'Without progress (hc)',
        title: 'Without any progress in hardcore',
        visibilityFunction: r => r.hcProgress == 0
    },
    'not-beaten': {
        label: 'Not beaten',
        title: 'Without any award, whether in softcore or hardcore',
        visibilityFunction: r => !r.status || r.status == 'unfinished'
    },
    'not-completed': {
        label: 'Not completed',
        title: 'Neither completed (softcore) nor mastered (mastered)',
        visibilityFunction: r => ![ 'completed', 'mastered' ].includes(r.status)
    },
    'not-mastered': {
        label: 'Not mastered',
        title: 'Not mastered (hardcore)',
        visibilityFunction: r => r.status != 'mastered'
    },
    'missing-cheevos': {
        label: 'Missing achievements',
        title: 'Any official achievement missing in softcore or hardcore',
        visibilityFunction: r => r.scProgress < 1
    },
    'missing-cheevos-hc': {
        label: 'Missing achievements (hc)',
        title: 'Any official achievement missing in hardcore',
        visibilityFunction: r => r.hcProgress < 1
    },
    'all': {
        label: '--',
        title: 'No restriction',
        visibilityFunction: r => true
    }
}

const sortBlockHTML = `<div class="embedded p-4 my-4 w-full"><div class="grid sm:flex sm:divide-x-2 divide-embed-highlight">
  <div class="grid gap-y-1 sm:pr-[40px]">
    <label class="font-bold text-xs">Sort</label>
    <span class="text-2xs">
      <select id="sortSelect"></select>
      <label><input id="descSort" type="checkbox"> Reverse</label>
    </span>
  </div>
  <div class="grid gap-y-1 sm:px-4">
    <div class="flex">
      <label class="font-bold text-xs">Console</label>
      <label id="groupConsolesLabel" title="Group tables by console (reloads the page)" class="text-2xs" style="margin-left: 2em;"> Group 🔄</label>
    </div>
    <select id="consoleSelect"><option value="all">All</option></select>
  </div>
  <div class="grid gap-y-1 sm:px-4">
    <label class="font-bold text-xs">Tag</label>
    <select id="tagSelect"><option value="all">All</option></select>
  </div>
  <div class="grid gap-y-1 sm:px-4">
    <label class="font-bold text-xs">Status</label>
      <div class="flex">
      <select id="statusSelect1"></select>
	  <select id="statusSelect2"></select>
</div>
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

function createOption(value, labelTxt, select, title = null) {
    const option = document.createElement('option');
    option.value = value;
    if (labelTxt) {
        option.innerHTML = labelTxt;
    } else {
        option.className = 'hidden';
    }
    if (title) option.title = title;
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

function setHasCheevosParam(value) {
    const params = new URLSearchParams(window.location.search);
    if (pageName == 'game') value = (value == 'yes') ? 'true' : 'false';
    params.set('filter[populated]', value);
    window.location.search = params;
}

function customize() {
    const origSortDiv = document.querySelector('article div.embedded');
    if (!origSortDiv) return;

    // Get data to be used in sorting and filtering
    const getRowData = row => {
        const cells = row.getElementsByTagName('td');
        const firstCell = cells.item(0);
        const id = parseInt(firstCell.getElementsByTagName('a')[0].href.split('/').at(-1));
        const title = getElementByXpath(firstCell, './/a/p/text()').wholeText.trim();
        const tags = [...firstCell.querySelectorAll('span.tag span:first-child')].map(span => span.innerText).filter(text => text.length > 0);
        if (tags.length == 0) tags.push('&lt;none&gt;');
        const cons = firstCell.querySelector('div > span:not(.tag)')?.innerText.trim()?? '';

        const getCellAsNb = (idx, parseFunc) => {
            const val = parseFunc(cells.item(idx).innerText.replace(',', ''));
            return isNaN(val) ? -1 : val;
        };

        const achievements = getCellAsNb(1, parseInt);
        const points = getCellAsNb(2, parseInt);
        const retroratio = getCellAsNb(3, parseFloat);
        const leaderboards = getCellAsNb(4, parseInt);
        const players = getCellAsNb(5, parseInt);
        const progressTitle = row.querySelector('div[role="progressbar"]')?.title
        const hcProgress = parseInt(progressTitle?.match(/(\d+)\/\d+ \(hardcore\)/)?.[1]) / achievements || 0
        const scProgress = parseInt(progressTitle?.match(/(\d+)\/\d+ \(softcore\)/)?.[1]) / achievements || hcProgress
        const status = row.querySelector('div[data-award]')?.dataset.award;
        return {id, title, console: cons, tags, achievements, points, retroratio, leaderboards, players, hcProgress, scProgress, status, element: row, visible: true};
    };

    const gameTables = [...document.querySelectorAll('article table.table-highlight')].map(table => {
        // eliminate both title rows and hub rows (single column)
        const rows = [...table.getElementsByTagName('tr')].filter(r => r.getElementsByTagName('td').length > 1);
        const rowsData = [...rows].map(getRowData);
        const tbody = table.getElementsByTagName('tbody')[0];
        return {rowsData, tbody};
    }).filter(t => t.rowsData.length > 0);
    if (gameTables.length == 0) return;

    // Adds HTML
    const newDiv = document.createElement('div');
    // removal of origSortDiv must be delayed to allow for XPath search
    origSortDiv.after(newDiv);
    newDiv.outerHTML = sortBlockHTML;
    const sortDiv = origSortDiv.nextElementSibling;
    const sortSelect = document.getElementById('sortSelect');
    for (const [sortName, sort] of Object.entries(Sorts)) {
        createOption(sortName, sort.label, sortSelect);
    }
    const groupConsolesCheckbox = getElementByXpath(origSortDiv, './/label[normalize-space()="Group by console"]/input');
    const groupConsolesLabel = document.getElementById('groupConsolesLabel');
    if (groupConsolesCheckbox) {
        groupConsolesLabel.insertAdjacentElement('afterbegin', groupConsolesCheckbox);
    } else {
        groupConsolesLabel.remove();
    }
    const consoleSelect = document.getElementById('consoleSelect');
    if (gameTables.length == 1) {
        const rowsData = gameTables[0].rowsData;
        const consoles = new Set(rowsData.map(r => r.console).filter(c => c.length > 0));
        if (consoles.size == 0) {
            // system page
            consoleSelect.parentElement.className = 'hidden';
        } else {
            // hub page
            [...consoles].sort().forEach(c => createOption(c, c, consoleSelect));
        }
    } else {
        consoleSelect.disabled = true;
        consoleSelect.style.opacity = 0.5;
    }
    const tagSelect = document.getElementById('tagSelect');
    [...new Set(gameTables.flatMap(t => t.rowsData.flatMap(r => r.tags)))].sort().forEach(tag => createOption(tag, tag, tagSelect));
    const statusSelect1 = document.getElementById('statusSelect1');
    for (const [name, status] of Object.entries(Status1)) {
        createOption(name, status.label, statusSelect1, status.title);
    }
    const statusSelect2 = document.getElementById('statusSelect2');
    for (const [name, status] of Object.entries(Status2)) {
        createOption(name, status.label, statusSelect2, status.title);
    }
    origSortDiv.remove();
    // games counter
    const countVisible = () => (gameTables.flatMap(t => t.rowsData).filter(r => r.visible).length).toLocaleString('en-US');
    const gameCounterSpan = (() => {
        const nextElmt = sortDiv.nextElementSibling;
        if (nextElmt.localName == 'p' && nextElmt.innerText.match(/Viewing \d(.*\d)? games/)) {
            return nextElmt.getElementsByTagName('span')[0];
        } else {
            const newPara = document.createElement('p');
            newPara.className = 'mb-4 text-xs';
            const span = document.createElement('span');
            span.className = 'font-bold';
            span.innerText = countVisible();
            newPara.append('Viewing ', span, ' games');
            sortDiv.after(newPara);
            return span;
        }
    })();
    const gameTotalText = gameCounterSpan.nextSibling;
    const totalCount = (() => {
        const match = gameTotalText.data.match(/of\s+([\d,]+)\s+games/);
        return match ? match[1] : gameCounterSpan.innerText;
    })();

    const updateList = gameTable => {
        // slower than using 'hidden' class, but allows to keep alternating row colors
        let hasVisible = false;
        gameTable.rowsData.forEach(row => {
            if (row.visible) {
                hasVisible = true;
                gameTable.tbody.append(row.element);
            } else {
                row.element.remove();
            }
        });
        const classFunc = hasVisible ? 'remove' : 'add';
        const table = gameTable.tbody.parentElement;
        table.classList[classFunc]('hidden');
        // h2 title before table's parent div
        table.parentElement.previousElementSibling.classList[classFunc]('hidden');
        //updates counter
        const visibleCount = countVisible();
        gameCounterSpan.innerText = visibleCount;
        gameTotalText.data = (visibleCount == totalCount) ? ' games' : ' of ' + totalCount + ' games';
    };

    // sorting logic
    const descCheckbox = document.getElementById('descSort');
    const updateSort = () => {
        const sort = Sorts[sortSelect.selectedOptions[0].value];
        let compare = sort.compare;
        if (descCheckbox.checked) compare = Compares.reverse(compare);
        gameTables.forEach(gameTable => {
            const rowsData = gameTable.rowsData;
            // set index late in case another script changed the order
            if (rowsData[0].index == null) {
                rowsData.forEach((row, i) => {row.index = i});
            }
            // forced to do a special case as random sort using compare only (Math.random()-0.5) is not evenly distributed
            if (sort == Sorts.random) shuffle(rowsData);

            rowsData.sort(compare);
            updateList(gameTable);
        });
    };
    sortSelect.addEventListener('change', updateSort);
    descCheckbox.addEventListener('change', updateSort);

    // filtering logic
    const visibilityFunctions = [];
    const optionChecks = []; // array of {option, func(row)}
    const checkVisibilities = () => {
        gameTables.forEach(gameTable => {
            gameTable.rowsData.forEach(row => { row.visible = visibilityFunctions.every(f => f(row)) });
            updateList(gameTable);
        });
        const visibleRows = gameTables.flatMap(t => t.rowsData.filter(r => r.visible));
        optionChecks.forEach(obj => { obj.option.disabled = !visibleRows.some(obj.func); });
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
    let selectedStatus1 = Status1.all;
    visibilityFunctions.push(row => selectedStatus1.visibilityFunction(row));
    statusSelect1.addEventListener('change', () => {
        selectedStatus1 = Status1[statusSelect1.selectedOptions[0].value];
        checkVisibilities();
        [...statusSelect2.options].forEach((opt, idx) => { opt.disabled = (idx < statusSelect1.selectedIndex); });
    });
    let selectedStatus2 = Status2.all;
    [...statusSelect2.options].find(o => o.value == 'all').selected = true;
    visibilityFunctions.push(row => selectedStatus2.visibilityFunction(row));
    statusSelect2.addEventListener('change', () => {
        selectedStatus2 = Status2[statusSelect2.selectedOptions[0].value];
        checkVisibilities();
        [...statusSelect1.options].forEach((opt, idx) => { opt.disabled = (idx > statusSelect2.selectedIndex); });
    });

    const hasCheevosParam = (() => {
        const hasCheevosRadio = origSortDiv.querySelector('input[name="radio-populated"][checked]');
        if (hasCheevosRadio) {
            return hasCheevosRadio.value;
        }
        return origSortDiv.querySelector('input[type="checkbox"]')?.checked ? 'yes' : 'all';
    })();
    let reloadingStatusSelect;
    if (hasCheevosParam == 'yes') {
        statusSelect1.selectedIndex = 1;
        reloadingStatusSelect = statusSelect1;
    } else if (hasCheevosParam == 'no') {
        statusSelect2.selectedIndex = 0;
        reloadingStatusSelect = statusSelect2;
    }
    if (reloadingStatusSelect) {
        reloadingStatusSelect.dispatchEvent(new Event('change'));
        const allOption = reloadingStatusSelect.querySelector('option[value="all"]');
        allOption.innerText += ' 🔄'
        allOption.title += ' (reloads the page)';
        reloadingStatusSelect.addEventListener('change', () => {
            if (reloadingStatusSelect.selectedOptions[0].value == 'all') {
                setHasCheevosParam('all');
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (pageName == 'game') {
        const consoleName = document.querySelector('h1 div span')?.innerText?.trim();
        if (consoleName && consoleName !== 'Hubs') return;
    }
    customize();
});


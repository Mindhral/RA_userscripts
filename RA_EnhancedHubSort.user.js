// ==UserScript==
// @name         RA_EnhancedHubSort
// @namespace    RA
// @version      0.6.5
// @description  Sorts entries in a hub locally, with additional sort and filtering options
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @match        https://retroachievements.org/system/*/games*
// @match        https://retroachievements.org/user/*/developer/sets*
// @match        https://retroachievements.org/settings*
// @exclude      https://retroachievements.org/game/*/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

const pageName = window.location.pathname.split('/')[1];
const consoleGroups = GM_getValue('consoleGroups', []);

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

const sortBlockHTML = `<div class="my-4">
<div class="embedded p-4 w-full"><div class="grid sm:flex sm:divide-x-2 divide-embed-highlight">
  <div class="grid gap-y-1 sm:pr-[40px]">
    <label class="font-bold text-xs">Sort by</label>
    <div class="flex flex-wrap items-center gap-x-1">
      <select id="sortSelect"></select>
      <label class="text-2xs"><input id="descSort" type="checkbox"> Reverse</label>
    </div>
  </div>
  <div class="grid gap-y-1 sm:px-4">
    <div class="flex">
      <label class="font-bold text-xs">Console</label>
      <label id="groupConsolesLabel" title="Group tables by console (reloads the page)" class="text-2xs" style="margin-left: 2em;"> Group 🔄</label>
    </div>
    <div>
      <select id="consoleSelect" style="max-width: 15em;"><option value="all">All</option></select>
    </div>
  </div>
  <div class="grid gap-y-1 sm:px-4">
    <label class="font-bold text-xs">Tag</label>
    <div>
      <select id="tagSelect"><option value="all">All</option></select>
      <select id="tagsMSelect" multiple class="hidden" style="vertical-align: top;" title="Ctrl+click or Shift+click for multiple selection"></select>
    </div>
  </div>
  <div class="grid gap-y-1 sm:px-4">
    <label class="font-bold text-xs">Status</label>
    <div class="flex flex-wrap items-center gap-x-1">
      <select id="statusSelect1"></select>
	  <select id="statusSelect2"></select>
      <label title="Games in your Want to Play list"><input id="inBacklogCheckbox" type="checkbox" /> In backlog</label>
    </div>
  </div>
</div></div>
<p><b>Save filters for:</b> <a id="savePageFilters" style="cursor:pointer;">this page</a> | <a id="saveDefaultFilters" style="cursor:pointer;">default</a> | <a id="resetHubFilters" title="delete saved filters for this page and reset to default ones" style="cursor:pointer;">reset to default</a></p>
</div>`;

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
    if (value) {
        option.value = value;
        option.setAttribute('name', value);
    }
    if (labelTxt) {
        option.innerHTML = labelTxt;
    } else {
        option.className = 'hidden';
    }
    if (title) option.title = title;
    select.append(option);
    return option;
}

function setVisible(element, visible) {
    const method = visible ? 'remove' : 'add';
    element.classList[method]('hidden');
}

function ackIconClick(event) {
    const icon = event.target;
    icon.style.cursor = 'wait';
    setTimeout(() => { icon.style.cursor = 'pointer'; }, 300);
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

function getConsolesById() {
    const consoles = {};
    const dropdown = document.querySelector('div.dropdown > button[title="Games"] ~ div.dropdown-menu');
    dropdown.querySelectorAll('a.dropdown-item[href*="/system/"]').forEach(item => {
        const id = parseInt(item.href.split('/').at(-2));
        consoles[id] = item.innerText.trim();
    });
    return consoles;
}

function setHasCheevosParam(value) {
    const params = new URLSearchParams(window.location.search);
    if (pageName == 'game') value = (value == 'yes') ? 'true' : 'false';
    params.set('filter[populated]', value);
    window.location.search = params;
}

const defaultFilters = {
    "sort": "original",
    "reverse": false,
    "tags": [],
    "status1": "all",
    "status2": "all",
    "inBacklog": false
};
function loadFilters() {
    if (localStorage.hubFilters) {
        const filters = JSON.parse(localStorage.hubFilters);
        localStorage.removeItem('hubFilters');
        return filters;
    }
    const filtersArrayName = (pageName == 'system') ? 'consoleFilters' : (pageName == 'user') ? 'devFilters' : 'hubFilters';
    const filtersArray = GM_getValue(filtersArrayName, {});
    const filterId = window.location.pathname.split('/')[2];
    return filtersArray[filterId] ?? filtersArray[''];
}
function saveFilters(filters, isDefault) {
    const filtersArrayName = (pageName == 'system') ? 'consoleFilters' : (pageName == 'user') ? 'devFilters' : 'hubFilters';
    const filtersArray = GM_getValue(filtersArrayName, {});
    const filterId = isDefault ? '' : window.location.pathname.split('/')[2];
    filtersArray[filterId] = filters;
    GM_setValue(filtersArrayName, filtersArray);
}
function resetPageFilters() {
    const filtersArrayName = (pageName == 'system') ? 'consoleFilters' : (pageName == 'user') ? 'devFilters' : 'hubFilters';
    const filtersArray = GM_getValue(filtersArrayName, {});
    const filterId = window.location.pathname.split('/')[2];
    if (filtersArray[filterId]) {
        delete filtersArray[filterId];
        GM_setValue(filtersArrayName, filtersArray);
    }
    return filtersArray[''] ?? defaultFilters;
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
            const val = parseFunc(cells.item(idx).innerText.replace(/\d+ of /, '').replaceAll(',', ''));
            return isNaN(val) ? -1 : val;
        };

        const achievements = getCellAsNb(1, parseInt);
        const points = getCellAsNb(2, parseInt);
        const retroratio = getCellAsNb(3, parseFloat);
        const leaderboards = getCellAsNb(4, parseInt);
        const players = getCellAsNb(5, parseInt);
        const progressTitle = row.querySelector('div[role="progressbar"]')?.ariaLabel;
        const hcProgress = parseInt(progressTitle?.match(/(\d+)\/\d+ \(hardcore\)/)?.[1]) / achievements || 0;
        const scProgress = parseInt(progressTitle?.match(/(\d+)\/\d+ \(softcore\)/)?.[1]) / achievements || hcProgress;
        const status = row.querySelector('div[data-award]')?.dataset.award;
        return {id, title, console: cons, tags, achievements, points, retroratio, leaderboards, players, hcProgress, scProgress, status, element: row, visible: true};
    };

    const gameTables = [...document.querySelectorAll('article table.table-highlight')].map(table => {
        // eliminate title rows (th), hub rows (single column) and footer rows (no link)
        const rows = [...table.getElementsByTagName('tr')].filter(r => r.getElementsByTagName('td').length > 1 && r.querySelector('a'));
        const rowsData = [...rows].map(getRowData);
        const tbody = table.getElementsByTagName('tbody')[0];
        return {rowsData, tbody};
    }).filter(t => t.rowsData.length > 0);
    if (gameTables.length == 0) return;

    const consolesById = getConsolesById();

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
    const consoleSelect = document.getElementById('consoleSelect');
    if (pageName == 'user') {
        const filtersDiv = getElementByXpath(origSortDiv, './/div[label[normalize-space()="Filters"]]');
        consoleSelect.parentElement.parentElement.replaceWith(filtersDiv);
    } else {
        const groupConsolesCheckbox = getElementByXpath(origSortDiv, './/label[normalize-space()="Group by console"]/input');
        const groupConsolesLabel = document.getElementById('groupConsolesLabel');
        if (groupConsolesCheckbox) {
            groupConsolesLabel.insertAdjacentElement('afterbegin', groupConsolesCheckbox);
        } else {
            groupConsolesLabel.remove();
        }
        if (gameTables.length == 1) {
            const rowsData = gameTables[0].rowsData;
            const consoles = new Set(rowsData.map(r => r.console).filter(c => c.length > 0));
            if (consoles.size == 0) {
                // system page
                consoleSelect.parentElement.parentElement.remove();
            } else {
                // hub page
                consoleGroups.forEach(g => {
                    const option = createOption('gr-' + g.id, g.label, consoleSelect);
                    option.title = g.consoles.map(i => consolesById[i]).join('\n');
                });
                createOption(null, '--', consoleSelect).disabled = true;
                [...consoles].sort().forEach(c => createOption(c, c, consoleSelect));
            }
        } else {
            consoleSelect.disabled = true;
            consoleSelect.style.opacity = 0.5;
        }
    }
    const tagSelect = document.getElementById('tagSelect');
    const tagsMSelect = document.getElementById('tagsMSelect');
    [...new Set(gameTables.flatMap(t => t.rowsData.flatMap(r => r.tags)))].sort().forEach(tag => {
        createOption(tag, tag, tagSelect);
        createOption(tag, tag, tagsMSelect);
    });
    createOption('multiple', 'Multiple...', tagSelect, 'Multiple selection');
    const statusSelect1 = document.getElementById('statusSelect1');
    for (const [name, status] of Object.entries(Status1)) {
        createOption(name, status.label, statusSelect1, status.title);
    }
    const statusSelect2 = document.getElementById('statusSelect2');
    for (const [name, status] of Object.entries(Status2)) {
        createOption(name, status.label, statusSelect2, status.title);
    }

    const soleDevLabel = getElementByXpath(origSortDiv, './/label[normalize-space()="Sole developer"]');
    if (soleDevLabel) {
        const soleDevDiv = document.createElement('div');
        const sortDivChild = sortDiv.firstElementChild;
        soleDevDiv.className = sortDivChild.lastElementChild.className;
        soleDevDiv.classList.add('text-2xs');
        soleDevLabel.append(' 🔄');
        soleDevLabel.title = 'Reloads the page';
        soleDevDiv.append(soleDevLabel);
        sortDivChild.append(soleDevDiv);
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
        // go backwards and add first so that the footer row remains last if it exists
        for (let i = gameTable.rowsData.length - 1; i >= 0; i--) {
            const row = gameTable.rowsData[i];
            if (row.visible) {
                hasVisible = true;
                gameTable.tbody.prepend(row.element);
            } else {
                row.element.remove();
            }
        };
        const table = gameTable.tbody.parentElement;
        setVisible(table, hasVisible);
        // h2 title before table's parent div
        setVisible(table.parentElement.previousElementSibling, hasVisible);
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
            gameTable.rowsData.forEach(row => { row.visible = visibilityFunctions.every(f => f(row));});
            updateList(gameTable);
        });
        const visibleRows = gameTables.flatMap(t => t.rowsData.filter(r => r.visible));
        optionChecks.forEach(obj => { obj.option.disabled = !visibleRows.some(obj.func); });
    };
    let selectedConsole = 'all';
    let selectedConsoles;
    visibilityFunctions.push(row => selectedConsole == 'all' || selectedConsoles.has(row.console));
    consoleSelect.addEventListener('change', () => {
        selectedConsole = consoleSelect.selectedOptions[0].value;
        if (selectedConsole == 'all') {
            selectedConsoles = new Set();
        } else if (selectedConsole.startsWith('gr-')) {
            const groupId = parseInt(selectedConsole.substr(3));
            selectedConsoles = new Set(consoleGroups.find(g => g.id == groupId)?.consoles.map(i => consolesById[i]));
        } else {
            selectedConsoles = new Set([selectedConsole]);
        }
        checkVisibilities();
    });
    let selectedTags = [];
    visibilityFunctions.push(row => selectedTags.length == 0 || selectedTags.some(tag => row.tags.includes(tag)));
    tagSelect.addEventListener('change', () => {
        const selectedValue = tagSelect.selectedOptions[0].value;
        if (selectedValue == 'multiple') {
            tagsMSelect.classList.remove('hidden');
        } else {
            tagsMSelect.classList.add('hidden');
            if (selectedValue == 'all') {
                selectedTags = [];
                [...tagsMSelect.options].forEach(o => { o.selected = true; });
            } else {
                selectedTags = [selectedValue];
                tagsMSelect.selectedIndex = tagSelect.selectedIndex - 1;
            }
            checkVisibilities();
        }
    });
    tagsMSelect.addEventListener('change', () => {
        selectedTags = [...tagsMSelect.selectedOptions].map(t => t.value);
        checkVisibilities();
    });
    let selectedStatus1 = Status1.all;
    visibilityFunctions.push(row => selectedStatus1.visibilityFunction(row));
    statusSelect1.addEventListener('change', () => {
        selectedStatus1 = Status1[statusSelect1.selectedOptions[0].value];
        checkVisibilities();
        [...statusSelect2.options].forEach((opt, idx) => { opt.disabled = (opt.dataset.disabled || idx < statusSelect1.selectedIndex); });
    });
    let selectedStatus2 = Status2.all;
    [...statusSelect2.options].find(o => o.value == 'all').selected = true;
    visibilityFunctions.push(row => selectedStatus2.visibilityFunction(row));
    statusSelect2.addEventListener('change', () => {
        selectedStatus2 = Status2[statusSelect2.selectedOptions[0].value];
        checkVisibilities();
        [...statusSelect1.options].forEach((opt, idx) => { opt.disabled = (opt.dataset.disabled || idx > statusSelect2.selectedIndex); });
    });
    const inBacklogCheckbox = document.getElementById('inBacklogCheckbox');
    // we don't load that information in advance as it can change while the page is on screen
    visibilityFunctions.push(row => !inBacklogCheckbox.checked || row.element.querySelector('button[title^="Remove from Want"]'));
    inBacklogCheckbox.addEventListener('change', checkVisibilities);

    const createFiltersObj = () => {
        const res = {
            sort: sortSelect.selectedOptions[0].value,
            reverse: descCheckbox.checked,
            tags: selectedTags,
            status1: statusSelect1.selectedOptions[0].value,
            status2: statusSelect2.selectedOptions[0].value,
            inBacklog: inBacklogCheckbox.checked
        };
        if (consoleSelect.closest('body')) res.console = selectedConsole;
        return res;
    };

    // restrictions
    if (pageName == 'user') {
        // developper sets
        setVisible(statusSelect1.options[1], false);
        statusSelect1.options[1].dataset.disabled = true;
        setVisible(statusSelect2.options[0], false);
        statusSelect2.options[0].dataset.disabled = true;
    } else {
        const hasCheevosParam = (() => {
            const hasCheevosRadio = origSortDiv.querySelector('input[name="radio-populated"][checked]');
            if (hasCheevosRadio) return hasCheevosRadio.value;
            return origSortDiv.querySelector('input[type="checkbox"]')?.checked ? 'yes' : 'all';
        })();
        let reloadingStatusSelect;
        if (hasCheevosParam == 'yes') {
            reloadingStatusSelect = statusSelect1;
            if (statusSelect1.selectedOptions[0].value == 'all') statusSelect1.selectedIndex++;
        } else if (hasCheevosParam == 'no') {
            reloadingStatusSelect = statusSelect2;
            statusSelect1.namedItem('all').selected = true;
            statusSelect2.namedItem('without-ach').selected = true;
            [...statusSelect1.options].forEach(opt => {
                if (opt.value != 'all') {
                    opt.disabled = true;
                    opt.dataset.disabled = true;
                }
            });
            [...statusSelect2.options].forEach(opt => {
                if (opt.value != 'all' && opt.value != 'without-ach') {
                    opt.disabled = true;
                    opt.dataset.disabled = true;
                }
            });
        }
        if (reloadingStatusSelect) {
            const allOption = reloadingStatusSelect.namedItem('all');
            allOption.innerText += ' 🔄';
            allOption.title += ' (reloads the page)';
            reloadingStatusSelect.dispatchEvent(new Event('change'));
            reloadingStatusSelect.addEventListener('change', () => {
                if (reloadingStatusSelect.selectedOptions[0].value == 'all') {
                    localStorage.hubFilters = JSON.stringify(createFiltersObj());
                    setHasCheevosParam('all');
                }
            });
        }
    }

    // loads filters
    const select = (selectElmt, value) => {
        const isAvailable = opt => !opt.dataset.disabled && !opt.innerText.endsWith('🔄');
        const item = selectElmt.namedItem(value);
        if (item && isAvailable(item)) {
            item.selected = true;
        } else if (value != 'all') {
            select(selectElmt, 'all');
        } else {
            [...selectElmt.options].find(isAvailable).selected = true;
        }
        selectElmt.dispatchEvent(new Event('change'));
    }
    const updateFilters = filters => {
        select(sortSelect, filters.sort);
        descCheckbox.checked = filters.reverse;
        if (filters.console && !consoleSelect.disabled) {
            selectedConsole = filters.console;
            select(consoleSelect, filters.console);
        }
        filters.tags ??= [filters.tag]; // compatibility with previous version
        if (filters.tags.length == 0) {
            select(tagSelect, 'all');
        } else if (filters.tags.length == 1) {
            select(tagSelect, filters.tags[0]);
        } else {
            select(tagSelect, 'multiple');
            [...tagsMSelect.options].forEach(opt => { opt.selected = filters.tags.includes(opt.value); } );
            tagsMSelect.dispatchEvent(new Event('change'));
        }
        inBacklogCheckbox.checked = filters.inBacklog;
        select(statusSelect1, filters.status1);
        select(statusSelect2, filters.status2);
        updateSort();
    };
    const savedFilters = loadFilters();
    if (savedFilters) updateFilters(savedFilters);

    // handling save
    const savePageLink = document.getElementById('savePageFilters');
    savePageLink.addEventListener('click', () => saveFilters(createFiltersObj(), false));
    const saveDefaultLink = document.getElementById('saveDefaultFilters');
    saveDefaultLink.innerText = ((pageName == 'system') ? 'consoles' : (pageName == 'user') ? 'developers' : 'hubs') + ' ' + saveDefaultLink.innerText;
    saveDefaultLink.addEventListener('click', () => saveFilters(createFiltersObj(), true));
    const resetFiltersLink = document.getElementById('resetHubFilters');
    resetFiltersLink.addEventListener('click', () => updateFilters(resetPageFilters()));
    [savePageLink, saveDefaultLink, resetFiltersLink].forEach(link => link.addEventListener('click', ackIconClick));
}

const settingsHtml = `<div class="text-card-foreground rounded-lg border border-embed-highlight bg-embed shadow-sm w-full">
  <div class="flex flex-col space-y-1.5 p-6 pb-4">
    <h4 class="mb-0 border-b-0 text-2xl font-semibold leading-none tracking-tight">Enhanced Hub Sort</h4>
  </div>
  <form><div class="p-6 pt-0"><table><tbody class="[&>tr>td]:!px-0 [&>tr>td]:py-2 [&>tr>th]:!px-0 [&>tr]:!bg-embed">
    <tr>
      <th scope="row">Reset saved filters</th>
      <td>
        <button id="resetHubFilters" class="btn">Hubs</button> <button id="resetConsoleFilters" class="btn">Consoles</button> <button id="resetDevFilters" class="btn">Developers</button>
      </td>
    </tr>
    <tr>
      <th scope="row">Console groups</th>
      <td>
        <div>
          <select id="hubConsoleGroups" style="min-width: 10em;"></select>
          <span id="hubConsoleGroupNew" style="cursor: pointer; margin: 0.2em 0 0 0.5em" title="new console group">
            <img style="width: 1.1em;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAZCAYAAAA8CX6UAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAAB7SURBVEhL7ZTRCoAgDEW1r4j6/0+rPsPuNqmR4Zy99OCBixPkOBUMIDkyI69EJAGZVYiRljIrskt5M+WxibzhhhSduUSKA1mkFNwidQ3U2SXr6ohk6pgsc132c516AK6aRTWaRTVok95XKxgimyGyGSKb/4n4P5LyCyGcQrkwJuTlwmgAAAAASUVORK5CYII" />
          </span>
          <div id="hubConsoleGroupSave" class="icon clickable" style="margin-left: 2em;" title="save current group">💾</div>
          <div id="hubConsoleGroupDelete" class="icon clickable hidden" title="delete current group" style="font-size: 2em">🗑</div>
        </div>
        <div>
          <input id="hubConsoleGroupLabel" type="text" size="25" maxlength="25" placeholder="label">
          <select id="hubConsoleGroupConsoleSelect"></select>
          <div id="hubConsoleGroupAdd" class="icon clickable" title="add console to group">➕</div>
          <div id="hubConsoleGroupRemove" class="icon clickable" title="remove console from group">➖</div>
        </div>
      </td>
    </tr>
  </tbody></table></div></form>
</div>`;

function settingsPage() {
    // check that react already updated the content
    const localeSelect = document.querySelector('button#locale-select + select');
    if (localeSelect.children.length == 0) {
        setTimeout(settingsPage, 100);
        return;
    }
    // HTML creation
    const settingsDiv = getElementByXpath(document, '//div[h3[text()="Preferences"]]')?.parentElement;
    if (!settingsDiv) return;
    const mainDiv = document.createElement('div');
    settingsDiv.insertAdjacentElement('afterend', mainDiv);
    mainDiv.outerHTML = settingsHtml;

    /* Reset butons for saved filters */

    const addResetBehavior = (buttonId, filterId) => {
        const button = document.getElementById(buttonId);
        if (GM_getValue(filterId, null)) {
            button.addEventListener('click', () => {
                GM_deleteValue(filterId);
                button.disabled = true;
            });
        } else {
            button.disabled = true;
        }
    };
    addResetBehavior('resetHubFilters', 'hubFilters');
    addResetBehavior('resetConsoleFilters', 'consoleFilters');
    addResetBehavior('resetDevFilters', 'devFilters');

    /* Console groups */

    // Retrieve elements by their ids
    const groupSelect = document.getElementById('hubConsoleGroups');
    const newGroupIcon = document.getElementById('hubConsoleGroupNew');
    const saveGroupIcon = document.getElementById('hubConsoleGroupSave');
    const deleteGroupIcon = document.getElementById('hubConsoleGroupDelete');
    const groupLabel = document.getElementById('hubConsoleGroupLabel');
    const consoleSelect = document.getElementById('hubConsoleGroupConsoleSelect');
    const addConsoleIcon = document.getElementById('hubConsoleGroupAdd');
    const removeConsoleIcon = document.getElementById('hubConsoleGroupRemove');

    // Updating content
    consoleGroups.forEach(group => createOption(null, group.label, groupSelect));
    const consolesById = getConsolesById();
    const sortedConsoles = Object.entries(consolesById).sort((c1, c2) => c1[1].localeCompare(c2[1]));
    for (const [id, name] of sortedConsoles) {
        createOption(id, name, consoleSelect);
    }

    const onGroupChange = () => {
        const group = consoleGroups[groupSelect.selectedIndex] ?? {};
        groupLabel.value = group.label ?? '';
        groupLabel.dispatchEvent(new Event('change'));
        [...consoleSelect.options].forEach(option => {
            const label = consolesById[option.value];
            option.innerText = (group.consoles?.includes(parseInt(option.value))) ? label + '*' : label;
        });
        setVisible(deleteGroupIcon, groupSelect.selectedIndex != -1);
        consoleSelect.dispatchEvent(new Event('change'));
    };
    groupSelect.addEventListener('change', onGroupChange);
    consoleSelect.addEventListener('change', () => {
        const isIncluded = consoleSelect.selectedOptions[0].innerText.endsWith('*');
        setVisible(addConsoleIcon, !isIncluded);
        setVisible(removeConsoleIcon, isIncluded);
    });
    // Finish init
    onGroupChange();

    // Input checks
    const errors = new Set();
    const checkers = [];
    const inputChecker = (input, check) => {
        const checker = () => {
            const errorMsg = check();
            input.title = errorMsg ?? '';
            input.style['border-color'] = errorMsg ? 'red' : null;
            if (errorMsg) errors.add(input); else errors.delete(input);
            saveGroupIcon.style.cursor = (errors.size > 0) ? 'not-allowed' : 'pointer';
        };
        checkers.push(checker);
        return checker;
    };
    groupLabel.addEventListener('change', inputChecker(groupLabel, () => {
        const newLabel = groupLabel.value.trim();
        if (newLabel.length == 0) return 'Label cannot be empty';
        if (consoleGroups.some((c, i) => i != groupSelect.selectedIndex && c.label == newLabel)) return 'Another group has the same label';
    }));
    consoleSelect.addEventListener('change', inputChecker(consoleSelect, () => {
        if ([...consoleSelect.options].filter(o => o.innerText.endsWith('*')).length == 0) return 'At least one console must be selected';
    }));

    // Actions behavior
    newGroupIcon.addEventListener('click', () => {
        groupSelect.selectedIndex =-1;
        onGroupChange();
    });
    const saveGroups = () => GM_setValue('consoleGroups', consoleGroups);
    saveGroupIcon.addEventListener('click', () => {
        checkers.forEach(c => c());
        if (errors.size > 0) return;
        const isNew = groupSelect.selectedIndex == -1;
        const group = isNew ? {} : consoleGroups[groupSelect.selectedIndex];
        group.label = groupLabel.value.trim();
        group.consoles = [...consoleSelect.options].filter(o => o.innerText.endsWith('*')).map(o => parseInt(o.value));
        if (isNew) {
            group.id = GM_getValue('nextConsoleGroupId', 1);
            GM_setValue('nextConsoleGroupId', group.id + 1);
            consoleGroups.push(group);
            createOption(group.id, group.label, groupSelect);
            groupSelect.selectedIndex = groupSelect.options.length - 1;
            groupSelect.dispatchEvent(new Event('change'));
        } else {
            groupSelect.selectedOptions[0].innerHTML = group.label;
        }
        saveGroups();
    });
    saveGroupIcon.addEventListener('click', ackIconClick);
    deleteGroupIcon.addEventListener('click', () => {
        consoleGroups.splice(groupSelect.selectedIndex, 1);
        groupSelect.selectedOptions[0].remove();
        saveGroups();
        groupSelect.dispatchEvent(new Event('change'));
    });
    addConsoleIcon.addEventListener('click', () => {
        const option = consoleSelect.selectedOptions[0];
        option.innerText = consolesById[option.value] + '*';
        consoleSelect.dispatchEvent(new Event('change'));
    });
    removeConsoleIcon.addEventListener('click', () => {
        const option = consoleSelect.selectedOptions[0];
        option.innerText = consolesById[option.value];
        consoleSelect.dispatchEvent(new Event('change'));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (pageName == 'settings') {
        settingsPage();
        return;
    }
    if (pageName == 'game') {
        const consoleName = document.querySelector('h1 div span')?.innerText?.trim();
        if (consoleName && consoleName !== 'Hubs') return;
    }
    customize();
});


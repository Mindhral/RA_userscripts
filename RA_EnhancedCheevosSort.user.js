// ==UserScript==
// @name         RA_EnhancedCheevosSort
// @namespace    RA
// @version      0.1
// @description  Adds some possibilities to the sorting of achievements on game page, and do it locally without requesting the server
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const MainSorts = {
    'normal': {
        label: 'Normal',
        extractInfo: r1 => { },
        compare: (r1, r2) => r1.index - r2.index
    },
    'won-by': {
        label: 'Won by',
        extractInfo: r1 => { r1.wonBy = parseInt(r1.element.querySelector('span[title="Total unlocks"]').innerText.replace(',','')) },
        compare: (r1, r2) => r1.wonBy - r2.wonBy
    },
    'won-by-hc': {
        label: 'Won by (hardcore)',
        extractInfo: r1 => { r1.wonByHc = parseInt(r1.element.querySelector('span[title="Hardcore unlocks"]')?.innerText?.replaceAll(/[\(\),]/g,'')) || 0 },
        compare: (r1, r2) => r1.wonByHc - r2.wonByHc
    },
    'points': {
        label: 'Points',
        extractInfo: r1 => { r1.points = parseInt(r1.element.querySelector('span.TrueRatio')?.previousElementSibling?.innerText?.replace(/\((\d+)\)/,'$1')) || 0 },
        compare: (r1, r2) => r1.points - r2.points
    },
    'retropoints': {
        label: 'RetroPoints',
        extractInfo: r1 => { r1.retroPoints = parseInt(r1.element.querySelector('span.TrueRatio')?.innerText?.replace(/\((\d+)\)/,'$1')) || 0 },
        compare: (r1, r2) => r1.retroPoints - r2.retroPoints
    },
    'title': {
        label: 'Title',
        extractInfo: r1 => { r1.title = r1.element.querySelector('div > a.inline').innerText },
        compare: (r1, r2) => r1.title.localeCompare(r2.title)
    }
};

const SortGroupings = {
    groupUnlocks: {
        label: 'one group',
        getRowValue: r => r.unlocked ? 1 : 0
    },
    groupHC: {
        label: 'hardcore only',
        getRowValue: r => r.hcUnlocked ? 1 : 0
    },
    groupHCSC: {
        label: 'hardcore, softcore',
        getRowValue: r => r.hcUnlocked ? 2 : r.unlocked ? 1 : 0
    },
    groupNone: {
        label: 'none',
        getRowValue: r => 0
    }
};

const Compares = {
    reverse: c => (a, b) => c(b, a),
    compose: (c1, c2) => (a,b) => {
        const res1 = c1(a,b);
        return res1 == 0 ? c2(a,b) : res1;
    },
    allEqual: (a,b) => 0
};

const createOption = (value, labelTxt) => {
    const option = document.createElement('option');
    option.id = value;
    option.value = value;
    option.innerHTML = labelTxt;
    return option;
};

const Settings = GM_getValue('cheevosSortSettings', {
    mainSort: 'normal',
    descSort: false,
    sortGroup: 'groupUnlocks',
    groupLast: false
});

(function() {
    const achievementsList = document.querySelector('#achievement ul');
    if (achievementsList == null) return;
    const allRows = achievementsList.querySelectorAll('li');
    if (allRows.length == 0) return;
    const sortDiv = achievementsList.previousElementSibling.children[1];
    sortDiv.classList.add('grid', 'gap-y-1');;

    const rowInfos = [...allRows].map((row, index) => ({element: row, index: index}));
    for (const sort of Object.values(MainSorts)) {
        rowInfos.forEach(sort.extractInfo);
    }
    rowInfos.forEach(rowInfo => {
        rowInfo.unlocked = rowInfo.element.classList.contains('unlocked-row');
        rowInfo.hcUnlocked = rowInfo.element.getElementsByClassName('goldimagebig').length > 0;
    })

    let mainCompare, groupCompare = Compares.allEqual;

    const sortRows = () => {
        rowInfos.sort(Compares.compose(groupCompare, mainCompare));
        rowInfos.map(r => r.element).forEach(e => achievementsList.append(e));
    }

    // Replaces the sort links by a listbox and a descending checkbox
    const sortSpan = sortDiv.getElementsByTagName('span')[0];
    const sortLabel = document.createElement('span');
    sortLabel.className = 'font-bold';
    sortLabel.innerHTML = 'Sort: ';
    const mainSelect = document.createElement('select');
    mainSelect.id = 'sortValue';
    for (const [sortName, sort] of Object.entries(MainSorts)) {
        mainSelect.append(createOption(sortName, sort.label));
    }
    mainSelect.namedItem(Settings.mainSort).selected = true;
    mainCompare = MainSorts.normal.compare;

    const descLabel = document.createElement('label');
    const descCheckbox = document.createElement('input');
    descCheckbox.id = 'descSort';
    descCheckbox.type = 'checkbox';
    descCheckbox.checked = Settings.descSort;
    descLabel.append(descCheckbox, ' descending');
    sortSpan.replaceChildren(sortLabel, mainSelect, '\n', descLabel);

    const updateCompare = () => {
        mainCompare = MainSorts[Settings.mainSort].compare;
        if (Settings.descSort) mainCompare = Compares.reverse(mainCompare);
        sortRows();
    };
    mainSelect.addEventListener('change', () => {
        Settings.mainSort = mainSelect.selectedOptions[0].value;
        updateCompare();
    });
    descCheckbox.addEventListener('change', () => {
        Settings.descSort = descCheckbox.checked;
        updateCompare();
    });

    if (rowInfos.some(r => r.unlocked)) {
        // Adds sort option to handle unlocks
        const groupSpan = document.createElement('span');
        const groupSelect = document.createElement('select');
        groupSelect.id = 'sortGroups';
        for (const [sortName, sort] of Object.entries(SortGroupings)) {
            groupSelect.append(createOption(sortName, sort.label));
        }
        groupSelect.namedItem(Settings.sortGroup).selected = true;

        const groupLastLabel = document.createElement('label');
        const groupLastCheckbox = document.createElement('input');
        groupLastCheckbox.id = 'groupLast';
        groupLastCheckbox.type = 'checkbox';
        groupLastCheckbox.checked = Settings.groupLast;
        groupLastLabel.append(groupLastCheckbox, ' last');
        groupSpan.append('Separate unlocks: ', groupSelect, '\n', groupLastLabel);
        sortDiv.append(groupSpan);

        const updateUnlockCompare = () => {
            const getRowValue = SortGroupings[Settings.sortGroup].getRowValue;
            groupCompare = (r1, r2) => getRowValue(r1) - getRowValue(r2);
            if (!Settings.groupLast) groupCompare = Compares.reverse(groupCompare);
            sortRows();
        };
        groupSelect.addEventListener('change', () => {
            Settings.sortGroup = groupSelect.selectedOptions[0].value;
            updateUnlockCompare();
        });
        groupLastCheckbox.addEventListener('change', () => {
            Settings.groupLast = groupLastCheckbox.checked;
            updateUnlockCompare();
        });

        // implementing constraints between controls
        mainSelect.addEventListener('change', () => {
            const noneItem = groupSelect.namedItem('groupNone');
            noneItem.disabled = (Settings.mainSort === 'normal');
            noneItem.title = noneItem.disabled ? 'unavailable with normal sort' : '';
            if (noneItem.disabled && noneItem.selected) {
                groupSelect.selectedIndex = 0;
                Settings.sortGroup = groupSelect.selectedOptions[0].value;
            }
        });
        groupSelect.addEventListener('change', () => {
            groupLastCheckbox.disabled = (Settings.sortGroup === 'groupNone');
        });
        // take initial values into account
        groupSelect.dispatchEvent(new Event('change'));
    }
    mainSelect.dispatchEvent(new Event('change'));

    // adds the saving button
    const saveDiv = document.createElement('div');
    saveDiv.className = 'icon';
    saveDiv.style.cssText = 'cursor: pointer;font-size: 1.35em; padding-left:2em';
    saveDiv.title = 'save sort parameters as default';
    saveDiv.innerHTML = '💾';
    saveDiv.addEventListener('click', () => {
        saveDiv.style.cursor = 'grabbing';
        GM_setValue('cheevosSortSettings', Settings);
        setTimeout(() => { saveDiv.style.cursor = 'pointer' }, 500);
    });
    sortSpan.append('\n', saveDiv);
})();

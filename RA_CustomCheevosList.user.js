// ==UserScript==
// @name         RA_CustomCheevosList
// @namespace    RA
// @version      1.0
// @description  Provides a set of options to customize the achievements list on a game page
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @match        https://retroachievements.org/controlpanel.php*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// Loads the settings for the given key with default values
function loadSettings(key, defValues) {
    const settings = GM_getValue(key, defValues);
    // to add new properties
    for (const key of Object.keys(defValues)) {
        settings[key] ??= defValues[key];
    }
    return settings;
}

function getElementByXpath(root, xpath) {
  return document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

const settingsHtml = `<div class="component">
  <h4>Achievements list customization</h4>
  <table class="table-highlight"><tbody>
    <tr><th colspan="2"><label><input id="enhancedSortActive" type="checkbox"> Enhanced Sort Options</label></th></tr>
    <tr><th colspan="2"><label><input id="enhancedFiltersActive" type="checkbox"> Enhanced Filters</label></th></tr>
    <tr><th colspan="2"><label><input id="linkUnofficalActive" type="checkbox"> Link Unofficial Achievements</label></th></tr>
  </tbody></table>
</div>`;

const EnhancedCheevosSort = (() => {

    const MainSorts = {
        'normal': {
            label: 'Normal',
            extractInfo: r1 => { },
            compare: (r1, r2) => r1.index - r2.index
        },
        'won-by': {
            label: 'Won by',
            extractInfo: r1 => { r1.wonBy = parseInt(r1.element.querySelector('span[title="Total unlocks"]').innerText.replaceAll(',','')) },
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
        },
        'unlock-date': {
            label: 'Unlock date',
            extractInfo: r => {
                r.unlockDate = r.index; // to sort locked achievements with "normal" order
                const match = r.element.querySelector('li.unlocked-row p.leading-4 + p')?.innerText?.match(/Unlocked\s+(.+)([ap]m)/i);
                if (match != null) r.unlockDate = Date.parse(match[1] + ' ' + match[2]);
            },
            compare: (r1, r2) => r1.unlockDate - r2.unlockDate
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

    const DefaultSettings = {
        active: true
    };

    const Settings = loadSettings('enhancedSort', DefaultSettings);

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

    let sortParams = GM_getValue('cheevosSortSettings', {
        mainSort: 'normal',
        descSort: false,
        sortGroup: 'groupUnlocks',
        groupLast: false
    });

    function settingsPage() {
        const activeCheckbox = document.getElementById('enhancedSortActive');
        activeCheckbox.checked = Settings.active;
        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('enhancedSort', Settings);
        });
    }

    function gamePage() {
        if (!Settings.active) return;

        const achievementsList = document.getElementById('set-achievements-list');
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
        mainSelect.namedItem(sortParams.mainSort).selected = true;
        mainCompare = MainSorts.normal.compare;

        const descLabel = document.createElement('label');
        const descCheckbox = document.createElement('input');
        descCheckbox.id = 'descSort';
        descCheckbox.type = 'checkbox';
        descCheckbox.checked = sortParams.descSort;
        descLabel.append(descCheckbox, ' descending');
        sortSpan.replaceChildren(sortLabel, mainSelect, '\n', descLabel);

        const updateCompare = () => {
            mainCompare = MainSorts[sortParams.mainSort].compare;
            if (sortParams.descSort) mainCompare = Compares.reverse(mainCompare);
            sortRows();
        };
        mainSelect.addEventListener('change', () => {
            sortParams.mainSort = mainSelect.selectedOptions[0].value;
            updateCompare();
        });
        descCheckbox.addEventListener('change', () => {
            sortParams.descSort = descCheckbox.checked;
            updateCompare();
        });

        if (rowInfos.some(r => r.unlocked) && !rowInfos.every(r => r.hcUnlocked)) {
            // Adds sort option to handle unlocks
            const groupSpan = document.createElement('span');
            const groupSelect = document.createElement('select');
            groupSelect.id = 'sortGroups';
            for (const [sortName, sort] of Object.entries(SortGroupings)) {
                groupSelect.append(createOption(sortName, sort.label));
            }
            groupSelect.namedItem(sortParams.sortGroup).selected = true;

            const groupLastLabel = document.createElement('label');
            const groupLastCheckbox = document.createElement('input');
            groupLastCheckbox.id = 'groupLast';
            groupLastCheckbox.type = 'checkbox';
            groupLastCheckbox.checked = sortParams.groupLast;
            groupLastLabel.append(groupLastCheckbox, ' last');
            groupSpan.append('Separate unlocks: ', groupSelect, '\n', groupLastLabel);
            sortDiv.append(groupSpan);

            const updateUnlockCompare = () => {
                const getRowValue = SortGroupings[sortParams.sortGroup].getRowValue;
                groupCompare = (r1, r2) => getRowValue(r1) - getRowValue(r2);
                if (!sortParams.groupLast) groupCompare = Compares.reverse(groupCompare);
                sortRows();
            };
            groupSelect.addEventListener('change', () => {
                sortParams.sortGroup = groupSelect.selectedOptions[0].value;
                updateUnlockCompare();
            });
            groupLastCheckbox.addEventListener('change', () => {
                sortParams.groupLast = groupLastCheckbox.checked;
                updateUnlockCompare();
            });

            // implementing constraints between controls
            mainSelect.addEventListener('change', () => {
                const noneItem = groupSelect.namedItem('groupNone');
                noneItem.disabled = (sortParams.mainSort === 'normal');
                noneItem.title = noneItem.disabled ? 'unavailable with normal sort' : '';
                if (noneItem.disabled && noneItem.selected) {
                    groupSelect.selectedIndex = 0;
                    sortParams.sortGroup = groupSelect.selectedOptions[0].value;
                }
            });
            groupSelect.addEventListener('change', () => {
                groupLastCheckbox.disabled = (sortParams.sortGroup === 'groupNone');
            });
            // take initial values into account
            groupSelect.dispatchEvent(new Event('change'));
        }
        mainSelect.dispatchEvent(new Event('change'));

        // adds the saving button
        const iconSpan = document.createElement('span');
        iconSpan.className = 'hidden';
        iconSpan.style.cssText = 'font-size: 1.25em; padding-left:2em';
        const saveButton = document.createElement('button');
        saveButton.title = 'save sort parameters as default';
        saveButton.innerHTML = '💾';
        saveButton.addEventListener('click', () => {
            GM_setValue('cheevosSortSettings', sortParams);
            iconSpan.classList.add('hidden')
        });
        iconSpan.append(saveButton);
        sortSpan.append('\n', iconSpan);

        sortParams = new Proxy(sortParams, {
            set(obj, prop,val) {
                iconSpan.classList.remove('hidden')
                Reflect.set(...arguments);
            }
        });
    }

    return { gamePage, settingsPage };
})();

const EnhancedCheevosFilters = (() => {
    const DefaultSettings = {
        active: true
    };

    const Settings = loadSettings('enhancedFilters', DefaultSettings);

    function settingsPage() {
        const activeCheckbox = document.getElementById('enhancedFiltersActive');
        activeCheckbox.checked = Settings.active;
        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('enhancedFilters', Settings);
        });
    }

    function gamePage() {
        if (!Settings.active) return;
        const achievementsList = document.getElementById('set-achievements-list');
        if (achievementsList == null) return;
        const filterDiv = achievementsList.previousElementSibling.firstElementChild;

        // Replaces the unlock filter checkbox by unlock filter radios
        (function() {
            const unlockedRows = achievementsList.querySelectorAll('li.unlocked-row');
            if (unlockedRows.length == 0) return;
            const initialValue = 'none';
            const checkboxLabel = getElementByXpath(filterDiv, '//label[text()[contains(., "Hide unlocked achievements")]]');
            if (checkboxLabel == null) return;

            unlockedRows.forEach(row => {
                if (row.getElementsByClassName('goldimagebig').length > 0) {
                    row.classList.add('hc-unlocked-row');
                }
            });

            const styleBlock = document.createElement('style');
            styleBlock.innerHTML = '.hide-unlock .unlocked-row, .hide-hc-unlocks .hc-unlocked-row { display:none; }';
            document.head.appendChild(styleBlock);

            let currentHidingClass;
            const createUnlockRadioLabel = (value, hidingClass) => {
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'hideCheevos';
                input.value = value;
                input.classList.add('cursor-pointer');
                input.checked = (value === initialValue);
                input.addEventListener('change', () => {
                    if (currentHidingClass) achievementsList.classList.remove(currentHidingClass);
                    currentHidingClass = hidingClass;
                    if (currentHidingClass) achievementsList.classList.add(currentHidingClass);
                });
                const label = document.createElement('label');
                label.append(input, '\n', value, '\n');
                label.classList.add('cursor-pointer');
                return label;
            };

            const unlockedSpan = document.createElement('span');
            unlockedSpan.append('Hide:\n',
                                createUnlockRadioLabel('unlocked', 'hide-unlock'),
                                createUnlockRadioLabel('hardcore', 'hide-hc-unlocks'),
                                createUnlockRadioLabel('none', null));
            checkboxLabel.replaceWith(unlockedSpan);
        })();
    }

    return { gamePage, settingsPage };
})();

const LinkUnofficalAchievements = (() => {
    const DefaultSettings = {
        active: false
    };

    const Settings = loadSettings('linkUnoffical', DefaultSettings);

    function settingsPage() {
        const activeCheckbox = document.getElementById('linkUnofficalActive');
        activeCheckbox.checked = Settings.active;
        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('linkUnoffical', Settings);
        });
    }

    function gamePage() {
        if (!Settings.active) return;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('f') === '5') return;

        const achievementTitle = document.querySelector('#achievement > h2');
        if (achievementTitle == null) return;
        if (achievementTitle.innerText !== 'Achievements') return;

        const link = document.createElement('a');
        urlParams.set('f', '5');
        link.href = window.location.pathname + '?' + urlParams.toString();
        link.innerHTML = 'view the unofficial achievements';
        achievementTitle.after(link);
    }

    return { gamePage, settingsPage };
})();

function gamePage() {
    EnhancedCheevosSort.gamePage();
    EnhancedCheevosFilters.gamePage();
    LinkUnofficalAchievements.gamePage();
}

function settingsPage() {
    const xpathRes = document.evaluate("//div[h3[text()='Settings']]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const settingsDiv = xpathRes.iterateNext();
    if (!settingsDiv) return;
    const mainDiv = document.createElement('div');
    settingsDiv.insertAdjacentElement('afterend', mainDiv);
    mainDiv.outerHTML = settingsHtml;

    EnhancedCheevosSort.settingsPage();
    EnhancedCheevosFilters.settingsPage();
    LinkUnofficalAchievements.settingsPage();
}

const urlPathname = window.location.pathname;
const mainMethod = urlPathname.startsWith('/controlpanel.php') ? settingsPage : gamePage;
document.addEventListener("DOMContentLoaded", mainMethod);

// ==UserScript==
// @name         RA_CustomCheevosList
// @namespace    RA
// @version      1.1
// @description  Provides a set of options to customize the achievements list on a game page
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @match        https://retroachievements.org/achievement/*
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

// Sets the visibility of the table row containing the given element
function setRowVisibility(element, visible) {
    const action = visible ? 'remove' : 'add';
    element.closest('tr')?.classList[action]?.('hidden');
}

function getElementByXpath(root, xpath) {
    return document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function getElementsByXpath(root, xpath) {
    const results = document.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const nodes = [];
    let node;
    while (node = results.iterateNext()) nodes.push(node);
    return nodes;
}

// Handling "Beaten Game Credit" modals when they are loaded (one per button)
function handleBeatenModal(nodeCallback) {
    const newNodesCallback = records => records.forEach(record => nodeCallback(record.target));
    const newNodesObserver = new MutationObserver(newNodesCallback);
    const newNodesConfig = { childList: true };
    document.querySelectorAll('body div[x-html="dynamicHtmlContent"]').forEach(div => newNodesObserver.observe(div, newNodesConfig));
}

function addStyleBlock(content) {
    const styleBlock = document.createElement('style');
    styleBlock.innerHTML = content;
    document.head.appendChild(styleBlock);
}

const settingsHtml = `<div class="component">
  <h4>Achievements list customization</h4>
  <table class="table-highlight"><tbody>
    <tr><th colspan="2"><label><input id="enhancedCheevosSortActive" type="checkbox"> Enhanced Sort Options</label></th></tr>
    <tr><th colspan="2"><label><input id="enhancedCheevosFiltersActive" type="checkbox"> Enhanced Filters</label></th></tr>
    <tr><th colspan="2"><label><input id="linkUnofficalActive" type="checkbox"> Link Unofficial Achievements</label></th></tr>
    <tr><th colspan="2"><label><input id="collapseCheevosListActive" type="checkbox"> Collapse Achievements List</label></th></tr>
    <tr>
      <td>Collapse on page load</td>
      <td>
        <label><input type="radio" name="collapseOnLoad" value="never"> never</label>
        <label><input type="radio" name="collapseOnLoad" value="remember"> remember</label>
        <label><input type="radio" name="collapseOnLoad" value="always"> always</label>
      </td>
    </tr>
    <tr><th colspan="2"><label><input id="customLockedActive" type="checkbox"> Custom Locked Badges</label></th></tr>
    <tr>
      <td>Default</td>
      <td>
        <label title="Usual black & white badge"><input type="radio" name="defaultLocked" value="noop"> no change</label>
        <label title="Default, spoiler-free badge"><input type="radio" name="defaultLocked" value="generic"> generic</label>
        <label title="Unlocked badge"><input type="radio" name="defaultLocked" value="colored"> colored</label>
      </td>
    </tr>
    <tr>
      <td>Mouseover</td>
      <td>
        <label title="No action on mouseover"><input type="radio" name="mouseoverLocked" value="noop"> same</label>
        <label title="Usual locked badge"><input type="radio" name="mouseoverLocked" value="bw"> black & white</label>
        <label title="Unlocked badge"><input type="radio" name="mouseoverLocked" value="colored"> colored</label>
      </td>
    </tr>
    <tr><th colspan="2"><label><input id="filterBeatenCreditListActive" type="checkbox"> Beaten Game Credit Filter</label></th></tr>
    <tr><th colspan="2"><label><input id="historyLinksActive" type="checkbox"> Links to User's History</label></th></tr>
    <tr>
      <td>Link CSS style</td>
      <td><input id="historyLinksStyle" type="text"> <div id="historyLinksStyleExample" class="icon cursor-pointer" title="click for an example with underline and no link color">💡</div></td>
    </tr>
    <tr><th colspan="2"><label><input id="highScoreLinksActive" type="checkbox"> Link High Scores To Compare Page</label></th></tr>
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
        'type': {
            label: 'Type',
            extractInfo: (() => {
                const order = { 'Progression': 0, 'Win Condition': 1, 'Missable': 2 };
                return r => { r.type = order[r.element.querySelector('button div[aria-label]')?.ariaLabel] ?? 3 };
            })(),
            compare: (r1, r2) => {
                const comp = r1.type - r2.type;
                return comp == 0 ? r1.index - r2.index : comp;
            }
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
        const activeCheckbox = document.getElementById('enhancedCheevosSortActive');
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
        });

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
        const activeCheckbox = document.getElementById('enhancedCheevosFiltersActive');
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

            addStyleBlock('.hide-unlock .unlocked-row, .hide-hc-unlocks .hc-unlocked-row { display:none; }');

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

const CollapseAchievementsList = (() => {
    const DefaultSettings = {
        active: true,
        collapseOnLoad: 'never'
    };

    const Settings = loadSettings('collapseCheevosList', DefaultSettings);

    function saveSettings() {
        GM_setValue('collapseCheevosList', Settings);
    }

    function settingsPage() {
        const activeCheckbox = document.getElementById('collapseCheevosListActive');
        activeCheckbox.checked = Settings.active;

        const collapseOnLoadRadios = [...document.querySelectorAll('input[name="collapseOnLoad"]')];
        collapseOnLoadRadios.filter(r => r.value == Settings.collapseOnLoad)[0].checked = true;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            setRowVisibility(collapseOnLoadRadios[0], Settings.active);
            saveSettings();
        });
        activeCheckbox.dispatchEvent(new Event('change'));

        collapseOnLoadRadios.forEach(r => r.addEventListener('change', () => {
            Settings.collapseOnLoad = r.value;
            saveSettings();
        }));
    }

    function gamePage() {
        if (!Settings.active) return;
        const achievementsList = document.getElementById('set-achievements-list');
        if (achievementsList == null) return;
        const filterDiv = achievementsList.previousElementSibling;
        const countersDiv = filterDiv.previousElementSibling.previousElementSibling;

        const newDiv = document.createElement('div');
        countersDiv.replaceWith(newDiv);
        newDiv.outerHTML = `<div class="flex w-full justify-between items-center" x-data="{
        isExpanded: true,
        handleToggle() {
            this.isExpanded = !this.isExpanded;
        }
    }">
  <button id="collapseAchievementsBtn" title="Hide achievements list" @click="handleToggle" class="btn transition-transform lg:active:scale-95 duration-75">
    <div class="transition-transform rotate-180" :class="{ 'rotate-180': isExpanded }">
      <svg class="icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path></svg>
    </div>
  </button>
</div>`;
        const button = document.getElementById('collapseAchievementsBtn');
        button.before(countersDiv);

        const lastState = GM_getValue('collapseLastState', true);
        let visible = true;
        button.addEventListener('click', () => {
            visible = !visible;
            const method = visible ? 'remove' : 'add';
            filterDiv.classList[method]('hidden');
            achievementsList.classList[method]('hidden');
            button.title = visible ? 'Hide achievements list' : 'Show achievements list';
            GM_setValue('collapseLastState', !visible);
        });
        if (Settings.collapseOnLoad == 'always' || (Settings.collapseOnLoad == 'remember' && lastState)) {
            button.dispatchEvent(new Event('click'));
        }
    }

    return { gamePage, settingsPage };
})();

const CustomLockedBadges = (() => {
    const DefaultSettings = {
        active: false,
        default: 'noop',
        mouseover: 'colored'
    };

    const Settings = loadSettings('customLocked', DefaultSettings);

    function saveSettings() {
        GM_setValue('customLocked', Settings);
    }

    function settingsPage() {
        const activeCheckbox = document.getElementById('customLockedActive');
        activeCheckbox.checked = Settings.active;

        const defaultLockedRadios = [...document.querySelectorAll('input[name="defaultLocked"]')];
        defaultLockedRadios.filter(r => r.value == Settings.default)[0].checked = true;

        const mouseoverLockedRadios = [...document.querySelectorAll('input[name="mouseoverLocked"]')];
        mouseoverLockedRadios.filter(r => r.value == Settings.mouseover)[0].checked = true;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            setRowVisibility(defaultLockedRadios[0], Settings.active);
            setRowVisibility(mouseoverLockedRadios[0], Settings.active);
            saveSettings()
        });
        activeCheckbox.dispatchEvent(new Event('change'));

        defaultLockedRadios.forEach(r => r.addEventListener('change', () => {
            Settings.default = r.value;
            const disabled = (r.value == 'noop') ? [ 'noop', 'bw' ] : (r.value == 'colored') ? [ 'colored' ] : [];
            let mustChange = false;
            mouseoverLockedRadios.forEach(r2 => {
                r2.disabled = disabled.includes(r2.value);
                if (r2.disabled && r2.checked) mustChange = true;
            });
            if (mustChange) {
                const firstAvailable = mouseoverLockedRadios.find(r2 => !r2.disabled);
                firstAvailable.checked = true;
                firstAvailable.dispatchEvent(new Event('change'));
            } else {
                saveSettings();
            }
        }));
        mouseoverLockedRadios.forEach(r => r.addEventListener('change', () => {
            Settings.mouseover = r.value;
            saveSettings();
        }));
    }

    function gamePage() {
        if (!Settings.active) return;
        const GenericUnlockURL = 'https://static.retroachievements.org/assets/images/achievement/badge-locked.png';
        const ProcessImage = badge => {
            let source = badge.src;
            const colored = source.replace('_lock.png', '.png');
            if (source == colored) {
                return;
            }
            const locked = source;

            if (Settings.default == 'colored') {
                source = colored;
            } else if (Settings.default == 'generic') {
                source = GenericUnlockURL;
            }
            badge.src = source;

            let mouseover = source;
            if (Settings.mouseover == 'bw') {
                mouseover = locked;
            } else if (Settings.mouseover == 'colored') {
                mouseover = colored;
            }
            if (mouseover != source) {
                badge.addEventListener('mouseenter', () => { badge.src = mouseover; });
                badge.addEventListener('mouseleave', () => { badge.src = source; });
            }
        };
        [...document.getElementsByClassName('badgeimg')].forEach(ProcessImage);

        handleBeatenModal(node => [...node.getElementsByClassName('badgeimg')].forEach(ProcessImage));
    }

    return { gamePage, settingsPage };
})();

const FilterBeatenCreditList = (() => {
    const DefaultSettings = {
        active: true
    };

    const Settings = loadSettings('filterBeatenCreditList', DefaultSettings);

    function settingsPage() {
        const activeCheckbox = document.getElementById('filterBeatenCreditListActive');
        activeCheckbox.checked = Settings.active;
        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('filterBeatenCreditList', Settings);
        });
    }

    function gamePage() {
        if (!Settings.active) return;
        // used to sync filters on all modals
        const changeCallbacks = [];
        let onlyRemaining = false;
        let forHardcore = false;
        const setParams = (mainCheck, hcCheck) => {
            onlyRemaining = mainCheck;
            forHardcore = hcCheck;
            changeCallbacks.forEach(callback => callback());
        }

        handleBeatenModal(node => {
            const mainDiv = node.firstElementChild;
            if (!mainDiv || mainDiv.children.length < 3) return;
            const elements = [...mainDiv.children];
            const isUnlocked = e => e.querySelector('li.unlocked-row') != null;
            const isUnlockedHc = e => e.querySelector('img.goldimagebig') != null;
            if (!elements.some(isUnlocked)) return;

            // identify progression and win elements
            let progressionTitle;
            const progressionItems = [];
            let winTitle;
            const winItems = [];
            let index = 1;
            if (elements[1].innerText.includes("ALL of these")) {
                progressionTitle = elements[1];
                while (elements[++index]?.matches('ul')) progressionItems.push(elements[index]);
            }
            if (index < elements.length) {
                winTitle = elements[index];
                while (++index < elements.length) winItems.push(elements[index]);
            }

            // add new DOM nodes
            const [mainCheckbox, hcCheckbox] = (() => {
                const textDiv = mainDiv.firstElementChild;
                const newDiv = document.createElement('div');
                textDiv.append(newDiv);
                textDiv.classList.remove('mb-6');
                textDiv.classList.add('mb-4');
                newDiv.classList.add('flex');

                const label = document.createElement('label');
                newDiv.append(label);
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                label.append(checkbox, ' Only show remaining');
                const unlockedHcCount = elements.filter(isUnlockedHc).length;
                let hcCheckbox;
                if (unlockedHcCount > 0 && unlockedHcCount != elements.filter(isUnlocked).length) {
                    const hcLabel = document.createElement('label');
                    newDiv.append(hcLabel);
                    hcCheckbox = document.createElement('input');
                    hcCheckbox.type = 'checkbox';
                    hcLabel.append(hcCheckbox, ' for hardcore');
                    hcLabel.style['margin-left'] = '1em';
                }
                return [checkbox, hcCheckbox];
            })();

            // filter behavior
            const filter = () => {
                mainCheckbox.checked = onlyRemaining;
                if (hcCheckbox) hcCheckbox.checked = forHardcore;
                elements.forEach(e => e.classList.remove('hidden'));
                if (!onlyRemaining) {
                    return;
                }
                const unlockedTest = forHardcore ? isUnlockedHc : isUnlocked;
                const hide = e => e.classList.add('hidden');
                if (progressionTitle) {
                    const unlockedProgr = progressionItems.filter(unlockedTest);
                    if (unlockedProgr.length == progressionItems.length) hide(progressionTitle);
                    unlockedProgr.forEach(hide);
                }
                if (winItems.some(unlockedTest)) {
                    hide(winTitle);
                    winItems.forEach(hide);
                }
            };
            changeCallbacks.push(filter);
            filter();

            mainCheckbox.addEventListener('change', () => setParams(mainCheckbox.checked, hcCheckbox?.checked));
            hcCheckbox?.addEventListener('change', () => setParams(hcCheckbox.checked || mainCheckbox.checked, hcCheckbox.checked));
        });
    }

    return { gamePage, settingsPage };
})();

const HistoryLinks = (() => {
    const DefaultSettings = {
        active: false,
        style:''
    };

    const Settings = loadSettings('historyLinks', DefaultSettings);

    function saveSettings() {
        GM_setValue('historyLinks', Settings);
    }

    function settingsPage() {
        const activeCheckbox = document.getElementById('historyLinksActive');
        activeCheckbox.checked = Settings.active;
        const historyLinksStyleText = document.getElementById('historyLinksStyle');
        historyLinksStyleText.value = Settings.style;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            setRowVisibility(historyLinksStyleText, Settings.active);
            saveSettings();
        });
        activeCheckbox.dispatchEvent(new Event('change'));
        historyLinksStyleText.addEventListener('change', () => {
            Settings.style = historyLinksStyleText.value.trim();
            saveSettings();
        });
        document.getElementById('historyLinksStyleExample').addEventListener('click', () => {
            historyLinksStyleText.value = 'color: inherit;text-decoration: underline;';
            historyLinksStyleText.dispatchEvent(new Event('change'));
        });
    }

    function gamePage() {
        if (!Settings.active) return;
        const achievementsList = document.getElementById('set-achievements-list');
        if (achievementsList == null) return;
        const currentUser = document.querySelector('div.dropdown-menu-right div.dropdown-header')?.textContent;
        if (!currentUser) return;
        getElementsByXpath(achievementsList, '//p[contains(text(), "Unlocked")]').forEach(p => {
            p.innerHTML = p.innerText.replace(/Unlocked ([A-Z][a-z]+ [0-9]+ [0-9]{4})/, (fullMatch, date) => {
                const timestamp = new Date(date + ' UTC').getTime() / 1000;
                return `Unlocked <a class="historyLink" href="/historyexamine.php?d=${timestamp}&amp;u=${currentUser}">${date}</a>`;
            });
        });
        if (Settings.style?.length > 0) {
            addStyleBlock(`.historyLink { ${Settings.style }`);
        }
    }

    return { gamePage, settingsPage };
})();

const LinkHighScore2Compare = (() => {
    const DefaultSettings = {
        active: false
    };

    const Settings = loadSettings('highScoreLinks', DefaultSettings);

    function settingsPage() {
        const activeCheckbox = document.getElementById('highScoreLinksActive');
        activeCheckbox.checked = Settings.active;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('highScoreLinks', Settings);
        });
    }

    function gamePage() {
        if (!Settings.active) return;
        const achievementsList = document.getElementById('set-achievements-list');
        if (achievementsList == null) return;
        const currentUser = document.querySelector('div.dropdown-menu-right div.dropdown-header')?.textContent;
        if (!currentUser) return;
        const gameId = window.location.pathname.split('/').at(-1);

        const createCompareLink = (root) => {
            const userId = root.querySelector('a').href.split('/').at(-1);
            if (userId === currentUser) return;
            const newLink = document.createElement('a');
            newLink.href = `/gamecompare.php?ID=${gameId}&f=${userId}`;
            return newLink;
        };
        const highscoresDiv = document.getElementById('highscores');
        highscoresDiv?.querySelectorAll('tr:not(.do-not-highlight)').forEach(tr => {
            const scoreCell = tr.children.item(2);
            const scoreSpan = scoreCell.firstElementChild;
            // moving the help text and cursor from the score span to the entire cell
            scoreCell.classList.add('cursor-help');
            scoreSpan.classList.remove('cursor-help');
            scoreCell.title = scoreSpan.title;
            scoreSpan.removeAttribute('title');
            // creating the link
            const userId = tr.querySelector('a').href.split('/').at(-1);
            if (userId === currentUser) return;
            const newLink = document.createElement('a');
            newLink.href = `/gamecompare.php?ID=${gameId}&f=${userId}`;
            newLink.append(scoreSpan);
            scoreCell.append(newLink);
        });
    }

    return { gamePage, settingsPage };
})();

const Pages = {
    game: () => {
        EnhancedCheevosSort.gamePage();
        EnhancedCheevosFilters.gamePage();
        LinkUnofficalAchievements.gamePage();
        CollapseAchievementsList.gamePage();
        CustomLockedBadges.gamePage();
        FilterBeatenCreditList.gamePage();
        HistoryLinks.gamePage();
        LinkHighScore2Compare.gamePage();
    },
    achievement: () => {
        CustomLockedBadges.gamePage();
    },
    controlpanel: () => {
        const settingsDiv = getElementByXpath(document, '//div[h3[text()="Settings"]]');
        if (!settingsDiv) return;
        const mainDiv = document.createElement('div');
        settingsDiv.insertAdjacentElement('afterend', mainDiv);
        mainDiv.outerHTML = settingsHtml;

        EnhancedCheevosSort.settingsPage();
        EnhancedCheevosFilters.settingsPage();
        LinkUnofficalAchievements.settingsPage();
        CollapseAchievementsList.settingsPage();
        CustomLockedBadges.settingsPage();
        FilterBeatenCreditList.settingsPage();
        HistoryLinks.settingsPage();
        LinkHighScore2Compare.settingsPage();
    }
};

const pageName = window.location.pathname.split('/', 2)[1].split('.php', 1)[0];
document.addEventListener("DOMContentLoaded", Pages[pageName]);

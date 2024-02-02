// ==UserScript==
// @name         RA_GameResourceSearch
// @namespace    RA
// @version      0.2
// @description  Adds (customizable) links to game pages to search for resources on the game.
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @match        https://retroachievements.org/controlpanel.php*
// @match        https://retroachievements.org/setRequestList.php*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// TIC-80, WASM-4, TI-83, Uzebox
const homebrewConsoles = [65,72,79,80];
const youtubeConsoleNames = {
    1: 'genesis', 5: 'gba', 6: 'gbc', 12: 'ps1', 13: 'lynx',
    21: 'ps2', 41: 'psp', 42: 'cd-i', 43: '3do', 47: 'pc-88',
    48: 'pc-98', 57: 'chanel f', 61: 'N-Gage', 62: '3DS', 78: 'dsiware'
};
const DefaultSearches = [
    {
        id: 'yt-lp',
        label:'Youtube longplay',
        url:'https://www.youtube.com/results?search_query=${gameName}+${consoleName}+longplay',
        consoleNames: youtubeConsoleNames
    },
    {
        id: 'yt-review',
        label:'Youtube review',
        url:'https://www.youtube.com/results?search_query=${gameName}+${consoleName}+review',
        consoleNames: youtubeConsoleNames
    },
    {
        id: 'mobygames',
        label:'Mobygames',
        url:'https://www.mobygames.com/game/platform:${consoleLongName.toLowerCase().replace(" ","-")}/title:${gameName.replace("/"," ")}/',
        consoleNames: {
            2: 'n64', 4: 'gameboy', 5: 'gameboy-advance', 6: 'gameboy-color',
            8: 'turbo-grafx', 11: 'sega-master-system', 13: 'lynx', 17: 'jaguar',
            21: 'ps2', 23: 'odyssey-2', 30: 'c64', 37: 'cpc', 38: 'apple2',
            39: 'sega-saturn', 40: 'dreamcast', 41: 'psp', 42: 'cd-i', 43: '3do', 47: 'pc88',
            48: 'pc98', 54: 'epoch-cassette-vision', 55: 'epoch-super-cassette-vision',
            56: 'neo-geo-cd', 57: 'channel-f', 58: 'fmtowns', 61: 'ngage', 62: '3ds',
            63: 'supervision', 66: 'thomson-to', 67: 'pc-6001', 76: 'turbografx-cd', 77: 'jaguar'
        },
        consoleFilter: {
            type: 'exclude',
            ids: [...homebrewConsoles, 60, 74, 75] // + Game & Watch, VC 4000, Elektor TGC
        },
        tagFilter: {
            type: 'exclude',
            tags: 'hack,demo,prototype,homebrew'
        }
    },
    {
        id: 'gfaq',
        label:'GameFAQs',
        url:'https://gamefaqs.gamespot.com/search?game=${gameName}',
        consoleFilter: {
            type: 'exclude',
            ids: [...homebrewConsoles, 71] // + Arduboy
        },
        tagFilter: {
            type: 'exclude',
            tags: 'hack,demo,unlicensed,prototype,homebrew'
        }
    },
    {
        id: 'rhdn',
        label:'Romhacking.net',
        url:'https://www.romhacking.net/?page=hacks&title=${gameName}',
        tagFilter: {
            type: 'include',
            tags: 'hack'
        }
    },
    {
        id: 'arcadedb',
        label:'Arcade Database',
        url:'http://adb.arcadeitalia.net/lista_mame.php?ricerca=${gameName}',
        consoleFilter: {
            type: 'include',
            ids: [27]
        },
        tagFilter: {
            type: 'exclude',
            tags: 'hack,homebrew'
        }
    },
    {
        id: 'speedrun',
        label:'Speedrun.com',
        url:'https://www.speedrun.com/search?q=${gameName}',
        consoleFilter: {
            type: 'exclude',
            // ZX81, Cassette Vision, Watara Supervision, Thomson TO8, PC-6000, WASM-4,
            // Arcadia 2001, Interton VC 4000, Elektor TV Games Computer, TI-83, Uzebox
            ids: [31, 54, 63, 66, 67, 72, 73, 74, 75, 79, 80]
        }
    },
    {
        id: 'howlong',
        label:'HowLongToBeat',
        url:'https://howlongtobeat.com/?q=${gameName}',
        consoleFilter: {
            type: 'exclude',
            // + Pokemon Mini, Oric, VIC-20, Vectrex, Cassette Vision, Super Cassette Vision,
            // Fairchild Channel F, Watara Supervision, Thomson TO8, PC-6000, Mega Duck,
            // Arduboy, Arcadia 2001, Interton VC 4000, Elektor TV Games Computer
            ids: [...homebrewConsoles, 24, 32, 34, 46, 54, 55, 57, 63, 66, 67, 69, 71, 73, 74, 75]
        },
        tagFilter: {
            type: 'exclude',
            tags: 'hack,homebrew,prototype,demo,subset'
        }
    },
    {
        id: 'wikie',
        label:'Wikipedia (en)',
        url:'https://en.wikipedia.org/wiki/Special:Search?search=${gameName}',
        consoleFilter: {
            type: 'exclude',
            ids: homebrewConsoles
        },
        tagFilter: {
            type: 'exclude',
            tags: 'hack,homebrew'
        }
    }
];

const Settings = {
    searches: GM_getValue('searches', [])
};
// adds the (new) default searches to the list
DefaultSearches.filter(search => !Settings.searches.some(s => s.id === search.id))
    .forEach(search => Settings.searches.push(structuredClone(search)));

function saveSearches() {
    GM_setValue('searches', Settings.searches);
}

function newElement(tagName, parent, className = null, innerHTML = null) {
    const result = document.createElement(tagName);
    parent.append(result);
    if (className) result.className = className;
    if (innerHTML) result.innerHTML = innerHTML;
    return result;
}

// setRequestList.php: only used to reload the list of all consoles
function setRequestPage() {
    const consoles = {};
    [...document.getElementById('filter-by-console-id').children].forEach(option => {
        const id = parseInt(option.value);
        if (isNaN(id) || id <= 0 || id == 100 || id == 101) return;
        consoles[id] = option.innerText.trim().split('/')[0];
    });
    GM_setValue('consoles', consoles);
}

function getConsoles() {
    const allConsoles = GM_getValue('consoles', []);
    // if the setRequestlist page wasn't loaded, we get the consoles from the drop down menu
    if (allConsoles.length == 0) {
        const dropdown = document.querySelector('div.dropdown > button[title="Games"] ~ div.dropdown-menu');
        dropdown.querySelectorAll('a.dropdown-item[href*="gameList.php?c="]').forEach(item => {
            const id = parseInt(item.href.split('=').at(-1));
            allConsoles[id] = item.innerText.trim().split('/')[0];
        });
    }
    return allConsoles;
}

function executeTemplate(template, consoleName, consoleLongName, gameName) {
    const escapedUrl = template.replaceAll(/[`=;\\]/g, '\\$&');
    // <=> eval(`"use strict";\`${escapedUrl}\``);
    const urlFunction = Function('consoleName', 'consoleLongName', 'gameName', `"use strict";return \`${escapedUrl}\`;`);
    return urlFunction(consoleName, consoleLongName, encodeURIComponent(gameName));
}

function setVisible(element, visible) {
    const method = visible ? 'remove' : 'add';
    element.classList[method]('hidden');
}

const settingsDivHtml = `<div class="component">
	<style>
		.clickable { cursor: pointer; user-select: none; vertical-align: sub; font-size: 1.5em; }
	</style>
	<h4>Game Resource Search</h4>
	<table class="table-highlight">
		<tbody>
			<tr>
				<td><div class="flex">
					<select id="grSearchSelect"></select>
                    <span id="grSearchAdd" style="cursor: pointer; margin: 0.2em 0 0 0.5em" title="New empty search">
                    	<img style="width: 1.1em;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAZCAYAAAA8CX6UAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAAB7SURBVEhL7ZTRCoAgDEW1r4j6/0+rPsPuNqmR4Zy99OCBixPkOBUMIDkyI69EJAGZVYiRljIrskt5M+WxibzhhhSduUSKA1mkFNwidQ3U2SXr6ohk6pgsc132c516AK6aRTWaRTVok95XKxgimyGyGSKb/4n4P5LyCyGcQrkwJuTlwmgAAAAASUVORK5CYII" />
                    </span>
                    <span id="grSearchClone" style="cursor: pointer; margin: 0.2em 0 0 0.5em" title="New search based on the current one">
                    	<img style="width: 1.6em;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAADNSURBVEhL3ZIBCsMgDEV1d2jZ/S832A7R5ds40tTqtxYGffAx0MSfpAaShdRTtCPq2WIRNCwT4++qWfRZw5WHnpegjbxFm4lYE3bibPQSTQgATPI+W6LxE6HD6r7NrnNxEeT571o7Uyb4ns2Ocm0zHtokx6CW70FNlwmodQz8XcjvfsL2EsReJSiTNLJRL811HQEzpg55u0lsx1YjDE1Swt+VmpTztAlTh7zu13WG/5ikHRY0wn3+yegTTvUIalxh0uQ+T5jaaQViXSF8AV7KhUyGTd36AAAAAElFTkSuQmCC" />
                    </span>
				</div></td>
				<td><label><input id="grSearchActive" type="checkbox">active</label></td>
				<td>
					<div id="grSearchDown" class="icon clickable" title="move search down in the list">🔽</div><div id="grSearchUp" class="icon clickable" title="move search up in the list">🔼</div>
					<div id="grSearchSave" class="icon clickable" title="save current Search">💾</div>
					<div id="grSearchReset" class="icon clickable" title="reset search to default" style="font-size: 2em">↻</div>
					<div id="grSearchDelete" class="icon clickable hidden" title="delete search" style="font-size: 2em">🗑</div>
				</td>
			</tr>
			<tr>
				<td>Displayed name</td>
				<td colspan="2"><input id="grSearchLabel" type="text" size="25" maxlength="25" placeholder="label"></td>
			</tr>
			<tr>
				<td>Url pattern</td>
				<td colspan="2">
					<input id="grSearchURL" type="text" style="width: 95%;" placeholder="url">
					<div class="icon" title="placeholders: \${gameName}, \${consoleName}, \${consoleLongName} (from top menu)" style="cursor: help;">💡</div>
				</td>
			</tr>
			<tr>
				<td>Console names</td>
				<td>
	                <select id="grSearchConsoleSelect"></select>
                	<div class="icon" title="Load &quot;Most Requested&quot; page to refresh list" style="cursor: help;">💡</div>
                </td>
				<td>
					<input id="grSearchConsoleName" type="text" placeholder="console name">
					<div class="icon" title="Leave empty to keep default name" style="cursor: help;">💡</div>
				</td>
			</tr>
			<tr>
				<td>Console filter</td>
				<td>
					<label><input id="grSearchConsoleIncl" type="radio" name="grSearchConsoleRadio" checked=""> include</label>
					<label><input id="grSearchConsoleExcl" type="radio" name="grSearchConsoleRadio"> exclude</label>
				</td>
				<td>
					<input id="grSearchConsoleIds" type="text" placeholder="console ids">
					<div class="icon" title="consoles ids separated by commas" style="cursor: help;">💡</div>
				</td>
			</tr>
			<tr>
				<td>Tag filter</td>
				<td>
					<label><input id="grSearchTagsIncl" type="radio" name="grSearchTagsRadio" checked=""> include</label>
					<label><input id="grSearchTagsExcl" type="radio" name="grSearchTagsRadio"> exclude</label>
				</td>
				<td>
					<input id="grSearchTagsList" type="text" placeholder="tags">
					<div class="icon" title="comma separated list of tags, case insensitive, 'none' for games without tags" style="cursor: help;">💡</div>
				</td>
			</tr>
		</tbody>
	</table>
</div>`

function settingsPage() {
    const xpathRes = document.evaluate("//div[h3[text()='Settings']]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const settingsDiv = xpathRes.iterateNext();
    if (settingsDiv == null) return;

    // HTML creation
    const mainDiv = document.createElement('div');
    settingsDiv.insertAdjacentElement('afterend', mainDiv);
    mainDiv.outerHTML = settingsDivHtml;
    const searchSelect = document.getElementById('grSearchSelect');
    Settings.searches.forEach(search => {
        newElement('option', searchSelect, null, search.label).value = search.id;
    });
    const consoles = getConsoles();
    const consoleSelect = document.getElementById('grSearchConsoleSelect');
    const sortedConsoles = Object.entries(consoles).sort((c1, c2) => c1[1].localeCompare(c2[1]));
    for (const [id, name] of sortedConsoles) {
        const option = newElement('option', consoleSelect, null, name);
        option.value = id;
        option.title = `id=${id}`;
    }

    // Retrieve elements by their ids
    const labelText = document.getElementById('grSearchLabel');
    const activeCheckbox = document.getElementById('grSearchActive');
    const downIcon = document.getElementById('grSearchDown');
    const upIcon = document.getElementById('grSearchUp');
    const saveIcon = document.getElementById('grSearchSave');
    const resetIcon = document.getElementById('grSearchReset');
    const deleteIcon = document.getElementById('grSearchDelete');
    const addIcon = document.getElementById('grSearchAdd');
    const cloneIcon = document.getElementById('grSearchClone');
    const urlText = document.getElementById('grSearchURL');
    const consoleNameText = document.getElementById('grSearchConsoleName');
    const consoleInclRadio = document.getElementById('grSearchConsoleIncl');
    const consoleExclRadio = document.getElementById('grSearchConsoleExcl');
    const consoleIdsText = document.getElementById('grSearchConsoleIds');
    const tagsInclRadio = document.getElementById('grSearchTagsIncl');
    const tagsExclRadio = document.getElementById('grSearchTagsExcl');
    const tagsText = document.getElementById('grSearchTagsList');

    // Updating content
    const defaultSearchIds = DefaultSearches.map(s => s.id);
    let currentSearch;
    let searchConsoles; // copy which can change without saving
    const onPositionChange = () => {
        const setActive = (input, active) => {
            input.style.cursor = active ? 'pointer' : 'default';
            input.style.opacity = active ? 1 : 0.2;
        };
        setActive(upIcon, searchSelect.selectedIndex > 0);
        setActive(downIcon,searchSelect.selectedIndex < Settings.searches.length - 1 && searchSelect.selectedIndex >= 0);
    }
    const setTextValue = (input, text) => {
        if (input.value === text) return;
        input.value = text;
        input.dispatchEvent(new Event('change'));
    };
    const onSearchChange = () => {
        setTextValue(labelText, currentSearch.label ?? '');
        activeCheckbox.checked = currentSearch.active != false;
        onPositionChange();
        const isNew = !currentSearch.id;
        const isDefault = defaultSearchIds.includes(currentSearch.id);
        setVisible(resetIcon, isDefault);
        setVisible(deleteIcon, !isDefault && !isNew);
        setVisible(cloneIcon, !isNew);
        setVisible(upIcon, !isNew);
        setVisible(downIcon, !isNew);
        setTextValue(urlText, currentSearch.url ?? '');
        searchConsoles = {...currentSearch.consoleNames};
        consoleSelect.dispatchEvent(new Event('change'));
        [...consoleSelect.children].forEach(option => {
            const consoleName = consoles[option.value];
            option.innerHTML = consoleName + (searchConsoles[option.value] ? '*' :'');
        });
        if (currentSearch.consoleFilter?.type === 'include') {
            consoleInclRadio.checked = true;
        } else {
            consoleExclRadio.checked = true;
        }
        setTextValue(consoleIdsText, currentSearch.consoleFilter?.ids.join(',') ?? '');
        if (currentSearch.tagFilter?.type === 'include') {
            tagsInclRadio.checked = true;
        } else {
            tagsExclRadio.checked = true;
        }
        setTextValue(tagsText, currentSearch.tagFilter?.tags ?? '');
    };
    searchSelect.addEventListener('change', () => {
        currentSearch = Settings.searches[searchSelect.selectedIndex];
        onSearchChange();
    });
    consoleSelect.addEventListener('change', () => {
        setTextValue(consoleNameText, searchConsoles[consoleSelect.selectedOptions[0].value] ?? '');
    });
    searchSelect.dispatchEvent(new Event('change'));
    consoleNameText.addEventListener('change', () => {
        consoleNameText.value = consoleNameText.value.trim();
        const curOption = consoleSelect.selectedOptions[0];
        searchConsoles[curOption.value] = consoleNameText.value;
        const hasStar = curOption.innerText.endsWith('*');
        if (searchConsoles[curOption.value]) {
            if (!hasStar) curOption.innerHTML = curOption.innerText + '*';
        } else if (hasStar) {
            curOption.innerHTML = curOption.innerText.slice(0, -1);
        }
    });

    // Input checks
    const errors = new Set();
    const inputChecker = (input, check) => () => {
        const errorMsg = check();
        input.title = errorMsg ?? '';
        input.style['border-color'] = errorMsg ? 'red' : null;
        if (errorMsg) errors.add(input); else errors.delete(input);
        saveIcon.style.cursor = (errors.size > 0) ? 'not-allowed' : 'pointer';
    }

    labelText.addEventListener('change', inputChecker(labelText, () => {
        if (labelText.value.trim().length == 0) return 'Label cannot be empty';
    }));
    urlText.addEventListener('change', inputChecker(urlText, () => {
        try {
            const res = executeTemplate(urlText.value, 'console', 'Console Name', 'game').trim();
            if (res.length == 0 || res === 'undefined' || res === 'null') return 'The generated url is empty';
        } catch(e) {
            return 'Invalid template: ' + e.message;
        }
    }));
    consoleIdsText.addEventListener('change', inputChecker(consoleIdsText, () => {
        const value = consoleIdsText.value;
        if (value.trim().length == 0) return '';
        if (!value.split(',').every(e => e.match(/^\s*\d+\s*$/))) return 'Must be a comma-separated list of integers';
    }));
    // technically content update, but must be added after the checker one
    consoleIdsText.addEventListener('change', () => {
        if (consoleIdsText.title.length > 0 || consoleIdsText.value.length == 0) return;
        consoleIdsText.title = consoleIdsText.value.split(',').map(v => consoles[parseInt(v)] ?? '?').join(', ');
    });
    tagsText.addEventListener('change', inputChecker(tagsText, () => {
        const value = tagsText.value.trim().toLowerCase();
        if (value.trim().length == 0) return '';
        if (!value.split(',').every(e => e.match(/^\s*[a-z]+\s*$/))) return 'Must be a comma-separated list of tags';
    }));

    // Actions behavior
    const move = up => () => {
        const index = searchSelect.selectedIndex;
        if (index < 0) return;
        const newIndex = up ? index - 1 : index + 1;
        const searches = Settings.searches;
        if (newIndex < 0 || newIndex >= searches.length) return;
        [searches[newIndex], searches[index]] = [searches[index], searches[newIndex]];
        const op = up ? 'before' : 'after'
        searchSelect.children[newIndex][op](searchSelect.children[index]);
        onPositionChange();
        saveSearches();
    }
    upIcon.addEventListener('click', move(true));
    downIcon.addEventListener('click', move(false));

    resetIcon.addEventListener('click', () => {
        const defaultSearch = DefaultSearches.find(s => s.id === currentSearch.id);
        currentSearch = structuredClone(defaultSearch);
        Settings.searches[searchSelect.selectedIndex] = currentSearch;
        onSearchChange();
        saveSearches();
    });
    addIcon.addEventListener('click', () => {
        currentSearch = {};
        searchSelect.selectedIndex = -1;
        onSearchChange();
    });
    cloneIcon.addEventListener('click', () => {
        currentSearch = structuredClone(currentSearch);
        delete currentSearch.id;
        currentSearch.label += " (copy)";
        searchSelect.selectedIndex = -1;
        onSearchChange();
    });
    const getNewId = () => {
        for (let i = 1;; i++) {
            const id = "custom" + i;
            if (!Settings.searches.some(s => s.id === id)) return id;
        }
    }
    const saveSearch = () => {
        if (errors.size > 0) return;
        currentSearch.label = labelText.value;
        currentSearch.url = urlText.value;
        currentSearch.active = activeCheckbox.checked;
        currentSearch.consoleNames = searchConsoles;
        currentSearch.consoleFilter = {
            type: consoleExclRadio.checked ? 'exclude' : 'include',
            ids: consoleIdsText.value.split(',').filter(s => s.trim().length > 0).map(s => parseInt(s))
        };
        if (currentSearch.consoleFilter.ids.length == 0) {
            delete currentSearch.consoleFilter;
        }
        currentSearch.tagFilter = {
            type: tagsExclRadio.checked ? 'exclude' : 'include',
            tags: tagsText.value.toLowerCase().split(',').filter(s => s.trim().length > 0)
        };
        if (currentSearch.tagFilter.tags.length == 0) {
            delete currentSearch.tagFilter;
        }

        if(currentSearch.id) {
            searchSelect.selectedOptions[0].innerHTML = currentSearch.label;
        } else {
            currentSearch.id = getNewId();
            Settings.searches.push(currentSearch);
            const newOption = newElement('option', searchSelect, null, currentSearch.label);
            newOption.value = currentSearch.id;
            newOption.selected = true;
            setVisible(deleteIcon, true);
        }
        onPositionChange();
        saveSearches();
    };
    saveIcon.addEventListener('click', saveSearch);
    deleteIcon.addEventListener('click', () => {
        Settings.searches.splice(searchSelect.selectedIndex, 1);
        searchSelect.selectedOptions[0].remove();
        saveSearches();
        searchSelect.dispatchEvent(new Event('change'));
    });
}

function gamePage() {
    // Extract infos
    const navpath = document.querySelector('div.navpath');
    if (!navpath) return; // hubs
    const navbarConsoleName = navpath.children[1].innerText.trim().split('/')[0];
    const consoleId = parseInt(navpath.children[1].href.split('=').at(-1));
    if (consoleId == 101) return; // Events
    const gameName = navpath.children[2].innerText.split('|')[0].trim();
    if (!gameName || ! navbarConsoleName || !consoleId) return;
    const tags = [...document.querySelectorAll('h1 span.tag span:first-child')].map(span => span.innerText.trim());
    if (tags.length == 0) tags.push('none');

    const consoleNames = getConsoles();
    const menuConsoleName = consoleNames[consoleId];

    // Add HTML elements
    const listItem = newElement('li', document.querySelector('aside > div.component> ul'), 'flex mb-2');
    const searchLink = newElement('a', listItem, 'btn grow py-2 mr-2');
    newElement('span', searchLink, 'icon icon-md ml-1 mr-3', '🔍');
    searchLink.append('Search:');
    const searchSelect = newElement('select', listItem);
    // Filter search configurations and add <option> elements
    Settings.searches.forEach((search, i) => {
        if (search.active == false) return;
        if (search.consoleFilter) {
            const filter = search.consoleFilter;
            if (filter.ids?.includes(consoleId) == (filter.type === 'exclude')) return;
        }
        if (search.tagFilter) {
            const filter = search.tagFilter;
            const tagMatch = tags.some(tag => filter.tags?.includes(tag.toLowerCase()));
            if (tagMatch == (filter.type === 'exclude')) return;
        }
        const option = document.createElement('option');
        option.value = i;
        option.innerHTML = search.label;
        searchSelect.append(option);
    });

    // Handling the actual search link
    const updateLink = () => {
        const search = Settings.searches[searchSelect.selectedOptions[0].value];
        const consoleName = search.consoleNames?.[consoleId] ?? navbarConsoleName;
        const consoleLongName = search.consoleNames?.[consoleId] ?? menuConsoleName ?? navbarConsoleName;
        searchLink.href = executeTemplate(search.url, consoleName, consoleLongName, gameName);
    }
    updateLink();
    searchSelect.addEventListener('change', updateLink);
}

const urlPathname = window.location.pathname;
const mainMethod = urlPathname.startsWith('/controlpanel.php') ? settingsPage : urlPathname.startsWith('/setRequestList.php') ? setRequestPage : gamePage;
document.addEventListener("DOMContentLoaded", mainMethod);

// ==UserScript==
// @name         RA_CustomizeProfile
// @namespace    RA
// @version      1.4
// @description  Provides a set of options to customize the profile pages
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @match        https://retroachievements.org/controlpanel.php*
// @exclude      https://retroachievements.org/user/*/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// authenticated user
const getCurrentUser = () => document.querySelector('div.dropdown-menu-right div.dropdown-header')?.textContent;
// only works on profile page
const getPageUser = () => document.querySelector('article h1')?.textContent;

// Checks whether the profile page is the user's own profile
function isOwnProfile() {
    const currentUser = getCurrentUser();
    return currentUser && currentUser === getPageUser();
}

function newElement(tagName, parent, className = null, innerHTML = null) {
    const result = document.createElement(tagName);
    parent.append(result);
    if (className) result.className = className;
    if (innerHTML) result.innerHTML = innerHTML;
    return result;
}

// Loads the settings for the given key with default values
function loadSettings(key, defValues) {
    const settings = GM_getValue(key, defValues);
    // to add new properties
    for (const key of Object.keys(defValues)) {
        settings[key] ??= defValues[key];
    }
    return settings;
}

function setVisible(element, visible) {
    const method = visible ? 'remove' : 'add';
    element?.classList[method]('hidden');
}

// Sets the visibility of the table row containing the given element
function setRowVisibility(element, visible) {
    setVisible(element.closest('tr'), visible);
}

const settingsHtml = `<div class="component">
  <h4>Profile page customization</h4>
  <table class="table-highlight"><tbody>
    <tr><th colspan="2"><label><input id="hideMasterProgrActive" type="checkbox"> Hide Mastered Progression Option</label></th></tr>
    <tr><th colspan="2"><label><input id="scrollAwardsActive" type="checkbox"> Scrollable Game Awards</label></th></tr>
    <tr><td>Minimum number of games for showing the scroll bar</td><td><input id="scrollAwardsMinGames" type="number" style="width: 7em;"></td></tr>
    <tr><td>Maximum height of the section with the scroll bar</td><td><input id="scrollAwardsMaxHeight" type="number" min="10" style="width: 7em;"><span title="em: font-size of the element" style="cursor: help;"> em</span></td></tr>
    <tr><td>Thin scrollbar</td><td><input id="scrollAwardsThinBar" type="checkbox"></td></tr>
    <tr><th colspan="2"><label><input id="highlightAwardsActive" type="checkbox"> Highlight Awards Checkboxes</label></th></tr>
    <tr><th colspan="2"><label><input id="progressLinkActive" type="checkbox"> Link Completion Progress to Compare Page</label></th></tr>
  </tbody></table>
  <table class="table-highlight"><tbody>
    <tr><th colspan="2"><label><input id="markUnearnedActive" type="checkbox"> Mark Unearned Badges</label></th></tr>
    <tr><td>Only on own profile</td><td><input id="unEarnedOwnProfile" type="checkbox"></td></tr>
    <tr>
      <td>Put unearned badges first</td>
      <td>
        <label><input type="radio" name="moveUnearned" value="0"> never</label>
        <label><input type="radio" name="moveUnearned" value="1"> own profile</label>
        <label><input type="radio" name="moveUnearned" value="2"> always</label>
      </td>
    </tr>
    <tr>
      <td>Overlay HTML</td>
      <td>
        <label>Load example: <select id="unearnedOverlaySelect" /></label><br>
        <input id="unearnedOverlayText" type="text" style="width: 100%;">
      </td>
    </tr>
  </tbody></table>
</div>`;

const HideMasteredProgress = (() => {
    const DefaultSettings = {
        active: true
    };

    const Settings = loadSettings('hideMasterProgress', DefaultSettings);

    function profilePage() {
        if (!Settings.active) return;
        const completedRows = document.querySelectorAll('#usercompletedgamescomponent tr.completion-progress-completed-row');
        if (completedRows.length == 0) return;
        const hideCompletedCheckbox = document.getElementById('hide-user-completed-sets-checkbox');

        const defaultValue = hideCompletedCheckbox.checked ? 'completed' : 'none';
        let initialValue = GM_getValue('hideProgressType', defaultValue);
        const changeVisibility = value => {
            completedRows.forEach(row => {
                if (value === 'completed' || (value === 'mastered' && row.querySelector('div[title="Mastered"]'))) {
                    row.classList.add('hidden');
                } else {
                    row.classList.remove('hidden');
                }
            })
            GM_setValue('hideProgressType', value);
        };

        const createRadioLabel = value => {
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'hideCheevos';
            input.value = value;
            input.checked = value === initialValue;
            input.addEventListener('change', () => changeVisibility(value));
            const label = document.createElement('label');
            label.append(input, '\n', value, '\n');
            return label;
        };

        changeVisibility(initialValue);

        const span = document.createElement('span');
        span.append('Hide:\n', createRadioLabel('none'), createRadioLabel('mastered'), createRadioLabel('completed'));
        hideCompletedCheckbox.parentElement.replaceWith(span);
    }

    function settingsPage() {
        const activeCheckbox = document.getElementById('hideMasterProgrActive');
        activeCheckbox.checked = Settings.active;
        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('hideMasterProgress', Settings);
        });
    }

    return { profilePage, settingsPage };
})();

const MarkUnearnedAwards = (() => {
    const DefaultOverlays = {
        warningIcon: {
            label: 'Warning icon',
            html: '<span style="position: absolute;top: 0;left: 0;">⚠️</span>'
        },
        redBorder: {
            label: 'Red border',
            html: '<span style="position: absolute;top: -2px;left: -2px;width: 56px;height: 56px;border: 2px solid red;" />'
        },
        redOverlay: {
            label: 'Red foreground',
            html: '<span style="position: absolute;top: 0;left: 0;width: 100%;height: 100%; background-color: red;opacity: 0.4;" />'
        }
    };

    const DefaultSettings = {
        active: true,
        onlyOwnProfile: false,
        fakeBadgesFirst: 1,
        // warning icon
        overlayHTML: DefaultOverlays.warningIcon.html
    };

    const Settings = loadSettings('markUnearnedAwards', DefaultSettings);

    function saveSettings() {
        GM_setValue('markUnearnedAwards', Settings);
    }

    function markFakeBadge(badge) {
        const a = badge.getElementsByTagName('a')[0];
        a.style.position = 'relative';
        const overlay = document.createElement('span');
        a.append(overlay);
        //overlay.outerHTML = '<span style="position: absolute;top: -2px;left: -2px;width: 56px;height: 56px;border: 2px solid red;" />';
        overlay.outerHTML = Settings.overlayHTML;
    }

    function profilePage() {
        if (!Settings.active) return;
        const ownProfile = isOwnProfile();
        if (Settings.onlyOwnProfile && !ownProfile) return;

        const badges = document.querySelectorAll('#gameawards div[data-gameid]');
        if (badges.length == 0) return;

        const masterIds = new Set();
        const completionIds = new Set();
        const inProgressIds = new Set();
        [...document.querySelectorAll('#usercompletedgamescomponent tr')].forEach(row => {
            const id = row.getElementsByTagName('a')[0].href.split('/').at(-1);
            if (row.querySelector('div[title="Mastered"]')) masterIds.add(id);
            else if (row.querySelector('div[title="Completed"]')) completionIds.add(id);
            else inProgressIds.add(id);
        });

        let lastMovedBadge;
        badges.forEach(badge => {
            const id = badge.dataset.gameid;
            const isMaster = badge.getElementsByClassName("goldimage").length > 0;
            if (isMaster) {
                if (masterIds.has(id)) return;
            } else if (completionIds.has(id)) return;
            // special case of demoted sets
            if (!inProgressIds.has(id)) return;

            markFakeBadge(badge);
            if (Settings.fakeBadgesFirst == 0) return;
            if (Settings.fakeBadgesFirst == 1 && !ownProfile) return;
            if (lastMovedBadge) {
                lastMovedBadge.after(badge);
            } else {
                badge.parentElement.insertAdjacentElement('afterbegin', badge);
            }
            lastMovedBadge = badge;
        });
    }

    function settingsPage() {
        const activeCheckbox = document.getElementById('markUnearnedActive');
        activeCheckbox.checked = Settings.active;

        const unearnedOverlaySelect = document.getElementById('unearnedOverlaySelect');
        for (const id of Object.keys(DefaultOverlays)) {
            newElement('option', unearnedOverlaySelect, null, DefaultOverlays[id].label).value=id;
        }
        unearnedOverlaySelect.selectedIndex = -1;

        const ownProfileCheckbox = document.getElementById('unEarnedOwnProfile');
        ownProfileCheckbox.checked = Settings.onlyOwnProfile;
        const overlayText = document.getElementById('unearnedOverlayText');
        overlayText.value = Settings.overlayHTML;
        const moveUnearnedRadios = [...document.querySelectorAll('input[name="moveUnearned"]')];
        moveUnearnedRadios.filter(r => r.value == Settings.fakeBadgesFirst)[0].checked = true;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            setRowVisibility(ownProfileCheckbox, Settings.active);
            setRowVisibility(moveUnearnedRadios[0], Settings.active);
            setRowVisibility(unearnedOverlaySelect, Settings.active);
            setRowVisibility(overlayText, Settings.active);
            saveSettings();
        });
        activeCheckbox.dispatchEvent(new Event('change'));
        unearnedOverlaySelect.addEventListener('change', () => {
            overlayText.value = DefaultOverlays[unearnedOverlaySelect.selectedOptions[0].value].html;
            overlayText.dispatchEvent(new Event('change'));
        });
        ownProfileCheckbox.addEventListener('change', () => {
            Settings.onlyOwnProfile = ownProfileCheckbox.checked;
            saveSettings();
        });
        moveUnearnedRadios.forEach(r => r.addEventListener('change', () => {
            Settings.fakeBadgesFirst = r.value;
            saveSettings();
        }));
        overlayText.addEventListener('change', () => {
            Settings.overlayHTML = overlayText.value;
            saveSettings();
        });
    }

    return { profilePage, settingsPage };
})();

const ScrollAwards = (() => {
    const DefaultSettings = {
        active: true,
        minGameCount:  100,
        maxHeight: 75, // unit: em
        thinScrollbar: false
    };

    const Settings = loadSettings('scrollAwards', DefaultSettings);

    function saveSettings() {
        GM_setValue('scrollAwards', Settings);
    }

    function settingsPage() {
        const activeCheckbox = document.getElementById('scrollAwardsActive');
        activeCheckbox.checked = Settings.active;
        const minGamesInput = document.getElementById('scrollAwardsMinGames');
        minGamesInput.value = Settings.minGameCount;
        const maxHeightInput = document.getElementById('scrollAwardsMaxHeight');
        maxHeightInput.value = Settings.maxHeight;
        const thinScrollBarCheckbox = document.getElementById('scrollAwardsThinBar');
        thinScrollBarCheckbox.checked = Settings.thinScrollbar;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            setRowVisibility(minGamesInput, Settings.active);
            setRowVisibility(maxHeightInput, Settings.active);
            setRowVisibility(thinScrollBarCheckbox, Settings.active);
            saveSettings();
        });
        activeCheckbox.dispatchEvent(new Event('change'));
        minGamesInput.addEventListener('input', () => {
            if (!minGamesInput.reportValidity()) return;
            Settings.minGameCount = parseInt(minGamesInput.value);
            saveSettings();
        });
        maxHeightInput.addEventListener('input', () => {
            if (!maxHeightInput.reportValidity()) return;
            Settings.maxHeight = parseInt(maxHeightInput.value);
            saveSettings();
        });
        thinScrollBarCheckbox.addEventListener('change', () => {
            Settings.thinScrollbar = thinScrollBarCheckbox.checked;
            saveSettings();
        });
    }

    function profilePage() {
        if (!Settings.active) return;
        const awardsDiv = document.querySelector('div#gameawards div.component');
        if (!awardsDiv) return;
        if (awardsDiv.children.length < Settings.minGameCount) return;
        awardsDiv.style['overflow-y'] = 'auto';
        awardsDiv.style['max-height'] = Settings.maxHeight + 'em';
        awardsDiv.style['align-content'] = 'normal';
        if (Settings.thinScrollbar) awardsDiv.style['scrollbar-width'] = 'thin';
        if (window.matchMedia('(min-width: 1280px)').matches) {
            // do nothing anymore
        } else if (window.matchMedia('(min-width: 1024px)').matches) {
            awardsDiv.style.gap = '0.2rem';
        }
    }

    return { profilePage, settingsPage };
})();

const HighlightAwards = (() => {
    const DefaultSettings = {
        active: true
    };

    const Settings = loadSettings('highlightAwards', DefaultSettings);

    function settingsPage() {
        const activeCheckbox = document.getElementById('highlightAwardsActive');
        activeCheckbox.checked = Settings.active;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('highlightAwards', Settings);
        });
    }

    function profilePage() {
        if (!Settings.active) return;
        const awardsDiv = document.querySelector('#gameawards .component');
        if (!awardsDiv) return;

        if (isOwnProfile()) {
            localStorage.awardIds = JSON.stringify([...awardsDiv.children].map(d => parseInt(d.dataset.gameid)));
            return;
        }
        const awardIds = new Set(JSON.parse(localStorage.awardIds ?? '[]'));
        if (awardIds.size == 0) return;

        const newPara = document.createElement('p');
        awardsDiv.before(newPara);
        newPara.outerHTML = `<div class="flex justify-between">
  <span>
    Highlight:
    <label><input id="highlightCommon" type="checkbox"> common</label>
    <label><input id="highlightDiff" type="checkbox"> others</label>
  </span>
  <span id="highlightCount" class="mr-6 hidden"></span>
</div>`;

        const commonCheck = document.getElementById('highlightCommon');
        const diffCheck = document.getElementById('highlightDiff');
        const highlightCountLabel = document.getElementById('highlightCount');

        const highlight = (div, val) => {
            if (val) {
                div.style.removeProperty('opacity');
            } else {
                div.style.opacity = 0.2;
            }
        };

        const refreshHighlight = () => {
            const f = commonCheck.checked ? id => awardIds.has(id) : diffCheck.checked ? id => !awardIds.has(id) : id => true;
            let count = 0;
            [...document.querySelectorAll('#gameawards .component > div')].forEach(d => {
                const gameId = parseInt(d.dataset.gameid);
                const val = f(gameId);
                if (val) count++;
                highlight(d, val);
            });
            highlightCountLabel.innerText = `(${count})`;
            setVisible(highlightCountLabel, commonCheck.checked || diffCheck.checked);
        };

        commonCheck.addEventListener('change', () => {
            diffCheck.checked &&= !commonCheck.checked;
            refreshHighlight();
        });

        diffCheck.addEventListener('change', () => {
            commonCheck.checked &&= !diffCheck.checked;
            refreshHighlight();
        });
    }

    return { profilePage, settingsPage };
})();

const LinkHighScore2Compare = (() => {
    const DefaultSettings = {
        active: true
    };

    const Settings = loadSettings('progressLink', DefaultSettings);

    function settingsPage() {
        const activeCheckbox = document.getElementById('progressLinkActive');
        activeCheckbox.checked = Settings.active;

        activeCheckbox.addEventListener('change', () => {
            Settings.active = activeCheckbox.checked;
            GM_setValue('progressLink', Settings);
        });
    }

    function profilePage() {
        if (!Settings.active) return;
        if (!getCurrentUser()) return; // not authenticated
        const pageUser = getPageUser();
        document.querySelectorAll('#usercompletedgamescomponent tr').forEach(tr => {
            const scoreCell = tr.children.item(1);
            const barDiv = scoreCell.firstElementChild;
            // creating the link
            const gameId = tr.getElementsByTagName('a')[0].href.split('/').at(-1);
            const newLink = document.createElement('a');
            newLink.href = `/user/${pageUser}/game/${gameId}/compare`;
            barDiv.replaceWith(newLink);
            newLink.append(barDiv);
        });
    }

    return { profilePage, settingsPage };
})();

function profilePage() {
    ScrollAwards.profilePage();
    HideMasteredProgress.profilePage();
    MarkUnearnedAwards.profilePage();
    HighlightAwards.profilePage();
    LinkHighScore2Compare.profilePage();
}

function settingsPage() {
    const xpathRes = document.evaluate("//div[h3[text()='Settings']]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const settingsDiv = xpathRes.iterateNext();
    if (!settingsDiv) return;
    const mainDiv = document.createElement('div');
    settingsDiv.insertAdjacentElement('afterend', mainDiv);
    mainDiv.outerHTML = settingsHtml;

    ScrollAwards.settingsPage();
    HideMasteredProgress.settingsPage();
    MarkUnearnedAwards.settingsPage();
    HighlightAwards.settingsPage();
    LinkHighScore2Compare.settingsPage();
}

const urlPathname = window.location.pathname;
const mainMethod = urlPathname.startsWith('/controlpanel.php') ? settingsPage : profilePage;
document.addEventListener("DOMContentLoaded", mainMethod);

// ==UserScript==
// @name         RA_MarkUnearnedAwards
// @namespace    RA
// @version      0.1
// @description  Marks awards which are no longer fully earned after a revision
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
    onlyOwnProfile: false,
    fakeBadgesFirst: 1,
    // warning icon
    overlayHTML: DefaultOverlays.warningIcon.html
};

const Settings = GM_getValue('settings', DefaultSettings);

function saveSettings() {
    GM_setValue('settings', Settings);
}

function markFakeBadge(badge) {
    const a = badge.getElementsByTagName('a')[0];
    a.style.position = 'relative';
    const overlay = document.createElement('span');
    a.append(overlay);
    //overlay.outerHTML = '<span style="position: absolute;top: -2px;left: -2px;width: 56px;height: 56px;border: 2px solid red;" />';
    overlay.outerHTML = Settings.overlayHTML;
}

function isOwnProfile() {
    const currentUserDiv = document.querySelector('div.dropdown-menu-right div.dropdown-header');
    if (currentUserDiv == null) return false;
    const currentUser = currentUserDiv.textContent;
    const pageUserDiv = document.querySelector('div.usersummary h3');
    const pageUser = pageUserDiv.textContent;
    return currentUser === pageUser;
}

function profilePage() {
    const ownProfile = isOwnProfile();
    if (Settings.onlyOwnProfile && !ownProfile) return;

    const gameAwardsDiv = document.getElementById('gameawards');
    if (!gameAwardsDiv) return;
    const badges = gameAwardsDiv.querySelectorAll('#gameawards div[data-gameid]');
    if (badges.length == 0) return;

    const masterIds = new Set();
    const completionIds = new Set();
    const completedRows = [...document.querySelectorAll('#usercompletedgamescomponent tr.completion-progress-completed-row')];
    completedRows.forEach(row => {
        const id = row.getElementsByTagName('a')[0].href.split('/').at(-1);
        if (row.getElementsByClassName('mastered').length > 0) masterIds.add(id);
        else completionIds.add(id);
    });

    let lastMovedBadge;
    badges.forEach(badge => {
        const id = badge.dataset.gameid;
        const isMaster = badge.getElementsByClassName("goldimage").length > 0;
        if (isMaster) {
            if (masterIds.has(id)) return;
        } else if (completionIds.has(id)) return;

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

function newElement(tagName, parent, className = null, innerHTML = null) {
    const result = document.createElement(tagName);
    parent.append(result);
    if (className != null) result.className = className;
    if (innerHTML != null) result.innerHTML = innerHTML;
    return result;
}

const settingsDivHtml = `<div class="component">
  <h4>Mark Unearned Badges</h4>
  <table class="table-highlight"><tbody>
    <tr><td>Only on own profile</td><td style="text-align: right;"><input id="unEarnedOwnProfile" type="checkbox"></td></tr>
    <tr>
      <td>Put unearned badges first</td>
      <td style="text-align: right;">
        <label><input type="radio" name="moveUnearned" value="0"> never</label>
        <label><input type="radio" name="moveUnearned" value="1"> own profile</label>
        <label><input type="radio" name="moveUnearned" value="2"> always</label>
      </td>
    </tr>
    <tr>
      <td>Overlay HTML</td>
      <td style="text-align: right;">
        <label>Load default: <select id="unearnedOverlaySelect"></select></label><br>
        <input id="unearnedOverlayText" type="text" style="width: 100%;">
      </td>
    </tr>
  </tbody></table>
</div>`

function settingsPage() {
    const xpathRes = document.evaluate("//div[h3[text()='Settings']]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    const settingsDiv = xpathRes.iterateNext();
    if (settingsDiv == null) return;

    const mainDiv = document.createElement('div');
    settingsDiv.insertAdjacentElement('afterend', mainDiv);
    mainDiv.outerHTML = settingsDivHtml;

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

const urlPathname = window.location.pathname;
const mainMethod = urlPathname.startsWith('/controlpanel.php') ? settingsPage : profilePage;
document.addEventListener("DOMContentLoaded", mainMethod);

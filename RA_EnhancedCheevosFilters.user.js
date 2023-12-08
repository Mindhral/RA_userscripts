// ==UserScript==
// @name         RA_EnhancedCheevosFilters
// @namespace    RA
// @version      0.6
// @description  Allows to hide achievements unlocked in hardcore only, or with missable tag
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/game/*
// @run-at       document-start
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// ==/UserScript==

function getElementByXpath(root, xpath) {
  return document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function gamePage() {
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

document.addEventListener("DOMContentLoaded", gamePage);

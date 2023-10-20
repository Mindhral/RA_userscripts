// ==UserScript==
// @name         RA_EnhancedCheevosFilters
// @namespace    RA
// @version      0.3
// @description  Allows to hide achievements unlocked in hardcore only, or with missable tag
// @author       Mindhral
// @match        https://retroachievements.org/game/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

const Settings = {
    replaceHideCompletedCheckbox: false,
    addMissableFilter: true
};

(function() {
    const achievementsList = document.querySelector('#achievement ul')
    if (achievementsList == null) return
    const allRows = achievementsList.querySelectorAll('li')
    if (allRows.length == 0) return
    const filterDiv = achievementsList.previousElementSibling.firstElementChild
    filterDiv.classList.add('grid', 'gap-y-1')

    const visibilityFunctions = []
    const checkVisibilities = () => {
        const isVisible = row => {
            for (let funct of visibilityFunctions) {
                if (!funct(row)) return false
            }
            return true
        }

        const checkVisibility = row => {
            if (isVisible(row)) {
                row.classList.remove('hidden')
            } else {
                row.classList.add('hidden')
            }
        }
        allRows.forEach(checkVisibility)
    }

    // Add unlock filter radios
    (function() {
        if (!Settings.replaceHideCompletedCheckbox) return
        const initialValue = 'none'
        const checkbox = filterDiv.querySelector("input[type='checkbox']")
        if (checkbox == null) return

        let currentFilter
        visibilityFunctions.push(row => currentFilter(row))
        const createUnlockRadioLabel = (value, filter) => {
            const input = document.createElement('input')
            input.type = 'radio'
            input.name = 'hideCheevos'
            input.value = value
            if (value === initialValue) {
                input.checked = true
                currentFilter = filter
            }
            input.addEventListener('change', () => {
                currentFilter = filter
                checkVisibilities()
            })
            const label = document.createElement('label')
            label.append(input, '\n', value, '\n')
            return label
        }

        const unlockedSpan = document.createElement('span')
        unlockedSpan.append('Hide:\n',
                            createUnlockRadioLabel('unlocked', row => !row.classList.contains('unlocked-row')),
                            createUnlockRadioLabel('hardcore', row => row.getElementsByClassName('goldimagebig').length == 0),
                            createUnlockRadioLabel('none', row => true))
        const parentDiv = checkbox.parentElement.parentElement
        parentDiv.replaceWith(unlockedSpan)
    })();

    // Add missable filter checkbox
    (function() {
        if (!Settings.addMissableFilter) return
        if (achievementsList.querySelector('span.missable') == null) return

        const createCheckboxLabel = (labelTxt, checked, rowFilter) => {
            const input = document.createElement('input')
            input.type = 'checkbox'
            input.checked = checked
            visibilityFunctions.push(row => {
                return !input.checked || rowFilter(row)
            })
            input.addEventListener('change', checkVisibilities)
            const label = document.createElement('label')
            label.append(input, '\n', labelTxt, '\n')
            return label
        }
        const missableSpan = document.createElement('span')
        missableSpan.append('Flag:\n', createCheckboxLabel("Missable", false, row => row.querySelector('span.missable') != null));

        filterDiv.append(missableSpan)
    })();
})();
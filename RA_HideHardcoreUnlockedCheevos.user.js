// ==UserScript==
// @name         RA_HideHardcoreUnlockedCheevos
// @namespace    RA
// @version      0.1
// @description  Allows to hide achievements unlocked in hardcore only.
// @author       Mindhral
// @match        https://retroachievements.org/game/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

(function() {
    const checkbox = document.querySelector("input[type='checkbox']")
    if (checkbox == null) return

    const unlockedItems = [...document.getElementsByClassName('unlocked-row')]
    if (unlockedItems.length == 0) return

    const changeVisibility = value => {
        unlockedItems.forEach(row => {
            if (value === 'unlocked' || (value === 'hardcore' && row.getElementsByClassName('goldimagebig').length > 0)) {
                row.classList.add('hidden')
            } else {
                row.classList.remove('hidden')
            }
        })
    }

    const createRadioLabel = (value, checked) => {
        const input = document.createElement('input')
        input.type = 'radio'
        input.name = 'hideCheevos'
        input.value = value
        input.checked = checked
        input.addEventListener('change', () => changeVisibility(value))
        const label = document.createElement('label')
        label.append(input, '\n', value, '\n')
        return label
    }

    const span = document.createElement('span')
    span.append('Hide:\n', createRadioLabel('unlocked', false), createRadioLabel('hardcore', false), createRadioLabel('none', true))
    const parentDiv = checkbox.parentElement.parentElement
    parentDiv.replaceWith(span)
})();
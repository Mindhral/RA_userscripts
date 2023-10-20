// ==UserScript==
// @name         RA_HideMasteredSets
// @namespace    RA
// @version      0.2
// @description  Allows to hide mastered sets only on user profiles.
// @author       Mindhral
// @match        https://retroachievements.org/user/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    const hideCompletedCheckbox = document.getElementById('hide-user-completed-sets-checkbox');
    if (hideCompletedCheckbox == null) return;

    const completedRows = document.querySelectorAll('#usercompletedgamescomponent tr.completion-progress-completed-row');
    if (completedRows.length == 0) return;

    const defaultValue = hideCompletedCheckbox.checked ? 'completed' : 'none';
    let initialValue = GM_getValue('HideUserSetsType', defaultValue);

    const changeVisibility = value => {
        completedRows.forEach(row => {
            if (value === 'completed' || (value === 'mastered' && row.getElementsByClassName('mastered').length > 0)) {
                row.classList.add('hidden');
            } else {
                row.classList.remove('hidden');
            }
        })
        GM_setValue('HideUserSetsType', value);
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
    const parentLabel = hideCompletedCheckbox.parentElement;
    parentLabel.replaceWith(span);
})();
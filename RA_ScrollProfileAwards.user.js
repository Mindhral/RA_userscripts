// ==UserScript==
// @name         RA_ScrollProfileAwards
// @namespace    RA
// @version      0.1
// @description  Set a max height for the game award section on profile pages, and a scroll bar if necessary
// @author       Mindhral
// @match        https://retroachievements.org/user/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

const Settings = {
    maxHeight: '75em'
};

(function() {
    const awardsDiv = document.querySelector('div#gameawards div.component')
    awardsDiv.style['overflow-y'] = 'auto'
    awardsDiv.style['max-height'] = Settings.maxHeight
    awardsDiv.style['padding-left'] = '0.75rem'
    awardsDiv.style['padding-right'] = '0.75rem'
})();
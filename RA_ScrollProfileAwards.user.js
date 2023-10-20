// ==UserScript==
// @name         RA_ScrollProfileAwards
// @namespace    RA
// @version      0.2
// @description  Set a max height for the game award section on profile pages, and a scroll bar if necessary
// @author       Mindhral
// @homepage     https://github.com/Mindhral/RA_userscripts
// @match        https://retroachievements.org/user/*
// @run-at       document-end
// @icon         https://static.retroachievements.org/assets/images/favicon.webp
// @grant        none
// ==/UserScript==

const Settings = {
    maxHeight: '75em',
    minGameCount: 100
};

(function() {
    const awardsDiv = document.querySelector('div#gameawards div.component');
    if (awardsDiv.children.length < Settings.minGameCount) return;
    awardsDiv.style['overflow-y'] = 'auto';
    awardsDiv.style['max-height'] = Settings.maxHeight;
    awardsDiv.style['padding-left'] = '0.75rem';
    awardsDiv.style['padding-right'] = '0.75rem';
})();
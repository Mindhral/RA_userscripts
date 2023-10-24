# RA_userscripts

These are user scripts for Retroachievements web site, providing new or modified features.

They were made with [Tampermonkey](https://www.tampermonkey.net/), but may work with equivalents such as [Greasemonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/) or [ViolentMonkey](https://violentmonkey.github.io/) (not tested).
To use them, install the extension, then open the raw file from this repository, which should open it in the extension and ask if you want to install it. Update should be automatic should there be new versions in the future (if it is not disabled in the extension's parameters).

The scripts were developed on Firefox for Windows, but also tested on Firefox for Android (on a tablet) and Edge for Windows.
Each script is made for the version of the site which is online at the time of the script's release. Any future update of the site may render them inoperant or useless. Should it happen, I will try to maintain this repository by updating or deleting the scripts in question if my schedule allows it.
> [!NOTE]
> The developers of Retroachievements web site don't have any responsibility to theses scripts nor obligation to maintain compatibility with them.

## RA_HideMasteredSets

It's possible to filter completed sets in the *Completion Progress* section on profile page. This script adds a possibility to only filter mastered sets while keeping completed sets (at least partially in softcore).

![none](/assets/HideMasteredSets_none.png) ![mastered](/assets/HideMasteredSets_mastered.png) ![completed](/assets/HideMasteredSets_completed.png)

## RA_EnhancedCheevosFilters

Adds some filters for achievements on a game page.

1. Hide achievements unlocked in hardcore only

![hide none](/assets/EnhancedCheevosFilters_hide_none.png)

![hide hardcore](/assets/EnhancedCheevosFilters_hide_hardcore.png)

![hide unlocked](/assets/EnhancedCheevosFilters_hide_unlocked.png)

2. Filter achievements with a missable tag [m]

![filter missable](/assets/EnhancedCheevosFilters_missable.png)

Either of these changes can be deactivated with a corresponding boolean at the begining of the script.

## RA_EnhancedCheevosSort

Modifies the sorting of achievements on a game page.

1. The sorting is done on client side, without any additional request to the server. It is faster, and removes some load on the server.

2. Adds sort by "Won by (hardcore)" and by RetroPoints

![main sorts](/assets/EnhancedCheevosSort_main_sorts.png)

3. Adds options for unlocks grouping
   1. put unlocked achievements at the end

   ![group last](/assets/EnhancedCheevosSort_group_last.png)

   2. separate all unlocks in one group (current behavior of the web site)

   ![group unlocks](/assets/EnhancedCheevosSort_group_unlocks.png)

   3. only separate hardcore unlocks (with *Normal* sort, softcore unlocks and locked achievements stay separated from each other, so this only have an effect with "last" option active)

   ![group hardcore](/assets/EnhancedCheevosSort_group_HC.png)

   4. separate hardcore and softcore in 2 different groups

   ![group hardcore, softcore](/assets/EnhancedCheevosSort_group_HCSC.png)

   5. no unlock grouping (not available in normal sort, as the info is not available in HTML code)

   ![group none](/assets/EnhancedCheevosSort_group_none.png)

4. Save current sorting parameters as default. This is saved in script storage, locally (synchronization of this storage doesn't seem to work in Tampermonkey at the moment).

![grouping save](/assets/EnhancedCheevosSort_save.png)

## RA_ScrollProfileAwards

If the number of badges in the *Game Awards* section of profile page exceeds a certain number, this script adds a scroll bar to that section.
This makes it easier to scroll to the next sections, and combined with lazy loading allows to download less images from server as long as the section is not scrolled down.

![awards without scroll](/assets/ScrollProfileAwards_without.png) ![awards with scroll bar](/assets/ScrollProfileAwards_with.png)

Events and site awards are not affected.

The number of badges and the height which trigger the scroll bar apparition can be changed in a dedicated section on *Settings* page[^1].

![scroll bar settings](/assets/ScrollProfileAwards_settings.png)

## RA_HideProfileAchievementsBadges

On profile page, in *Last [n] games played* section, if a game has more than 48 badges (3 lines in wide layout), this scripts only shows the first 32 badges (2 lines) and adds a button to show the others.

![some badges hidden and button displayed](/assets/HideProfileAchievementsBadges_button.png) ![all badges displayed](/assets/HideProfileAchievementsBadges_clicked.png)

Both numbers of badges can be adjusted in a dedicated section on *Settings* page[^1].

![hide achievements badges settings](/assets/HideProfileAchievementsBadges_settings.png)

## RA_LinkUnofficalAchievements

Adds a link on game page to view the unofficial achievements for the game, if any. This reloads the page. The link is displayed whether there are unofficial achievements or not.

![link to unofficial achievements](/assets/LinkUnofficalAchievements_link.png)

## RA_progress2JSON

Adds clickable icons on top of the *Completion Progress* section of profile page, which compiles the completion data in JSON format and respectively copy it to clipboard or open it in a new tab.

![progress2JSON icons](/assets/progress2JSON_icons.png)

````
{"2":{"NumAch":22,"Earned":22,"HCEarned":22},"62":{"NumAch":31,"Earned":3,"HCEarned":3},...}
````
The items keys are game ids.

This can be useful in combination with some script or program which can use this data to display it or integrate it in other metadata, especially while the public API is unavailable.

Opening a new tab with the data doesn't seem to work in Microsoft Edge at least.

[^1]: Unless synchronization of scripts storage is added to Tampermonkey, these parameters are local.
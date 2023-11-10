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

Either of these changes can be deactivated with a corresponding checkbox in a dedicated section on *Settings* page[^1].

![enhanced filters settings](/assets/EnhancedCheevosFilters_settings.png)

## RA_EnhancedCheevosSort

Modifies the sorting of achievements on a game page.

1. The sorting is done on client side, without any additional request to the server. It is faster, and removes some load on the server.

2. Adds sort by "Won by (hardcore)", RetroPoints and "Unlock date". For the last one, normal sort is used for locked achievements.

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

## RA_GameListTagFilter

Adds a filter on games titles tags on game list pages: console hubs, *All Games*, *Want to Play*, *Claim List*, *Most Requested*, *Hardest Games*.

![n64 demo filter](/assets/GameListTagFilter_n64_demo.png)

The filter is applied on the games already displayed, so the behavior is different from what could be expected from a filter executed on server when there is pagination:

![claim homebrew page 1](/assets/GameListTagFilter_claim_homebrew.png)

This script should be compatible with *RA_colorMarkGames*.

## RA_EnhancedHubSort

Modifies the sorting of entries on a Hub page and adds some filtering.

![hub sort](/assets/EnhancedHubSort.png)

1. The sorting is done on client side.

2. Adds sort by *Points* and by *Title*. *Original* restores the order from when the page was loaded. If used in combination with *RA_colorMarkGames*, the order produced by that script is used.

3. Adds *Random* sort (shuffle). Using the *desc.* checkbox is a way to re-shuffle in one click.

4. Possibility to always put hubs at the end, regardless of the sorting option.

5. Filtering by console (including the special value *Hubs*), tag (*&lt;none&gt;* for entries without tags) or status (with/without achievements).

6. Adds the missing columns on hubs rows, which fixes the alternating colors on the right side.

## RA_ReorderAwardsHelper

Allows to do some automatic sorting on *Reorder Site Awards* page.

1. Sorts all awards by title or unlock date, or reset to initial order (from when the page was loaded). Select the order then click either *Asc* or *Desc* for ascending or descending order. *Random* sort allows to shuffle the list.

![sort by list](/assets/ReorderAwardsHelper_sortby.png)

2. Put all games with a master award or a certain tag (Subset, Hack, ...) either at the beginning or at the end. Select *Mastered* or the wanted tag (*&lt;untagged&gt;* for all games without any tag), then click *First* or *Last*. Select *tags...* to be allowed to select multiple tags in a new list (use Shift or Ctrl keys while selecting). Games wich are moved are kept in the same order.

![move awards group](/assets/ReorderAwardsHelper_groups.png) ![move awards group](/assets/ReorderAwardsHelper_tags_multi.png)

To use a multi-criteria sorting, apply the different options in "reverse order". For example, to obtain the following result, where each section is ordered by title:

![sort awards example](/assets/ReorderAwardsHelper_example.png)

1. Select sort by *Title*, then click *Asc*
2. Select *tags...*, then *Homebrew*, *Prototype* and *Unlicensed*, and click *Last*
3. Select *Hacks* and click *Last*
4. Select *Mastered* and click *First*

The changes are not saved; the corresponding button must still be clicked for that.

Only affects the *Game Awards* section.

## RA_ScrollProfileAwards

If the number of badges in the *Game Awards* section of profile page exceeds a certain number, this script adds a scroll bar to that section.
This makes it easier to scroll to the next sections, and combined with lazy loading allows to download less images from server as long as the section is not scrolled down.

![awards without scroll](/assets/ScrollProfileAwards_without.png) ![awards with scroll bar](/assets/ScrollProfileAwards_with.png)

Events and site awards are not affected.

The number of badges and the height which trigger the scroll bar apparition can be changed in a dedicated section on *Settings* page[^1].

![scroll bar settings](/assets/ScrollProfileAwards_settings.png)

## RA_HideProfileAchievementsBadges

On profile page, in *Last [n] games played* section, if a game has more than 48 badges (3 lines in wide layout), this scripts only shows the first 32 badges (2 lines) and adds a button to show the others.
A transparency gradient is set on the last 16 badges (last line).

![some badges hidden and button displayed](/assets/HideProfileAchievementsBadges_button.png) ![all badges displayed](/assets/HideProfileAchievementsBadges_clicked.png)

All 3 numbers of badges can be adjusted in a dedicated section on *Settings* page[^1].

![hide achievements badges settings](/assets/HideProfileAchievementsBadges_settings.png)

## RA_LinkUnofficalAchievements

Adds a link on game page to view the unofficial achievements for the game, if any. This reloads the page. The link is displayed whether there are unofficial achievements or not.

![link to unofficial achievements](/assets/LinkUnofficalAchievements_link.png)

## RA_progress2JSON

Adds clickable icons on top of the *Completion Progress* section of profile page, which compiles the completion data in JSON format and respectively open it in a new tab and copy it to clipboard.

![progress2JSON icons](/assets/progress2JSON_icons.png)

````
{"2":{"NumAch":22,"Earned":22,"HCEarned":22},"62":{"NumAch":31,"Earned":3,"HCEarned":3},...}
````
The items keys are game ids.

This can be useful in combination with some script or program which can use this data to display it or integrate it in other metadata, especially while the public API is unavailable.

Opening a new tab with the data doesn't seem to work in Microsoft Edge at least.

## RA_Played2CSV

Adds clickable icons on top of the *Completion Progress* section of profile page, which compiles data on played games in CSV format and respectively open it in a new tab and copy it to clipboard.

![Played2CSV icons](/assets/Played2CSV_icons.png)

````
id,title,tags,console,hcUnlocked,scUnlocked,total,status,unlock date
2,Aladdin,,Mega Drive,22,22,22,Mastered,22/02/2022 22:28:00
11458,Super Mario 64 [Subset - Bonus],Subset,Nintendo 64,47,48,48,Completed,08/11/2022 17:19:00
22509,Super Mario Senseless Delirium,Hack,Nintendo 64,6,14,100,
````
Entries are sorted by game id so that the order is consistent between two exports.
The field separator and the new line separator can be changed at the beginning of the script.
The date should be formatted according to the browser's locale.

[^1]: Unless synchronization of scripts storage is added to Tampermonkey, these parameters are local.
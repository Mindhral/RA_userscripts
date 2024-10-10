# RA_userscripts

These are user scripts for Retroachievements web site, providing new or modified features.

They were made with [Tampermonkey](https://www.tampermonkey.net/), but may work with equivalents such as [Greasemonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/) or [ViolentMonkey](https://violentmonkey.github.io/) (not tested).
To use them, install the extension, then open the raw file from this repository, which should open it in the extension and ask if you want to install it. Update should be automatic should there be new versions in the future (if it is not disabled in the extension's parameters).

The scripts were developed on Firefox for Windows, but also tested on Firefox for Android (on a tablet) and Edge for Windows.
Each script is made for the version of the site which is online at the time of the script's release. Any future update of the site may render them inoperant or useless. Should it happen, I will try to maintain this repository by updating or deleting the scripts in question if my schedule allows it.
> [!NOTE]
> The developers of Retroachievements web site don't have any responsibility to theses scripts nor obligation to maintain compatibility with them.

## RA_CustomizeProfile

Allows for some customization on *Profile* page, all of which can be deactivated on *Settings* page.

![Customize profile settings](/assets/CustomizeProfile_settings.png)

The first 2 features correspond to former scripts *HideMasteredSets* and *ScrollProfileAwards*. These can be removed before this one is installed.

### Hide Mastered Progression Option

It's possible to filter completed sets in the *Completion Progress* section on profile page. This feature adds a possibility to only filter mastered sets while keeping completed sets (at least partially in softcore).

![none](/assets/HideMasteredSets_none.png) ![mastered](/assets/HideMasteredSets_mastered.png) ![completed](/assets/HideMasteredSets_completed.png)

### Scrollable Game Awards

If the number of badges in the *Game Awards* section of profile page exceeds a certain number, this feature adds a scroll bar to that section.
This makes it easier to scroll to the next sections, and combined with lazy loading allows to download less images from server as long as the section is not scrolled down.

![awards without scroll](/assets/ScrollProfileAwards_without.png) ![awards with scroll bar](/assets/ScrollProfileAwards_with.png)

Events and site awards are not affected.

The number of badges and the height which trigger the scroll bar apparition can be changed on *Settings* page[^1]. A third settings allows to use a thin scrollbar, similar to the one used on mobile displays, on desktop browsers. The thin scrollbar is not supported on all browsers and can be harder to use with the mouse which is why it's inactive by default.

![scroll bar settings](/assets/ScrollProfileAwards_settings.png)

### Highlight Awards Checkboxes

Adds checkboxes in the *Game Awards* section of other users profile page to highlight awards that you have in common or the ones that you don't have. Your own profile needs to be visited first to gather the data.

This feature doesn't differentiate between mastery and completion badges.

![Highlight Awards - all](/assets/HighlightAwards_all.png) ![Highlight Awards - common](/assets/HighlightAwards_common.png) ![Highlight Awards - others](/assets/HighlightAwards_others.png)

### Link Completion Progress to Compare Page

Adds links to *Compare Unlocks* page on the progress bars from the *Completion Progress* section.

![completion progress links](/assets/CustomizeProfile_progressLinks.png)

### Mark Unearned Badges

When achievements are added by a revision to a game previously mastered or completed, the mastery (or completion) status is lost on the game page, but the badge remains. These games can now be found on the *Completion Progress* page, using the filter *Games with awards for revised sets*.

This feature allows to also highlight these badges in the *Game Award* section, with a customizable marker.

![Mark unearned awards](/assets/MarkUnearned_awards.png)

The settings allows to:

![Mark unearned settings](/assets/MarkUnearned_settings.png)

1. Restrict the behavior to the authenticated user's profile
2. Move the marked badges to the beginning of the list (for the current user only or for everyone)
3. Specify the HTML code of the marker. Three examples are given and can be loaded then tweaked (position, size, color...), or a brand new code can be used if you know what you are doing.

| ![Warning icon](/assets/MarkUnearned_marker_warning.png) | ![Red border](/assets/MarkUnearned_marker_border.png) | ![Red foreground](/assets/MarkUnearned_marker_foreground.png) |
| ------------ | ---------- | -------------- |
| Warning icon | Red border | Red foreground |

## RA_CustomCheevosList

Allows for some customization on the achievements list from *Game* page, all of which can be deactivated on *Settings* page.

![Customize profile settings](/assets/CustomCheevosList_settings.png)

The first 3 features correspond to former scripts *EnhancedCheevosSort*, *EnhancedCheevosFilters* and *LinkUnofficalAchievements*. These can be removed before this one is installed.

### Enhanced Sort Options

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

### Hardcore Unlocks Filter

Replaces the filter which hides unlocked achievements on a game page by a filter which allows to choose to hide all unlocked achievements or just the ones unlocked in hardcore.

![hide none](/assets/EnhancedCheevosFilters_hide_none.png)

![hide hardcore](/assets/EnhancedCheevosFilters_hide_hardcore.png)

![hide unlocked](/assets/EnhancedCheevosFilters_hide_unlocked.png)

### Author Filter

On sets with multiple authors, this makes the counter for each author clickable, to filter the achievements they created.

> [!WARNING]
> This requires a web API call (which is only done when you click on a counter for the first time after the page load).
> In order to do that, the scripts stores your API Key in its own local storage when you enable the feature in the settings.
> This storage should be isolated from other sites, extensions, and scripts, but can be read by someone with access to your OS profile's data and a bit of technical knowledge.

![hide unlocked](/assets/CustomCheevosList_authorFilter.png)

### Beaten Game Credit Filter

Adds a filter on *Beaten Game Credit* widgets to only show remaining achievements (not unlocked). If some achievements were unlocked in both modes (softcore and hardcore), a checkbox is available to only hide achievements obtained in hardcore.

![beaten game credit filter none](/assets/BeatenGameFilter_none.png) ![beaten game credit filter remaining](/assets/BeatenGameFilter_remaining.png) ![beaten game credit filter remaining hardcore](/assets/BeatenGameFilter_remaining_hc.png)

### Compare Unlocks Filter

Adds a filter to Compare Unlocks page to hide achievements rows depending on their status (locked, unlocked in any mode, unlocked in hardcore) for both players:

![compare unlocks status filter](/assets/CompareUnlocksFilter_status.png)

The last selected value is remembered.

### Link Unofficial Achievements

Adds a link on game page to view the unofficial achievements for the game, if any. This reloads the page. The link is displayed whether there are unofficial achievements or not.

![link to unofficial achievements](/assets/LinkUnofficalAchievements_link.png)

### Links to User's History

Replaces the dates on achievements unlocks by links to the user's history for that date.

![history links](/assets/CustomCheevosList_historyLinks.png)

The style of the link can be edited in the settings.

![history links settings](/assets/CustomCheevosList_historyLinks_settings.png) ![history links style example](/assets/CustomCheevosList_historyLinks_style.png)

### Link High Scores to Compare Page

Adds links to *Compare Unlocks* page on the scores from the *Most Points Earned* or the dates from the *Latest Masters" section.

![high scores links](/assets/CustomCheevosList_highScoresLinks.png) ![high scores links](/assets/CustomCheevosList_highScoresLinks2.png)

### Collapse Achievements List

Adds a collapse button above the achievements list, allowing to get faster to the following sections.

![achievements list not collapsed](/assets/CollapseCheevosList_no.png)

![achievements list collapsed](/assets/CollapseCheevosList_yes.png)

A setting allows to choose whether to collapse the list on page load or not (never, always, remember the last state).

### Custom Unlock Counts

Allows to change the display of unlock count and rate for achievements on a game page.

![custom unlock counts settings](/assets/CustomUnlockCounts_settings.png)

3 options are available:
- displaying the hardcore values only (the values combining hardcore and softcore are still available by mouseover on the progress bar)
- displaying the total (hardcore+softcore) only (hardcore values on mouseover on the progress bar)
- displaying both in parallel

| ![hardcore unlocks](/assets/CustomUnlockCounts_hardcore.png) | ![total unlocks](/assets/CustomUnlockCounts_total.png) | ![both unlock types](/assets/CustomUnlockCounts_both.png) |
| -------- | -------- | -------- |
| Hardcore |  Total   |   Both   |

Hardcore data uses the hardcore unlocks, but also the hardcore players count as total (players having at least one hardcore unlock on the set). For subsets, this behavior is different than the normal one (for total values), which uses the player count for the game. They are a bit longer than the rest to display, as they wait for the data to be available in the distribution chart.

Progress bars are not modified (except for the mouseover text), and the achievements page is not supported by this feature at the moment.

### Custom Locked Badges

Allows to replace black and white version of locked achievement badges by the colored version, or by a generic spoiler-free one. It works on the achievements list on a game page, the *Beaten Game Credit* pop-up on the same page, and on the achievement page.

Optionally, the badge can be replaced by the colored version or the black and white version on mouseover.

Both behaviors can be selected on settings page. Some combinations are disabled, as they would not make sense or would be redundant.

![Custom locked badge settings](/assets/CustomLocked_settings.png)

### Custom Leaderboards Scrolling

Modifies the scrolling of the leaderboards list found on a game, achievement or leaderboard pages.

![custom leaderboards scrolling settings](/assets/CustomLBScroll_settings.png)

1. The maximum height of the list can be changed with 2 parameters: one for game pages, and one for achievement and leaderboard pages.
2. A thin scrollbar can be used instead of the default one. See [Scrollable Game Awards](#scrollable-game-awards) for more information on thin scrollbars.
3. On a leaderboard page, the current leaderboard is highlighted in the list.

![custom leaderboards scrolling highlight](/assets/CustomLBScroll_highlight.png)

4. On a leaderboard page, a parameter allows to scroll to the current leaderboard on page load.

## RA_GameListTagFilter

Adds a filter on games titles tags on some list pages: *All Games*, *Claim List*, *Most Requested*, *Hardest Games*.

![n64 demo filter](/assets/GameListTagFilter_single_page.png)

The filter is applied on the games already displayed, so the behavior is different from what could be expected from a filter executed on server when there is pagination:

![claim homebrew page 1](/assets/GameListTagFilter_pagination.png)

This script should be compatible with *RA_colorMarkGames*.

## RA_GameListRandom

On game list pages (*Want to play*, *All games*), adds a button to shuffle the list if it's single page or one to select a random game if it's paginated.

Single page shuffle (*Want to play* with 50 games or less):

![console shuffle](/assets/GameListRandom_toplay_shuffle.png)

When there is pagination (*All games*, *Want to play* with more than 50 games), the *Random game* button chooses an entry, goes to its page if necessary, and isolates it:

![console random](/assets/GameListRandom_toplay_random.png)

Once a game is selected, one can either redraw using the same button or display all the games on the current page again:

![console selected](/assets/GameListRandom_toplay_selected.png)

This script and [RA_GameListTagFilter](#ra_gamelisttagfilter) can coexist, but using both of them at the same time will result in the second one being used "winning" and the first one getting ignored.

## RA_EnhancedHubSort

Modifies the sorting of entries on a Hub page (including consoles games lists) and adds some filtering.

![hub sort](/assets/EnhancedHubSort.png)

1. The sorting and filtering are done on client side, except:
   - grouping by console
   - requesting all achievements if they are not loaded initially

2. New Sorting options:
   1. Adds the possibility to reverse all sorts
   2. Differentiates sorts by *Most hardcore progress* and by *Most progress* (softcore + hardcore). *Original* restores the order from when the page was loaded. If used in combination with *RA_colorMarkGames*, the order produced by that script is used.
   3. Adds *Random* sort (shuffle). Using the *Reverse* checkbox is a way to re-shuffle in one click.

3. Filtering by console and tag:
   1. *&lt;none&gt;* for entries without tags
   
   2. *Multiple* allows to select several tags with Ctrl+click or Shift+click
   
   ![hub filter with multiple tags](/assets/EnhancedHubSort_multiple_tags.png)
   
   3. Possibility to create console groups on the *Settings* page, to filter several systems at the same time.
   
   ![hub sort with status](/assets/EnhancedHubSort_settings_groups.png)
   
   ![hub sort with status](/assets/EnhancedHubSort_console_group.png)

4. The filtering for games with or without achievement and the filtering by progress status are regrouped in a single filter composed of two drop-down lists: one for what we want to keep and one for what we want to exclude.
   
   | ![hub sort with status](/assets/EnhancedHubSort_status_with.png) | ![hub sort without status](/assets/EnhancedHubSort_status_without.png) |
   | --- | --- |
   
   All options have a mouse-over help text to make them clearer.

5. Possibility to show only games which are in the *Want to Play* list

6. The game count is updated when filtering (and added is absent)

7. Possibility to save the sort and filter options for the current page or for the category (hubs, consoles or developer sets).
   
   ![hub sort with status](/assets/EnhancedHubSort_save.png)
   
   All filters for a category (default and page specific) can be deleted with a button on the *Settings* page.
   
   ![hub sort with status](/assets/EnhancedHubSort_settings_reset.png)

## RA_ReorderAwardsHelper

Allows to do some automatic sorting on *Reorder Site Awards* page.

1. Sorts all awards by title or unlock date, or reset to initial order (from when the page was loaded). Select the order then click either *Asc* or *Desc* for ascending or descending order. *Random* sort allows to shuffle the list.

![sort by list](/assets/ReorderAwardsHelper_sortby.png)

2. Put all games with a master award or a certain tag (Subset, Hack, ...) either at the beginning or at the end. Select *Mastered* or the wanted tag (*&lt;untagged&gt;* for all games without any tag), then click *First* or *Last*. Select *tags...* to be allowed to select multiple tags in a new list (use Shift or Ctrl keys while selecting). Games wich are moved are kept in the same order.

![move awards group](/assets/ReorderAwardsHelper_groups.png) ![move awards group](/assets/ReorderAwardsHelper_tags_multi.png)

3. Select or unselect all raws for the *Hide* feature with the checkbox next to the corresponding header

To use a multi-criteria sorting, apply the different options in "reverse order". For example, to obtain the following result, where each section is ordered by title:

![sort awards example](/assets/ReorderAwardsHelper_example.png)

1. Select sort by *Title*, then click *Asc*
2. Select *tags...*, then *Homebrew*, *Prototype* and *Unlicensed*, and click *Last*
3. Select *Hacks* and click *Last*
4. Select *Mastered* and click *First*

The changes are not saved; the corresponding button must still be clicked for that.

Only affects the *Game Awards* section.

## RA_GameResourceSearch

On a game page, adds a link to search for external resources on the current game, and a select box to choose in what web site.

![game resource link](/assets/GameResourceSearch_game_link.png) ![game resource select](/assets/GameResourceSearch_game_select.png)

All available searches can be customized and new ones can be created on the Settings page[^1].

![game resource settings](/assets/GameResourceSearch_settings_moby.png)

> [!WARNING]
> The URL template executes provided JavaScript code. Only insert code you understand, or provided by someone you trust.

Search configurations can be (in order of the controls on the first row):
1. Created from scratch
2. Created using a copy of the currently selected configuration
3. Deactivated
4. Moved down or up in the list (saved immediately)
5. Saved
6. Reset to default (only for configurations included with the script)
7. Deleted (only for configurations created by the user)

The parameters for a search configuration are (from second to last row):
1. The name displayed in the select box
2. The URL template. This is a JavaScript [template literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals), where you can use the variables `${gameName}` and `${consoleName}` (when the system has multiple names in the menus, such as "NES/Famicom", only the first one is used).  
   Use of methods (functions) on theses elements is possible. See default configuration for *Mobygames* as an example, and [string documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) for more possibilities.
4. Consoles names can be specified to override the ones from the menus if *${consoleName}* is used in the URL template.
   At first, only the systems listed in the *Games* drop down menu are present. To have the complete list of known systems, load the page *Most Requested* at least once (needs to be done again if new systems are added in the database).  
   Systems with a modified names are highlighted with an asterisk in the list.
6. Consoles can be filtered, so that the current search is only included for the specified systems or on the contrary ignored for these systems.  
   The consoles are specified with a comma-separated list of their ids. To get the id of a console, hover over its name in the list above. When the list is correctly formatted, hovering over the text box displays the names of the consoles, allowing to check the list.
7. Tags (*subset*, *hack*, ...) can be filtered as well, with a comma-separated list of values (case insensitive)

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

## Discontinued

- RA_HideMasteredSets: now included with RA_CustomizeProfile
- RA_ScrollProfileAwards: now included with RA_CustomizeProfile
- RA_HideProfileAchievementsBadges: the new layout of these badges already has the feature
- RA_progress2JSON: not useful anymore with the API being back
- RA_EnhancedCheevosFilters: now included with RA_CustomCheevosList
- RA_EnhancedCheevosSort: now included with RA_CustomCheevosList
- RA_LinkUnofficalAchievements: now included with RA_CustomCheevosList

[^1]: Unless synchronization of scripts storage is added to Tampermonkey, these parameters are local.

# Crowdmark Tweaks

An open-source userscript that adds additional features to the Crowdmark user
interface.

## Features

### Grading keybinds

Several new keybinds have been added to speed up the process of grading.

* Pressing `a` followed by a number from 1-9 will increment the pending grade
  on the sidebar by that many points. This is useful when grading multi-part
  questions, as you can assign the desired points for each part one-by-one
  rather than needing to tally them mentally.

  * Pressing `u` after this will undo the last increment (useful if you made a
    mistake).
* Pressing `d` decrements the pending grade on the sidebar by 1 point.

#### Comment hotkeys

A powerful system now exists for applying comments to the submission without
needing to physically drag them from the sidebar each time.

You must first enter comment autoapply mode by pressing `w`. Now, the first 9 comments
in the comment library widget can be applied by pressing 1 through 9 on the keyboard.

To apply other comments, you can set a custom keybind for the comment by adding
a LaTeX `\phantom` directive at the start. For example, the comment `$\phantom{e}$ excellent work`
will be applied when you press `e`.

> [!NOTE]
> The contents of `\phantom` are not visible to the student. However, a small
> extra space will be visible at the start of the comment. It is up to you to
> decide if this minor visual blemish is worthwhile for the time savings of
> being able to directly hotkey more than 9 comments at once.

> [!NOTE]
> This *might* have conflicts with a letter used by another Crowdmark
> keybind, though the script tries to prevent Crowdmark from seeing the keypress.

## How to use

1. Ensure you have a userscript extension (I use [Tampermonkey](https://www.tampermonkey.net/), but any Greasemonkey derivative will likely work) installed in your browser.
2. Open the raw userscript in your browser after the extension is installed: https://github.com/embeddedt/crowdmark-tweaks/raw/refs/heads/main/crowdmark-tweaks.user.js

   This should bring up a window asking you to confirm installation of the script. Once it is installed, refresh Crowdmark.


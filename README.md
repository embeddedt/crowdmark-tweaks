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
a LaTeX `\phantom` directive at the start. It is also useful to wrap that directive
in `\rlap` so that it won't take up space in the comment visually.
For example, the comment `$\rlap{\phantom{e}}$ excellent work`
will be applied when you press `e`.

Keybinds longer than one character are also supported. The system requires you
enter only as many keys as necessary to disambiguate the desired comment.

Example: if you have comments with keybinds `ex`, `ez`, and `mo`, then pressing `w` followed
by `e` will not insert a comment - you must press `x` or `z` to fully disambiguate.
However, pressing `w` followed by `m` will immediately insert the comment with
keybind `mo`.

> [!NOTE]
> The contents of `\phantom` are not visible to the student. However, a small
> extra space will be visible at the start of the comment. It is up to you to
> decide if this minor visual blemish is worthwhile for the time savings of
> being able to directly hotkey more than 9 comments at once.

### Pacing timer

A timer has been added on the right sidebar below the evaluator name. The default
pacing time is 50 seconds. This can be customized by running
`window.localStorage.setItem("cmtSecondsPerBooklet", N)` in the browser developer
tools, where N is the desired number of seconds. In what follows, N refers
to the configured pacing time.

The timer starts off at 0 seconds and counts up while you are grading. When
you move to a booklet with a higher number, it decrements by N seconds.

You should aim to keep the timer between 0 and N seconds at all times. Negative
times indicate you are going faster than the desired pace. Times greater than N
seconds indicate you need to speed up to remain on track.

The timer can be manually cleared to 0 seconds by pressing `\`.

## How to use

1. Ensure you have a userscript extension (I use [Tampermonkey](https://www.tampermonkey.net/), but any Greasemonkey derivative will likely work) installed in your browser.
2. Open the raw userscript in your browser after the extension is installed: https://github.com/embeddedt/crowdmark-tweaks/raw/refs/heads/main/crowdmark-tweaks.user.js

   This should bring up a window asking you to confirm installation of the script. Once it is installed, refresh Crowdmark.


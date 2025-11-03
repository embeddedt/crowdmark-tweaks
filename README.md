# Crowdmark Tweaks

An open-source userscript that adds additional features to the Crowdmark user
interface.

## How to use

1. Ensure you have a userscript extension (I use [Tampermonkey](https://www.tampermonkey.net/), but any Greasemonkey derivative will likely work) installed in your browser.
2. Open the raw userscript in your browser after the extension is installed: https://github.com/embeddedt/crowdmark-tweaks/raw/refs/heads/main/crowdmark-tweaks.user.js

   This should bring up a window asking you to confirm installation of the script. Once it is installed, refresh Crowdmark.

## Features

### Grading keybinds

Several new keybinds have been added to speed up the process of grading.

* Pressing <kbd>a</kbd> followed by a number from 1-9 will increment the pending grade
  on the sidebar by that many points. This is useful when grading multi-part
  questions, as you can assign the desired points for each part one-by-one
  rather than needing to tally them mentally.

  * Pressing <kbd>u</kbd> after this will undo the last increment (useful if you made a
    mistake).
* Pressing <kbd>d</kbd> decrements the pending grade on the sidebar by 1 point.

#### Comment hotkeys

A powerful system now exists for applying comments to the submission without
needing to physically drag them from the sidebar each time.

You must first enter comment autoapply mode by pressing <kbd>w</kbd>. When in this mode,
a red border appears around the comment library on the sidebar. You can exit
comment autoapply mode without placing a comment by pressing <kbd>Esc</kbd>.

<img width="199" height="153" alt="image" src="https://github.com/user-attachments/assets/d431c048-7bae-40c6-8ae0-927a4d3b9b9d" />

Now, the first 9 comments
in the comment library widget can be applied by pressing <kbd>1</kbd> through <kbd>9</kbd> on the keyboard.

You can also set a custom keybind for the comment by adding
a LaTeX `\phantom` directive at the start. It is also useful to wrap that directive
in `\rlap` so that it won't take up space in the comment visually.
For example, the comment `$\rlap{\phantom{e}}$ excellent work`
will be applied when you press <kbd>e</kbd>.

<img width="319" height="269" alt="image" src="https://github.com/user-attachments/assets/6269c320-7434-424b-8b8b-d61576385d16" />

<img width="203" height="182" alt="image" src="https://github.com/user-attachments/assets/d187d890-5954-46e3-a835-dfb118f7e281" />

Custom keybinds longer than one character are also supported.  You only need
to enter as many keys as necessary to disambiguate the desired comment.

Example: if you have comments with keybinds `ex`, `ez`, and `mo`, then pressing <kbd>w</kbd> followed
by <kbd>e</kbd> will not insert a comment - you must press <kbd>x</kbd> or <kbd>z</kbd> to fully disambiguate.
However, pressing <kbd>w</kbd> followed by <kbd>m</kbd> will immediately insert the comment with
keybind `mo`.

> [!NOTE]
> The contents of `\rlap{\phantom` are not visible to the student. However, a small
> extra space will be visible at the start of the comment. It is up to you to
> decide if this minor visual blemish is worthwhile for the time savings of
> being able to directly hotkey more than 9 comments at once.

### Pacing timer

A timer has been added on the right sidebar below the evaluator's name.

<img width="183" height="100" alt="image" src="https://github.com/user-attachments/assets/2e1241ba-b58a-46c5-98aa-dc081a44aeb7" />

The default
pacing time is 50 seconds. This can be customized by running
`window.localStorage.setItem("cmtSecondsPerBooklet", N)` in the browser developer
tools, where N is the desired number of seconds. In what follows, N refers
to the configured pacing time.

The timer starts off at 0 seconds and counts up while you are grading. When
you move to a booklet with a higher number, it decrements by N seconds.

You should aim to keep the timer between 0 and N seconds at all times. Negative
times indicate you are going faster than the desired pace. Times greater than N
seconds indicate you need to speed up to remain on track.

The timer can be manually reset to 0 seconds by pressing <kbd>\\</kbd>.


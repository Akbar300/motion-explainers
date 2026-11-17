# Motion Explainers

A prototype of an in-app motion explainer: short, calm scenes that teach a math idea with HTML, SVG, CSS, and JavaScript. There is no video file and no build step.

Open `index.html` in a browser, or visit the live site once it is published.

## This first story

**From a Fraction to a Percent** walks through how three fourths becomes 75%. Six short scenes play one at a time, then wait:

1. A circular whole shows three fourths shaded.
2. The whole is cut into 100 equal squares, and the shaded part regroups into 75 of 100.
3. The fraction changes from three fourths to 75 over 100 by multiplying the top and the bottom by 25.
4. "75 out of 100" becomes 75%, because per cent means per 100.
5. One half, one fifth, and two fifths snap to 50%, 20%, and 40% on a percent bar.
6. A quick try-it: tap the percent for three tenths. Answers check on tap.

Controls: Play or Pause, Back, Next, Replay, a speed toggle, and scene dots.

## Design notes

Fractions are always stacked. Teal fills use `#0fb39c`. The layout is built for a phone (390×844) and a desktop window (1280×800). If the browser asks for reduced motion, each scene jumps to its finished state.

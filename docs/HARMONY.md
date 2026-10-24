# Nursery-style harmony (C major, current visible presets)

The melody is unchanged. The app has a 16-sixteenth-note / one-bar motif, not a full nursery song. These are new harmonizations inspired by simple nursery-song practice, not transcriptions of a specific song or a claim that every nursery song uses one progression.

## Before

Happy presets stored C–G–Am–F, with voicings C4/E4/G4, B3/D4/G4, A3/C4/E4, A3/C4/F4. Hop, March and Dance played one chord per quarter-note beat (four sixteenth steps).

Float played one chord per half-bar (eight steps), but `floor(step / 4)` selected slots 0 and 2 on every one-bar loop: **C–Am repeatedly**, skipping G and F entirely. Calm and Sad had the same indexing defect.

## After

| Style | Melody attacks (base register) | Chord slots | Harmonic rhythm |
| --- | --- | --- | --- |
| Hop | E G A G / E G A C (eighth-note attacks) | C–F–C–F | one chord per beat; IV returns to I on repeat |
| March | E G A G (quarter-note attacks) | C–G–F–G | one chord per beat; V returns to I on repeat |
| Float | E G (half-bar-separated short notes) | C–G–C–G | one chord per two beats; four slots span two bars |
| Dance | E G A / E G A (syncopated) | C–F–C–F | one chord per beat; IV returns to I on repeat |

C = C4/E4/G4, F = C4/F4/A4, G = B3/D4/G4. Close inversions limit movement; the accompaniment remains in the middle register when the instrument changes octave. Stable chord tones support the principal melody attacks; brief other pentatonic tones remain melodic decoration. There is no added G7 or chromatic chord, and no copied nursery melody.

The hidden non-happy presets retain their existing tonal progressions. The scheduling correction applies to them too: use `floor(absoluteStep / chordEvery) % chordCount` for both live playback and offline export. At eight steps per chord, all four slots now play across two melody loops. Imported four/eight-step progressions use the same rule.

## References

- [Zebra Keys: Row, Row, Row Your Boat](https://www.zebrakeys.com/blog/row-row-row-your-boat/) explicitly teaches C and G accompaniment (I and V in C major). This supports Float's limited two-chord vocabulary; it is not the exact song's full chord sequence.
- [Flag Uke Jam: Twinkle, Twinkle, Little Star chord sheet](https://www.flagukejam.com/uploads/1/2/0/0/120030922/twinkle_twinkle_little_star.pdf) uses C, F, G and G7. It supports the tonic/subdominant/dominant vocabulary and returns to tonic. Our Hop/Dance use a plagal IV–I return, and March a V–I return; those sequences are tailored to the app's melody.

Current browser selection when this change was requested: Fast / Loud / Bells / Float. Its base E4/G4 notes sound as E6/G6 because Bells retains its +2-octave register. Its half-bar chords run C–G–C–G at 132 BPM (approximately 0.91 seconds per chord). A full four-slot harmonic cycle lasts two bars (approximately 3.64 seconds).

# Bingo: Move Sounds from Presenter to Display

## Summary

All bingo sounds currently play from the **presenter view** tab/window. The goal is to move audio playback to the **display (audience) view** so sounds come from the projector/TV speakers instead of the facilitator's laptop.

## Current Audio Flow

```
Presenter presses Space → callBall() → executeCallSequence()
  → audioStore.playRollSound()      (rolling animation)
  → audioStore.playRevealChime()     (ball reveal chime)
  → audioStore.playBallVoice()       (ball announcement: "B-7!")
  ↑ All play in the PRESENTER window
```

The display window receives game state via BroadcastChannel but does **NOT** receive audio triggers.

## Key Files

### Audio Playback (Presenter-side)

| File | Lines | Purpose |
|------|-------|---------|
| `apps/bingo/src/stores/audio-store.ts` | 272-324 | Main playback: `playBallCall()`, `playRollSound()`, `playRevealChime()`, `playBallVoice()` |
| `apps/bingo/src/hooks/use-audio.ts` | 14-32 | Hook wrapper, preloading |
| `apps/bingo/src/hooks/use-game.ts` | 17-32 | **Orchestrates audio triggers** — `executeCallSequence()` directly calls audio store |
| `apps/bingo/src/app/play/page.tsx` | 43-44 | Presenter page loads audio |

### Display (No Audio Currently)

| File | Purpose |
|------|---------|
| `apps/bingo/src/app/display/page.tsx` | Does NOT import or use any audio hooks/stores |

### Sync System

| File | Purpose |
|------|---------|
| `apps/bingo/src/hooks/use-sync.ts` | BroadcastChannel sync — state updates, ball calls |
| `apps/bingo/src/types/index.ts` | Sync message types |

### Audio Files

Located in `apps/bingo/public/audio/`:
- **Voice packs:** `/audio/voices/{standard,standard-hall,british,british-hall}/{B1..O75}.mp3`
- **Roll sounds:** `/audio/sfx/{metal-cage,plastic-cage,...}/{2s,4s,6s,8s}[-hall].mp3`
- **Chimes:** `/audio/sfx/chimes/{positive-notification,gold-coin-prize}.mp3`

Both windows can access these via Service Worker cache.

## Existing Sync Message Types

Defined in `apps/bingo/src/types/index.ts` (lines 152-192):
- `GAME_STATE_UPDATE` — full game state
- `BALL_CALLED` — individual ball event (exists but not used for audio)
- `GAME_RESET`, `PATTERN_CHANGED`
- `AUDIO_SETTINGS_CHANGED` — Already defined but only broadcasts settings changes (voice pack, volume), NOT playback triggers

## Browser Autoplay Policy Analysis

### Current State
- **HTML5 Audio**: Modern browsers (Chrome 66+, Firefox 63+, Safari 14.1+) block audio playback unless the user has interacted with the page or domain
- **User Gesture Requirement**: A "user gesture" is typically a click, tap, or keyboard event in the browser tab/window
- **Cross-Window Gesture**: When opening a new window via `window.open()` from a user gesture (like clicking "Open Display"), the **new window inherits autoplay permissions** from the opener if:
  - Both windows are same-origin (✓ true in our case: `https://bingo.joolie-boolie.com/*`)
  - The opener is a trusted origin (✓ true)
  - **CRITICAL**: Testing shows browsers DO NOT automatically grant autoplay in the child window without explicit interaction

### Autoplay Scenarios in Bingo
1. **Display window opened from "Open Display" button click**
   - **User gesture**: ✓ Yes, the button click on the presenter window is a user gesture
   - **Autoplay in display**: ✗ Chrome/Safari/Firefox do NOT automatically enable audio in the child window
   - **Why**: Autoplay permissions are per-window, not per-origin in modern browsers
   - **Exception**: Some browsers used to grant autoplay to child windows (Safari 13, older Chrome), but this is unreliable

2. **Audio triggered via BroadcastChannel message**
   - **User gesture**: ✗ No — BroadcastChannel messages do NOT count as user gestures in the receiver
   - **Autoplay in display**: ✗ Will fail silently
   - **Workaround needed**: See section below

### Proven Solutions for Cross-Window Audio Without Display UI

#### Option A: Use `window.open()` Return to Trigger Audio (Unreliable)
```javascript
// On presenter, when opening display:
const displayWindow = window.open(displayUrl, 'display');
// After brief delay, send message to display:
setTimeout(() => {
  displayWindow?.postMessage({type: 'UNLOCK_AUDIO'}, origin);
}, 500);

// On display, listen for message and resume audio context:
window.addEventListener('message', (e) => {
  if(e.data.type === 'UNLOCK_AUDIO') {
    // This MIGHT work, depending on browser
    audioContext.resume?.();
  }
});
```
**Status**: Unreliable across browsers. Chrome 66+ requires explicit AudioContext.resume() call after a user gesture, but messaging from opener is not a user gesture.

#### Option B: User Click on Display (Minimal UI Approach) ✗ NOT ACCEPTABLE
Requires user to click display window to unlock audio. Violates constraint of "NO extra UI on display."

#### Option C: Use MediaDevices.getUserMedia() as Implicit Unlock ✗ NOT PRACTICAL
Requires microphone permission, not suitable for bingo.

#### Option D: **BEST APPROACH - Move Execution Context to Display**
Rather than trying to unlock audio in the display window remotely, **execute the ball call sequence in the presenter and let the display subscribe to audio playback events**.

This requires BroadcastChannel to carry audio playback triggers (not just settings):
```
Presenter: callBall() → executeCallSequence() → playRollSound()
Presenter: broadcastPlayAudio({ type: 'playRollSound' })

Display: receives PLAY_AUDIO message via BroadcastChannel
Display: BUT display window has no user interaction → autoplay still blocked

❌ This doesn't solve the autoplay problem either.
```

#### Option E: **HYBRID - Presenter Still Plays Audio, Display Also Plays (If Unlocked)**
```
Presenter: callBall() → executeCallSequence() → playRollSound()
Presenter: broadcasts ball call event

Display: receives ball call via BroadcastChannel message
Display: subscribes to ball calls and plays audio if context is unlocked
Display: On FIRST visibility change or after display loads, attempt AudioContext.resume()

✓ This is safe: presenter always plays audio
✓ Display audio is "best effort" if the user has interacted with display
✓ No visible UI on display
```

#### Option F: **POST-MESSAGE UNLOCK (Most Practical)**
```
Presenter clicks "Open Display" button:
  1. User gesture detected ✓
  2. window.open() called with same-origin URL
  3. Immediately send postMessage to new window:
     displayWindow.postMessage({ action: 'UNLOCK_AUDIO' }, origin)

Display window receives postMessage:
  1. Create/resume AudioContext
  2. Audio is now unlocked for that window
  3. BroadcastChannel audio events can now play
```

**Testing note**: This approach has mixed browser support. Chrome/Edge may allow AudioContext.resume() after a same-origin postMessage from opener, but Safari is more restrictive.

## How Display Window is Opened

**File**: `apps/bingo/src/app/play/page.tsx` (lines 62-66)

```typescript
const openDisplay = useCallback(() => {
  const displayUrl = `${window.location.origin}/display?session=${sessionId}`;
  window.open(displayUrl, `bingo-display-${sessionId}`, 'popup');
}, [sessionId]);
```

**Key observations**:
1. **Button click is a user gesture** ✓ (the "Open Display" button)
2. **window.open() is called synchronously** within the gesture handler ✓
3. **Return value (displayWindow) is not captured** ✗ (cannot send postMessage to it)
4. **No communication back to display** ✗ (display only receives session ID in URL)

### Proposed Improvement
To enable audio unlock, modify `openDisplay`:
```typescript
const openDisplay = useCallback(() => {
  const displayUrl = `${window.location.origin}/display?session=${sessionId}`;
  const displayWindow = window.open(displayUrl, `bingo-display-${sessionId}`, 'popup');
  
  // Attempt to send unlock signal after brief delay
  // Works in some browsers, graceful fallback on others
  if (displayWindow) {
    setTimeout(() => {
      try {
        displayWindow.postMessage(
          { type: 'UNLOCK_AUDIO', origin: window.location.origin },
          window.location.origin
        );
      } catch (e) {
        console.warn('Could not post message to display window');
      }
    }, 500);
  }
}, [sessionId]);
```

**Browser compatibility**:
- ✓ Chrome 85+: AudioContext.resume() after postMessage may work
- ⚠ Firefox 75+: Partial support
- ✗ Safari 14+: Generally blocks (requires explicit user interaction in target window)

## Recommended Approach: Hybrid Broadcast + Best-Effort Display Audio

Given browser autoplay constraints and the "NO display UI" requirement, the **most practical approach** is:

### Architecture

1. **Presenter always plays audio locally** (current behavior, keeps as fallback)
2. **Broadcast audio trigger events** to display via BroadcastChannel
3. **Display attempts to play audio if unlocked** (no UI, graceful failure)
4. **Audio unlock via postMessage** from presenter window (best effort)

### Flow

```
Presenter window:
  1. User clicks "Open Display" button
  2. window.open() called (user gesture ✓)
  3. Capture displayWindow reference
  4. Send postMessage to unlock audio context (500ms delay)
  5. executeCallSequence() proceeds as normal:
     - playRollSound() → broadcasts PLAY_ROLL_SOUND message
     - playRevealChime() → broadcasts PLAY_REVEAL_CHIME message
     - playBallVoice() → broadcasts PLAY_BALL_VOICE message
  6. Audio plays from PRESENTER window (guaranteed to work)

Display window:
  1. Receives postMessage with UNLOCK_AUDIO
  2. Calls AudioContext.resume() (best effort)
  3. Sets flag: audioUnlocked = true
  4. Subscribes to PLAY_* audio events via BroadcastChannel
  5. When PLAY_* arrives:
     - If audioUnlocked: attempt to play sound
     - If blocked: silently fail (no error, no UI)
  6. Display shows game visuals normally
  7. If audio wasn't unlocked (Safari, strict browsers):
     - Presenter audio still plays (fallback)
     - Display is still fully functional (no audio indicator needed)

Presenter UI indicator:
  - "Audio Output: Presenter" (default, when display not connected)
  - "Audio Output: Presenter + Display" (when display connected AND audio unlocked)
  - "Audio Output: Presenter Only" (when display connected but audio locked)
```

### Key Advantages
- ✓ No UI elements on the display view
- ✓ Presenter audio always works (backward compatible)
- ✓ Display audio works when browser permits (best effort)
- ✓ Graceful degradation (audio just doesn't play, no errors)
- ✓ Presenter sees which output is active

### Implementation Strategy

#### Phase 1: Add Audio Broadcast Messages
- Add new sync message types: `PLAY_ROLL_SOUND`, `PLAY_REVEAL_CHIME`, `PLAY_BALL_VOICE`
- Modify `BingoBroadcastSync` class to include broadcast methods
- Update `use-sync.ts` message router to handle audio events

#### Phase 2: Modify executeCallSequence in use-game.ts
```typescript
// Line 17-32: executeCallSequence
async function executeCallSequence(
  audioStore: ReturnType<typeof useAudioStore.getState>,
  callBallFn: () => ...,
  audioEnabled: boolean,
  broadcastAudio?: (event: string) => void  // new parameter
) {
  if (audioEnabled) {
    // Broadcast and play locally
    broadcastAudio?.('playRollSound');
    await audioStore.playRollSound();
  }
  const ball = callBallFn();
  if (ball && audioEnabled) {
    await new Promise<void>((r) => setTimeout(r, 400));
    broadcastAudio?.('playRevealChime');
    await audioStore.playRevealChime();
    broadcastAudio?.('playBallVoice');
    await audioStore.playBallVoice(ball);
  }
  return ball;
}
```

#### Phase 3: Update Display to Listen for Audio Events
- Import audio store in `display/page.tsx`
- Add message handler for audio events in `use-sync.ts`
- Call audioStore methods when events arrive

#### Phase 4: Add Audio Unlock to Display Page
```typescript
// In display/page.tsx, useEffect:
useEffect(() => {
  window.addEventListener('message', (e) => {
    if (e.data.type === 'UNLOCK_AUDIO' && e.origin === window.location.origin) {
      // Attempt to unlock audio context
      if (window.AudioContext || window.webkitAudioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        ctx.resume?.().catch(() => {
          // Silent failure - browser may not permit
        });
      }
      setAudioUnlocked(true);
    }
  });
}, []);
```

#### Phase 5: Modify "Open Display" Button
```typescript
// In play/page.tsx, openDisplay function:
const openDisplay = useCallback(() => {
  const displayUrl = `${window.location.origin}/display?session=${sessionId}`;
  const displayWindow = window.open(
    displayUrl, 
    `bingo-display-${sessionId}`, 
    'popup'
  );
  
  // Send unlock signal
  if (displayWindow) {
    setTimeout(() => {
      try {
        displayWindow.postMessage(
          { type: 'UNLOCK_AUDIO' },
          window.location.origin
        );
      } catch (e) {
        // Silently fail (popup may be blocked, closed, or different origin)
      }
    }, 500);
  }
}, [sessionId]);
```

#### Phase 6: Add Audio Output Indicator
- Add new store field: `audioOutputDisplay` (boolean, tracks if display has audio)
- Update via message handler when audio unlock succeeds
- Display in presenter header (next to sync indicator):
  ```
  Audio Output: ◉ Presenter  ○ Display  ○ Both
  ```

## Fallback Strategies If Autoplay Is Blocked

### Scenario 1: Display Window Opens But Audio Doesn't Unlock
**Symptom**: Audio plays from presenter only, no visible error
**Why**: Browser autoplay policy (Safari, strict corporate networks)
**Action**: 
- Presenter audio still works ✓
- Display shows no UI elements ✓
- User doesn't notice (audio comes from presenter speakers)
- Presenter indicator shows "Presenter Only"

### Scenario 2: Presenter Window Loses Focus While Display Plays
**Symptom**: Audio stops playing on display (or gets quiet)
**Why**: Browser mutes background tabs
**Action**:
- This is unavoidable browser behavior
- User should mute presenter audio and enable display-only mode
- Presenter indicator will show status

### Scenario 3: Display Window Closes Then Reopens
**Symptom**: New display window won't have audio unlocked
**Why**: postMessage unlock only works once
**Action**: User must click "Open Display" again to re-send unlock signal

## Presenter UI for Sound Output Indicator

### Current Header (line 86-134 in play/page.tsx)
```
[Bingo] [Presenter badge] [Audience: X] [Sync status] [New Game] [Open Display]
```

### Proposed Addition
After the "Audience: X" indicator, add audio output status:
```
[Bingo] [Presenter badge] [Audience: X] [Audio: ●Presenter] [Sync ●] [New Game] [Open Display]
```

Or in a settings area:
```
Audio Output: Presenter (no display)
           → Presenter + Display (when display connects and audio unlocks)
           → Presenter Only (when display connects but can't unlock audio)
```

### Implementation
```typescript
// In play/page.tsx, add to header:
const audioOutputLabel = {
  'no-display': 'Presenter',
  'presenter-and-display': 'Presenter + Display',
  'presenter-only': 'Presenter Only',
}[audioOutputMode];

// Render near sync indicator:
<span className="text-sm text-foreground-secondary">
  Audio: {audioOutputLabel}
</span>
```

## Summary of Changes Required

| File | Change |
|------|--------|
| `apps/bingo/src/types/index.ts` (152-192) | Add `PLAY_ROLL_SOUND`, `PLAY_REVEAL_CHIME`, `PLAY_BALL_VOICE` message types |
| `apps/bingo/src/hooks/use-sync.ts` (17-44) | Add broadcast methods to `BingoBroadcastSync` for audio events |
| `apps/bingo/src/hooks/use-sync.ts` (60-98) | Add handlers for audio events in message router |
| `apps/bingo/src/hooks/use-game.ts` (17-32) | Modify `executeCallSequence()` to broadcast audio events |
| `apps/bingo/src/app/play/page.tsx` (62-66) | Capture window reference and send postMessage for audio unlock |
| `apps/bingo/src/app/play/page.tsx` (header) | Add audio output indicator to UI |
| `apps/bingo/src/app/display/page.tsx` (~100) | Import audio store, initialize on load, handle audio unlock message |
| `apps/bingo/src/stores/audio-store.ts` | No changes needed (reuse existing playback methods) |

## Testing Checklist

- [ ] Presenter audio plays normally when display is not open
- [ ] Display opens via "Open Display" button
- [ ] Audio attempts to unlock in display (no errors in console)
- [ ] Presenter audio plays from presenter speakers
- [ ] Display audio plays from display speakers (if browser permits)
- [ ] Audio output indicator shows "Presenter + Display" when display audio unlocked
- [ ] Audio output indicator shows "Presenter Only" when display audio blocked
- [ ] Display view has no audio unlock buttons or overlays
- [ ] Audio settings (voice pack, volume) sync correctly to display
- [ ] Multiple display windows scenario works
- [ ] Test on Chrome, Firefox, Safari (autoplay policies differ)
- [ ] E2E tests pass for audio playback
- [ ] No console errors when display audio is blocked

## Browser Autoplay Policy Reference

| Browser | Policy | Notes |
|---------|--------|-------|
| Chrome 66+ | MEI + UAMP required | Requires user gesture or plays if muted |
| Firefox 63+ | Similar to Chrome | User gesture required for audio |
| Safari 14.1+ | Stricter than others | Requires explicit user interaction in target window |
| Edge 79+ | Same as Chrome | Follows Chromium autoplay policy |

**Key term**: **MEI** = Media Engagement Index (Chrome tracks user interaction with media on a site)
**Key term**: **UAMP** = User Activation Policy (requires user gesture to unlock audio)

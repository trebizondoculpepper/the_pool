# 219: Phone controls while moving

The owner, 2026-11-06. This follows the handset and menu work in [213](213-phone-model-and-raise.md) and [214](214-phone-menus-and-inbox.md). The phone now has a larger, FOV-stable presentation. This mission concerns input behaviour; [issue #67](https://github.com/trebizondoculpepper/the_pool/issues/67) separately tracks its visual fit and overlay framing.

## Aim

Make the raised phone feel like an independent hand-held device while the player can still move through the plant. Its controls must be consistent across keyboard, touch and gamepad and live in the common control scheme, with no room-specific bindings.

## Current starting point

- M raises and lowers the phone. While it is raised, W/S move through phone items, A goes back, and D/E select. Those keys do not move the player. Escape backs out and eventually lowers the phone.
- Gamepad D-pad and a separate touch arrow group navigate the phone. The touch phone icon raises it, but the icons drawn on its screen are not themselves touch targets.
- The shared input gate currently holds movement and world use while the phone is raised. The simulation clock continues.

## Work

1. On keyboard, use the arrow keys to move the phone's selection and scroll its content, Enter to select or open, and Escape to cancel or back out (lowering the phone at its main menu). Preserve M to raise/lower. Keep WASD movement and mouse look active while the phone is raised; do not send those inputs to the phone. Make the phone usable without changing its menu model or per-room controls.
2. On touch screens, make the visible phone icons and relevant on-screen controls directly touchable with targets that follow the rendered handset and screen. A tap on an icon selects it; back/soft-key and list scrolling remain possible. The separate touch navigation controls may remain as an accessibility fallback, but should not be the only way to operate the phone.
3. On gamepad, use the D-pad for phone navigation while the movement and look sticks remain available for the player. Resolve the D-pad Up raise-phone shortcut when the phone is closed versus its Up action when the phone is open. Keep a reliable select and back/lower path and avoid accidental world actions from phone inputs.
4. Route every modality through the shared phone action and control scheme. Update control hints and the controls guide so displayed bindings match behaviour. Preserve touch, keyboard and gamepad input focus without movement or menu actions leaking into each other.

## Acceptance

- With the phone raised, WASD moves the player and the mouse still looks around while arrow keys move the phone selection, Enter opens it and Escape cancels or backs out through Main Menu → Messages → Inbox → message. The phone remains readable and the world clock keeps running.
- In a touch browser, tapping the visible Messages icon opens it, tapping an inbox row opens that message, and the user can scroll, back out and lower the phone without a hardware keyboard. Tap targets stay aligned across supported viewport sizes, FOVs and zooms.
- On gamepad, the movement stick moves the player while the D-pad navigates the raised phone; D-pad Up raises a closed phone and navigates upward once open. Select and back/lower work consistently.
- Phone input does not activate a plant object or pause the simulation. Behaviour is verified in a browser for desktop and portrait touch sizes, with focused input tests for each control path.

## Coordination

This is a new mission brief, not an implementation claim. Inspect the shared `src/toolkit/controls/` input gate, phone view and touch routing before planning the change; keep all bindings in the one control scheme. No world-state migration is expected unless the implementation discovers a persisted phone-control setting.

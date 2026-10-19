// Exact action art and short slot names sourced from the live NexGame game.js.
export const HOTBAR_ART={
 autoAttack:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 39L36 10" stroke="#714520" stroke-width="7"/><path d="M22 12L36 5L45 19L35 25L29 20L22 22Z" fill="#c5c8b6" stroke="#ece2be" stroke-width="2"/><path d="M10 35L16 40" stroke="#e9bf72" stroke-width="4"/></svg>',
 thunderStomp:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 5L32 5L30 24L38 32L35 36L13 36L10 31L17 21Z" fill="#b6a383" stroke="#e6cd94" stroke-width="2"/><path d="M4 35L13 42M44 35L36 43M24 39L24 47" stroke="#edc968" stroke-width="3"/></svg>',
 heavyStrike:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40L35 9" stroke="#83532c" stroke-width="6" stroke-linecap="round"/><path d="M20 9L34 5L44 15L35 23L26 20L21 24" fill="#b9c2c7" stroke="#e8dfc3" stroke-width="2"/><path d="M7 28L19 40" stroke="#cf9b4d" stroke-width="4"/><path d="M34 30L44 30M37 24L46 21" stroke="#ffc36a" stroke-width="2" stroke-linecap="round"/></svg>',
 healingPotion:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 6L29 6L29 16Q42 27 36 38Q24 44 12 38Q6 27 19 16Z" fill="#742d28" stroke="#d5b976" stroke-width="2"/><path d="M15 26L33 26L34 36Q24 41 14 36Z" fill="#bf5344"/><path d="M18 7L30 7" stroke="#a5834d" stroke-width="6"/></svg>'
};
export const HOTBAR_SHORT={autoAttack:'Авто',thunderStomp:'Поступь',heavyStrike:'Рубящий',healingPotion:'Настой'};

// Active mode visibly differs from the unsheathed idle sword: crossed glowing
// blades and warm backdrop communicate that auto-attack is engaged.
export const HOTBAR_AUTO_ACTIVE='<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#5b3419" stroke="#e8b954" stroke-width="1.5"/><path d="M10 10L38 38M38 10L10 38" stroke="#6c4223" stroke-width="7" stroke-linecap="round"/><path d="M8 8L34 34M40 8L14 34" stroke="#e8e0c5" stroke-width="4" stroke-linecap="round"/><path d="M6 5L15 7L9 16Z M42 5L33 7L39 16Z" fill="#fff1bf"/><path d="M12 28L20 36M28 36L36 28" fill="none" stroke="#ffc458" stroke-width="4"/><path d="M24 3L27 11M24 45L27 37" stroke="#ffdf83" stroke-width="2"/></svg>';

// Settings menu (spec §29): the choices each setting takes, the defaults, and what
// the camera / sharpness choices mean.
export const SETTING_CHOICES = {
  effects: ['auto', 'full', 'lite'], // auto: full, switching to lite when the FPS stays low
  view: ['25d', '2d'],
  sharp: ['save', 'normal', 'sharp'],
  zoom: ['near', 'mid', 'far'],
  lang: ['en', 'id'],
};
export const SETTING_DEFAULTS = {
  musicVol: 80, sfxVol: 80, view: '25d', sharp: 'normal', showFps: false, shake: true, dmgNumbers: true, zoom: 'far',
};
// starting camera zoom (render3d/stage.js ZOOM: bigger = farther)
export const ZOOM_START = { near: 1, mid: 1.18, far: 1.35 };
// texture & render resolution against render3d/stage.js SHARP
export const SHARP_SCALE = { save: 0.7, normal: 1, sharp: 1.25 };

// Settings menu (spec §29): the choices each setting takes, the defaults, and what
// the camera / sharpness choices mean.
export const SETTING_CHOICES = {
  effects: ['auto', 'full', 'lite'], // auto: full, switching to lite when the FPS stays low
  view: ['25d', '2d'],
  sharp: ['save', 'normal', 'sharp'],
  zoom: ['near', 'mid', 'far'],
  camSens: ['slow', 'normal', 'fast', 'xfast'],
  camera: ['top', 'behind', 'follow'], // top: the 2.5D view from above (default); behind / follow: the camera example (data/look.js CAMERA)
  lang: ['en', 'id'],
};
export const SETTING_DEFAULTS = {
  musicVol: 80, sfxVol: 80, view: '25d', sharp: 'normal', showFps: false, shake: true, dmgNumbers: true, zoom: 'far', camSens: 'normal', camera: 'top',
  foeMotion: true, rimLight: true, // Grafis: monsters that move, the rim light on figures (plan "hybrid-visual")
};
// starting camera zoom (render3d/stage.js ZOOM: bigger = farther)
export const ZOOM_START = { near: 1, mid: 1.18, far: 1.35 };
// texture & render resolution against render3d/stage.js SHARP
export const SHARP_SCALE = { save: 0.7, normal: 1, sharp: 1.25 };
// camera turn speed (render3d/stage.js): a multiplier on the two-finger twist / drag and the mouse drag
export const CAM_SENS = { slow: 1, normal: 1.8, fast: 2.6, xfast: 3.6 };

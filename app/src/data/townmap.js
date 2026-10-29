// The town map (spec §30): what each keeper offers and the icon shown for it (art/sprites.js ICONS).
// Text is the Indonesian source; the UI translates it with tr().
export const SERVICES = {
  inn: { icon: 'inn', text: 'Menginap & pulihkan HP' },
  potion: { icon: 'potion', text: 'Ramuan & sabuk ramuan' },
  gear: { icon: 'pow', text: 'Peti gear, jual, tempa, urai' },
  jeweler: { icon: 'gearRing', text: 'Pasang & gabung permata' },
  trainer: { icon: 'trainer', text: 'Latihan atribut & bakat' },
  board: { icon: 'board', text: 'Tugas, ekspedisi & Lencana' },
  weapons: { icon: 'gearSword', text: 'Senjata pajangan' },
  armor: { icon: 'gearArmor', text: 'Zirah pajangan' },
  jewelry: { icon: 'gearRing', text: 'Perhiasan pajangan' },
  storage: { icon: 'chest', text: 'Simpan & ambil gear' },
  mats: { icon: 'gem', text: 'Bahan tempa & permata' },
  barber: { icon: 'barber', text: 'Ganti gaya rambut' },
  teleport: { icon: 'zap', text: 'Pindah ke kota lain' },
  night: { icon: 'gearAmulet', text: 'Barang langka, 18:00–05:00' },
  gate: { icon: 'arm', text: 'Keluar ke wilayah' },
};

// Ground colours of the drawn map, per feature kind (anything else is drawn as a plain block).
export const FEATURE_COLOR = {
  fence: '#5a4632', fire: '#ff8a3a', stall: '#7a3a4a', bigtree: '#2f5a3a', well: '#4a5a6a', garden: '#3e5a32',
  pond: '#6a9ac6', statue: '#8a8a9a', tower: '#4a4a5a', oasis: '#2f8a86', market: '#8a5a3a', monument: '#6a5a4a',
  lava: '#e0562a', bridge: '#6a5a4a',
};

const tints = ['#16324F', '#E8622C', '#274B73', '#DE5A22']

export const POSTER_PALETTE = [
  'linear-gradient(160deg,#1B3E63,#0F2438)',
  'linear-gradient(160deg,#F07A45,#C94F1E)',
  'linear-gradient(160deg,#274B73,#122840)',
  'linear-gradient(160deg,#E8622C,#A8431A)',
  'linear-gradient(160deg,#3A5C82,#16324F)',
]

export const CHANNELS = [
  { name: 'TF1', category: 'Généraliste', program: 'Journal de 20h' },
  { name: 'France 2', category: 'Généraliste', program: 'Envoyé Spécial' },
  { name: 'M6', category: 'Généraliste', program: 'Capital' },
  { name: 'Canal+', category: 'Cinéma', program: 'Film du dimanche' },
  { name: 'Eurosport', category: 'Sport', program: 'Tour de France' },
  { name: 'France Info', category: 'Info', program: 'Édition continue' },
  { name: 'Arte', category: 'Culture', program: 'Documentaire nature' },
  { name: 'RMC Sport', category: 'Sport', program: 'Ligue 1 en direct' },
].map((ch, i) => ({ ...ch, tint: tints[i % tints.length] }))

export const MOVIES = [
  ['Frontière Nord', 2023, 'Thriller'],
  ['Le Dernier Vol', 2021, 'Action'],
  ['Nuits Blanches', 2024, 'Drame'],
  ['Horizon Perdu', 2019, 'Aventure'],
  ['Code Silence', 2022, 'Science-fiction'],
  ['Rivage', 2020, 'Romance'],
  ['Échec et Mat', 2023, 'Thriller'],
  ['Les Insoumis', 2018, 'Historique'],
  ['Zone Rouge', 2024, 'Action'],
  ['Marée Basse', 2021, 'Drame'],
  ["Chasseurs d'Ombres", 2022, 'Fantastique'],
  ['Kilomètre 0', 2020, 'Comédie'],
].map(([title, year, genre], i) => ({ title, year, genre, posterBg: POSTER_PALETTE[i % POSTER_PALETTE.length] }))

export const SERIES = [
  ['Réseau', 4, 'Thriller'],
  ['Maison Bleue', 2, 'Drame'],
  ['Contre-Enquête', 3, 'Policier'],
  ['Aube Noire', 1, 'Science-fiction'],
  ['Les Héritiers', 5, 'Drame'],
  ['Fracture', 2, 'Thriller'],
  ['Vertige', 3, 'Suspense'],
  ['Le Cercle', 1, 'Mystère'],
  ['Sur la Route', 4, 'Comédie'],
  ['Ombres Portées', 2, 'Policier'],
].map(([title, seasons, genre], i) => ({ title, seasons, genre, posterBg: POSTER_PALETTE[(i + 2) % POSTER_PALETTE.length] }))

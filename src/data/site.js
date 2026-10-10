// Everything editable lives here: copy, prices, contact + location placeholders, flavour palettes.

export const SITE = {
  name: 'LUMA',
  tagline: 'Layers of Happiness.',
  currency: '₹', // change to your currency symbol
  // ---- PLACEHOLDERS: replace before launch ----
  contact: {
    phoneLabel: '[Phone number]',
    phoneHref: '#contact',
    email: '[hello@yourdomain]',
    instagramHref: '#',
    orderHref: '#flavours',
    directionsHref: '#',
  },
  address: ['[Street address line 1]', '[Area, City, Postcode]'],
  hours: [
    ['Monday – Thursday', '[00:00] – [00:00]'],
    ['Friday – Saturday', '[00:00] – [00:00]'],
    ['Sunday', '[00:00] – [00:00]'],
  ],
}

export const FLAVOURS = [
  {
    id: 'rose',
    name: 'Royal Rose Falooda',
    desc: 'Rose syrup, chilled milk and silky vanilla — the classic, crowned.',
    price: 189,
    glow: '#F0709B',
  },
  {
    id: 'mango',
    name: 'Mango Falooda',
    desc: 'Sun-ripe mango, saffron-warm milk and a golden mango scoop.',
    price: 199,
    glow: '#FFB627',
  },
  {
    id: 'pistachio',
    name: 'Pistachio Falooda',
    desc: 'Roasted pistachio cream over basil seeds and cool green syrup.',
    price: 219,
    glow: '#8CC76E',
  },
  {
    id: 'chocolate',
    name: 'Chocolate Falooda',
    desc: 'Dark cocoa ribbons, creamy milk and a velvety chocolate scoop.',
    price: 209,
    glow: '#8A4F3C',
  },
  {
    id: 'dryfruit',
    name: 'Dry Fruit Falooda',
    desc: 'Almonds, cashews and pistachio folded into kesar-kissed layers.',
    price: 239,
    glow: '#E8A63C',
  },
  {
    id: 'strawberry',
    name: 'Strawberry Falooda',
    desc: 'Fresh strawberry, rosy milk and a berry scoop. Bright and cool.',
    price: 199,
    glow: '#FF5676',
  },
]

// Interactive flavour selector (page tone changes with the pick)
export const SELECTOR = {
  rose: {
    label: 'Rose',
    title: 'Royal Rose',
    line: 'Soft, floral and unmistakably LUMA.',
    notes: ['Rose syrup', 'Vanilla bean', 'Rose petals'],
    bg: '#FFE3EB',
    ink: '#4A1942',
    accent: '#F0709B',
  },
  pistachio: {
    label: 'Pistachio',
    title: 'Pistachio Cream',
    line: 'Nutty, cool and quietly luxurious.',
    notes: ['Roasted pistachio', 'Green syrup', 'Basil seeds'],
    bg: '#E5F2D3',
    ink: '#2C3A1E',
    accent: '#7FB76A',
  },
  mango: {
    label: 'Mango',
    title: 'Golden Mango',
    line: 'Sunny, sweet and warmed with saffron.',
    notes: ['Ripe mango', 'Saffron milk', 'Mango scoop'],
    bg: '#FFEDBE',
    ink: '#4A2A10',
    accent: '#FFAE1A',
  },
  strawberry: {
    label: 'Strawberry',
    title: 'Fresh Strawberry',
    line: 'Bright, juicy and cool. Berries all the way down.',
    notes: ['Fresh strawberry', 'Berry scoop', 'Ruby jelly'],
    bg: '#FFD9DF',
    ink: '#4A1942',
    accent: '#E8325A',
  },
  dryfruit: {
    label: 'Dry Fruit',
    title: 'Royal Dry Fruit',
    line: 'Almonds, cashews and pistachio folded into kesar-kissed layers.',
    notes: ['Almonds & cashews', 'Pistachio', 'Kesar milk'],
    bg: '#F6E3C5',
    ink: '#4A2A10',
    accent: '#D9A441',
  },
  chocolate: {
    label: 'Chocolate',
    title: 'Dark Cocoa',
    line: 'Deep, velvety and made for the bold.',
    notes: ['Cocoa ribbon', 'Chocolate scoop', 'Toasted nuts'],
    bg: '#3A1F1C',
    ink: '#FFEFE2',
    accent: '#B9774F',
  },
}

export const REVIEWS = [
  { quote: 'Perfect balance of creamy and refreshing.', who: 'Guest review', tag: 'Royal Rose' },
  { quote: 'Best Royal Falooda I’ve had.', who: 'Guest review', tag: 'Royal Rose' },
  { quote: 'Every spoonful is a different layer. Nothing is too sweet.', who: 'Guest review', tag: 'Pistachio' },
  { quote: 'The mango one tastes like a sunny afternoon.', who: 'Guest review', tag: 'Mango' },
  { quote: 'Beautiful to look at, even better to finish.', who: 'Guest review', tag: 'Signature' },
]

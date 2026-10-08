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

/*
  Palette per flavour. Used by <FaloodaGlass/> — the glass re-colours itself (and transitions) from these.
  syrup: [top, bottom]   milk: [top, bottom]   scoops: 3 × [highlight, shade]   fruit: chunk colour
  jelly: 3 cube colours
*/
const VANILLA = ['#FFF7EA', '#F4DDC2']

export const PALETTES = {
  rose: {
    syrup: ['#EE6593', '#B72B5E'],
    milk: ['#FFEEF3', '#FBCADA'],
    scoops: [VANILLA, ['#FFD6E3', '#F0A0BC'], VANILLA],
    fruit: '#FF5A78',
    jelly: ['#FF86AB', '#A5D98F', '#FFD35F'],
  },
  mango: {
    syrup: ['#FFBC2B', '#EE8A00'],
    milk: ['#FFF6DB', '#FFE29E'],
    scoops: [['#FFE08A', '#FFBC3B'], VANILLA, ['#FFD66F', '#FFB52E']],
    fruit: '#FFAE1A',
    jelly: ['#FFD35F', '#A5D98F', '#FF9A5C'],
  },
  pistachio: {
    syrup: ['#97CC7B', '#5E9E4E'],
    milk: ['#F4FAE8', '#D8ECBC'],
    scoops: [['#CBE8AB', '#9BCB78'], VANILLA, ['#C3E3A1', '#93C46E']],
    fruit: '#FFC247',
    jelly: ['#A5D98F', '#FF86AB', '#FFD35F'],
  },
  chocolate: {
    syrup: ['#7A4533', '#3F1D17'],
    milk: ['#F6E4D4', '#DDB496'],
    scoops: [['#A3705A', '#6B3F2F'], VANILLA, ['#94644F', '#5E3628']],
    fruit: '#FF6A82',
    jelly: ['#FF86AB', '#FFD35F', '#A5D98F'],
  },
  dryfruit: {
    syrup: ['#EBA93F', '#B9701F'],
    milk: ['#FFF3DC', '#F5D7A4'],
    scoops: [['#FFE6B0', '#F2C673'], VANILLA, ['#FFEBC0', '#EFC06A']],
    fruit: '#E9B25A',
    jelly: ['#FFD35F', '#FF86AB', '#A5D98F'],
  },
  strawberry: {
    syrup: ['#FF5676', '#CF2149'],
    milk: ['#FFE6EB', '#FFBCCB'],
    scoops: [['#FFCCD8', '#FF93AB'], VANILLA, ['#FFC2D0', '#FF8CA6']],
    fruit: '#FF5A78',
    jelly: ['#FF86AB', '#A5D98F', '#FFD35F'],
  },
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

export const BUILDER = {
  bases: [
    { id: 'rose', label: 'Rose', price: 149, dot: '#EE6593' },
    { id: 'mango', label: 'Mango', price: 159, dot: '#FFB52E' },
    { id: 'chocolate', label: 'Chocolate', price: 159, dot: '#6B3A2B' },
    { id: 'pistachio', label: 'Pistachio', price: 169, dot: '#97CC7B' },
  ],
  ice: [
    { id: 'vanilla', label: 'Vanilla Bean', price: 30, colors: VANILLA },
    { id: 'kulfi', label: 'Malai Kulfi', price: 40, colors: ['#FFF0CC', '#F2D7A0'] },
    { id: 'strawberry', label: 'Strawberry', price: 35, colors: ['#FFCCD8', '#FF93AB'] },
    { id: 'chocolate', label: 'Dark Chocolate', price: 40, colors: ['#A3705A', '#6B3F2F'] },
  ],
  toppings: [
    { id: 'pistachio', label: 'Pistachios', price: 15 },
    { id: 'almond', label: 'Almonds', price: 15 },
    { id: 'petals', label: 'Rose petals', price: 10 },
    { id: 'fruit', label: 'Fruit pieces', price: 20 },
    { id: 'jelly', label: 'Jelly cubes', price: 15 },
    { id: 'basil', label: 'Basil seeds', price: 10 },
  ],
  extras: [
    { id: 'extraSev', label: 'Extra falooda sev', price: 20 },
    { id: 'cream', label: 'Whipped cream', price: 20 },
    { id: 'saffron', label: 'Saffron strands', price: 25 },
    { id: 'cherry', label: 'Cherry on top', price: 10 },
  ],
}

export const REVIEWS = [
  { quote: 'Perfect balance of creamy and refreshing.', who: 'Guest review', tag: 'Royal Rose' },
  { quote: 'Best Royal Falooda I’ve had.', who: 'Guest review', tag: 'Royal Rose' },
  { quote: 'Every spoonful is a different layer. Nothing is too sweet.', who: 'Guest review', tag: 'Pistachio' },
  { quote: 'The mango one tastes like a sunny afternoon.', who: 'Guest review', tag: 'Mango' },
  { quote: 'Beautiful to look at, even better to finish.', who: 'Guest review', tag: 'Signature' },
]

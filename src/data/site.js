// Everything editable lives here: copy, prices, contact + location placeholders, flavour palettes.

export const SITE = {
  name: 'LUMA',
  tagline: 'Layers of Happiness.',
  currency: '₹', // change to your currency symbol
  // ---- PLACEHOLDERS: replace before launch ----
  contact: {
    phoneLabel: '[Phone number]',
    email: '[hello@yourdomain]',
    instagramHref: '#',
    orderHref: '#flavours',
  },
}

export const FLAVOURS = [
  {
    id: 'strawberry',
    name: 'Strawberry Falooda',
    desc: 'Fresh strawberry, rosy milk and a berry scoop. Bright, juicy and cool.',
    price: 199,
    glow: '#FF5676',
  },
  {
    id: 'rose',
    name: 'Royal Rose Falooda',
    desc: 'Delicate rose syrup, chilled milk and silky vanilla ice cream, finished with fragrant petals.',
    price: 189,
    glow: '#F0709B',
  },
  {
    id: 'mango',
    name: 'Mango Falooda',
    desc: 'Sun-ripened mango, saffron-warmed milk and a golden mango scoop.',
    price: 199,
    glow: '#FFB627',
  },
  {
    id: 'pistachio',
    name: 'Pistachio Falooda',
    desc: 'Roasted pistachio cream layered with basil seeds, falooda sev and chilled milk.',
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
    desc: 'Almonds, cashews and pistachio in kesar-infused layers with a golden finish.',
    price: 239,
    glow: '#E8A63C',
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
    notes: ['Roasted pistachio', 'Pistachio cream', 'Basil seeds'],
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

// Hero showcase copy per flavour (title / notes / colours come from SELECTOR, price from FLAVOURS)
export const HERO_COPY = {
  strawberry: 'Bright, juicy, and cool. Berries layered with creamy Falooda for a refreshing finish.',
  rose: 'Delicate rose syrup folded through chilled milk and silky ice cream, finished with fragrant petals.',
  mango: 'Sun-ripened mango and a hint of saffron, layered with creamy Falooda for a golden, refreshing finish.',
  pistachio: 'Roasted pistachio cream layered with basil seeds and silky sev for a smooth, nutty finish.',
  chocolate: 'Dark cocoa ribbons and velvety chocolate ice cream, layered into a rich, indulgent Falooda.',
  dryfruit: 'Almonds, cashews and pistachio in kesar-infused layers: a rich, traditional Falooda with a golden finish.',
}

// The ₹1 launch offer: one Strawberry Falooda, shipping ₹0, ₹1 in total. The server prices it from the product's offerPrice in the database.
export const OFFER = { id: 'strawberry', title: 'LUMA ₹1 Offer', price: 1, note: 'Strawberry Falooda · 1 per order' }

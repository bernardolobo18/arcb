export const CATALOG_VERSION = 4;

export const DEFAULT_CATEGORIES = [
  { id: 'cafes', name: 'Cafes' },
  { id: 'bebidas', name: 'Bebidas' },
  { id: 'pastelaria', name: 'Pastelaria' },
  { id: 'sandes', name: 'Sandes' },
  { id: 'chocolates', name: 'Chocolates' },
  { id: 'alcool', name: 'Alcool' },
  { id: 'diversos', name: 'Diversos' }
];

export const DEFAULT_PRODUCTS = [
  { id: 'cafe', name: 'Cafe', categoryId: 'cafes', price: 0.8 },
  { id: 'descafeinado', name: 'Descafeinado', categoryId: 'cafes', price: 0.8 },
  { id: 'garoto', name: 'Garoto', categoryId: 'cafes', price: 0.8 },
  { id: 'galao', name: 'Galao', categoryId: 'cafes', price: 1 },
  { id: 'meia-leite', name: 'Meia de leite', categoryId: 'cafes', price: 0.9 },
  { id: 'copo-leite', name: 'Copo de leite', categoryId: 'cafes', price: 0.9 },
  { id: 'carioca-limao', name: 'Carioca de limao', categoryId: 'cafes', price: 0.8 },
  { id: 'abatanado', name: 'Abatanado', categoryId: 'cafes', price: 0.8 },

  { id: 'agua-25cl', name: 'Agua 25cl', categoryId: 'bebidas', price: 0.6 },
  { id: 'agua-50cl', name: 'Agua 50cl', categoryId: 'bebidas', price: 1.1 },
  { id: 'sumo-lata', name: 'Sumo lata', categoryId: 'bebidas', price: 1.5 },
  { id: 'nectar', name: 'Nectar', categoryId: 'bebidas', price: 1.5 },
  { id: 'pedras', name: 'Pedras', categoryId: 'bebidas', price: 1.2 },
  { id: 'pedras-limao', name: 'Pedras limao', categoryId: 'bebidas', price: 1.2 },
  { id: 'ucal', name: 'Ucal', categoryId: 'bebidas', price: 1.5 },
  { id: 'caneca', name: 'Caneca', categoryId: 'bebidas', price: 2 },
  { id: 'cerveja-sem-alcool', name: 'Cerveja s/ alcool', categoryId: 'bebidas', price: 1.4 },

  { id: 'torrada', name: 'Torrada', categoryId: 'pastelaria', price: 0.75 },
  { id: 'meia-torrada', name: '1/2 torrada', categoryId: 'pastelaria', price: 0.75 },
  { id: 'tosta-mista', name: 'Tosta mista', categoryId: 'pastelaria', price: 2.3 },
  { id: 'croissant-manteiga', name: 'Croissant c/ manteiga', categoryId: 'pastelaria', price: 1 },
  { id: 'croissant-queijo', name: 'Croissant c/ queijo', categoryId: 'pastelaria', price: 1.8 },
  { id: 'croissant-fiambre', name: 'Croissant c/ fiambre', categoryId: 'pastelaria', price: 1.8 },
  { id: 'croissant-misto', name: 'Croissant misto', categoryId: 'pastelaria', price: 2 },
  { id: 'croissant-chocolate', name: 'Croissant c/ chocolate', categoryId: 'pastelaria', price: 2.2 },
  { id: 'croissant-ovo', name: 'Croissant c/ ovo', categoryId: 'pastelaria', price: 2.2 },
  { id: 'salgados', name: 'Salgados', categoryId: 'pastelaria', price: 1.2 },
  { id: 'bolos', name: 'Bolos', categoryId: 'pastelaria', price: 1.2 },
  { id: 'arroz-doce', name: 'Arroz doce', categoryId: 'pastelaria', price: 1.5 },
  { id: 'mousse', name: 'Mousse', categoryId: 'pastelaria', price: 1.5 },
  { id: 'pudim', name: 'Pudim', categoryId: 'pastelaria', price: 1.5 },
  { id: 'cerelac', name: 'Cerelac', categoryId: 'pastelaria', price: 1.5 },

  { id: 'pao-manteiga', name: 'Pao c/ manteiga', categoryId: 'sandes', price: 0.7 },
  { id: 'pao-fiambre', name: 'Pao c/ fiambre', categoryId: 'sandes', price: 1 },
  { id: 'pao-queijo', name: 'Pao c/ queijo', categoryId: 'sandes', price: 1 },
  { id: 'sandes-mista', name: 'Sandes mista', categoryId: 'sandes', price: 1.5 },
  { id: 'pao-chourico', name: 'Pao c/ chourico', categoryId: 'sandes', price: 1.5 },
  { id: 'bifana', name: 'Bifana', categoryId: 'sandes', price: 2 },
  { id: 'sopa-pequena', name: 'Sopa pequena', categoryId: 'sandes', price: 1.25 },
  { id: 'sopa-grande', name: 'Sopa grande', categoryId: 'sandes', price: 2.5 },
  { id: 'cachorro-frio', name: 'C. frio', categoryId: 'sandes', price: 2.2 },
  { id: 'leitao', name: 'Leitao', categoryId: 'sandes', price: 2 },

  { id: 'kit-kat', name: 'Kit Kat', categoryId: 'chocolates', price: 1.2 },
  { id: 'kinder', name: 'Kinder', categoryId: 'chocolates', price: 2.7 },
  { id: 'pastilhas', name: 'Pastilhas', categoryId: 'chocolates', price: 1 },
  { id: 'rebu-bayard', name: 'Reb. Dr. Bayard', categoryId: 'chocolates', price: 0.1 },
  { id: 'rebu-frutas', name: 'Reb. frutas', categoryId: 'chocolates', price: 0.05 },

  { id: 'imperial', name: 'Imperial', categoryId: 'alcool', price: 1.1 },
  { id: 'mini', name: 'Mini', categoryId: 'alcool', price: 1.1 },
  { id: 'media', name: 'Media', categoryId: 'alcool', price: 1.2 },
  { id: 'martini', name: 'Martini', categoryId: 'alcool', price: 1 },
  { id: 'martini-imperial', name: 'Martini c/ imperial', categoryId: 'alcool', price: 2 },
  { id: 'favaios', name: 'Favaios', categoryId: 'alcool', price: 1 },
  { id: 'favaios-imperial', name: 'Favaios c/ imperial', categoryId: 'alcool', price: 2 },
  { id: 'favaios-martini-cerveja', name: 'Favaios e Martini c/ cerveja', categoryId: 'alcool', price: 1.75 },
  { id: 'ginja', name: 'Ginja', categoryId: 'alcool', price: 1.2 },
  { id: 'whisky-novo', name: 'Whisky novo', categoryId: 'alcool', price: 1.6 },
  { id: 'whisky-velho', name: 'Whisky velho', categoryId: 'alcool', price: 2 },
  { id: 'beirao', name: 'Beirao', categoryId: 'alcool', price: 1.6 },
  { id: 'aguardente-velha', name: 'Ag. velha', categoryId: 'alcool', price: 2 },
  { id: 'macieira', name: 'Macieira', categoryId: 'alcool', price: 1.5 },
  { id: 'brandy-mel', name: 'Brandy mel', categoryId: 'alcool', price: 1.3 },
  { id: 'sao-domingos', name: 'Sao Domingos', categoryId: 'alcool', price: 1.5 },
  { id: 'alianca-velha', name: 'Alianca velha', categoryId: 'alcool', price: 2 },
  { id: 'meio-bagaco', name: '1/2 bagaco', categoryId: 'alcool', price: 1 },
  { id: 'bagaco', name: 'Bagaco', categoryId: 'alcool', price: 1.3 }
];

export const DEFAULT_SETTINGS = {
  businessName: 'Registadora ARCB',
  nextOrderNumber: 1,
  catalogVersion: CATALOG_VERSION
};

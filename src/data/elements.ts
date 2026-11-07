export type Category =
  | 'alkali'
  | 'alkaline-earth'
  | 'transition'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'

export interface Element {
  /** Atomic number — also the student's order in the class list. */
  z: number
  symbol: string
  name: string
  /** Standard atomic weight; bracketed mass number for elements with no stable isotopes. */
  mass: string
  category: Category
  /** Grid row (1–7 main table, 9–10 for the f-block rows shown below). */
  row: number
  col: number
  period: number
  /** Group 1–18, or null for the f-block. */
  group: number | null
  fact: string
}

export const CATEGORY_LABEL: Record<Category, string> = {
  alkali: 'Alkali metal',
  'alkaline-earth': 'Alkaline earth',
  transition: 'Transition metal',
  'post-transition': 'Post-transition',
  metalloid: 'Metalloid',
  nonmetal: 'Nonmetal',
  halogen: 'Halogen',
  'noble-gas': 'Noble gas',
  lanthanide: 'Lanthanide',
  actinide: 'Actinide',
}

export const CATEGORY_ORDER: Category[] = [
  'alkali',
  'alkaline-earth',
  'transition',
  'post-transition',
  'metalloid',
  'nonmetal',
  'halogen',
  'noble-gas',
  'lanthanide',
  'actinide',
]

type Raw = [symbol: string, name: string, mass: string, fact: string]

// Index 0 = hydrogen (z = 1).
const RAW: Raw[] = [
  ['H', 'Hydrogen', '1.008', 'Hydrogen makes up about three-quarters of all normal matter in the universe, and fusing it is what makes the Sun shine.'],
  ['He', 'Helium', '4.0026', 'Helium was discovered in the light of the Sun in 1868 — years before anyone found it on Earth.'],
  ['Li', 'Lithium', '6.94', 'Lithium is the lightest metal of all — light enough to float on water. It powers the battery in your phone.'],
  ['Be', 'Beryllium', '9.0122', 'X-rays pass almost straight through beryllium, so it is used as the "window" in X-ray machines.'],
  ['B', 'Boron', '10.81', 'Boron compounds burn with a bright green flame, and borosilicate glass with boron survives sudden heating.'],
  ['C', 'Carbon', '12.011', 'Diamond and the graphite in your pencil are both pure carbon — the atoms are just arranged differently.'],
  ['N', 'Nitrogen', '14.007', 'About 78% of every breath you take is nitrogen. Liquid nitrogen boils at −196 °C.'],
  ['O', 'Oxygen', '15.999', 'Liquid oxygen is pale blue — and it sticks to a strong magnet!'],
  ['F', 'Fluorine', '18.998', 'Fluorine is the most reactive element: it even forces "unreactive" xenon to form compounds.'],
  ['Ne', 'Neon', '20.180', 'Pure neon glows red-orange. Signs in other colours usually use different gases or coloured tubes.'],
  ['Na', 'Sodium', '22.990', "Sodium is so reactive it's kept under oil. Drop a piece in water and it fizzes, zips around — and can even burst into flame."],
  ['Mg', 'Magnesium', '24.305', 'Magnesium burns with a dazzling white light — early photographers used it as a camera flash.'],
  ['Al', 'Aluminium', '26.982', 'Aluminium was once more precious than gold; Napoleon III saved aluminium cutlery for his most honoured guests.'],
  ['Si', 'Silicon', '28.085', 'Silicon is the second most common element in Earth\'s crust and the heart of every computer chip.'],
  ['P', 'Phosphorus', '30.974', 'White phosphorus glows in the dark as it slowly reacts with oxygen — that is where the word "phosphorescence" comes from.'],
  ['S', 'Sulfur', '32.06', 'Sulfur burns with a blue flame. The "rotten egg" smell is hydrogen sulfide, not sulfur itself.'],
  ['Cl', 'Chlorine', '35.45', 'Chlorine is a poisonous gas on its own, but joined with sodium it becomes ordinary table salt.'],
  ['Ar', 'Argon', '39.948', 'Argon makes up almost 1% of the air — over 20 times more than carbon dioxide.'],
  ['K', 'Potassium', '39.098', 'Potassium reacts with water so violently it bursts into a lilac flame. Bananas are a tasty, safe source of it.'],
  ['Ca', 'Calcium', '40.078', 'Calcium is the most abundant metal in your body — about 1 kg of it is in your bones and teeth.'],
  ['Sc', 'Scandium', '44.956', 'A pinch of scandium makes aluminium alloys much stronger — used in some bike frames and baseball bats.'],
  ['Ti', 'Titanium', '47.867', 'Titanium is as strong as many steels but about 45% lighter, and the body accepts it — perfect for implants.'],
  ['V', 'Vanadium', '50.942', 'Henry Ford used tough vanadium steel to build the famous Model T car.'],
  ['Cr', 'Chromium', '51.996', 'Traces of chromium give rubies their red colour and emeralds their green.'],
  ['Mn', 'Manganese', '54.938', 'Manganese dioxide is inside ordinary alkaline batteries, like the ones in a TV remote.'],
  ['Fe', 'Iron', '55.845', "Earth's core is mostly iron — and iron in your blood's haemoglobin carries oxygen to every cell."],
  ['Co', 'Cobalt', '58.933', 'Cobalt gives glass and pottery the deep "cobalt blue" colour, used for centuries.'],
  ['Ni', 'Nickel', '58.693', 'Many meteorites are made of an iron–nickel alloy that fell from space.'],
  ['Cu', 'Copper', '63.546', 'The Statue of Liberty is covered in copper — its green colour is a coating called patina.'],
  ['Zn', 'Zinc', '65.38', 'A zinc coating (galvanising) stops steel from rusting, even where it gets scratched.'],
  ['Ga', 'Gallium', '69.723', 'Gallium melts at about 30 °C — it can melt in the palm of your hand.'],
  ['Ge', 'Germanium', '72.630', 'Mendeleev predicted germanium\'s properties 15 years before it was discovered in 1886.'],
  ['As', 'Arsenic', '74.922', 'Arsenic was a notorious poison in history, but gallium arsenide is used in LEDs and solar cells today.'],
  ['Se', 'Selenium', '78.971', 'Selenium conducts electricity better in light, which made it useful in early photocopiers.'],
  ['Br', 'Bromine', '79.904', 'Bromine is one of only two elements that are liquid at room temperature — the other is mercury.'],
  ['Kr', 'Krypton', '83.798', 'From 1960 to 1983 the metre was officially defined using the orange light given off by krypton.'],
  ['Rb', 'Rubidium', '85.468', 'Rubidium melts at just 39 °C and is used in atomic clocks, including some GPS satellites.'],
  ['Sr', 'Strontium', '87.62', 'Strontium compounds give fireworks their brilliant red colour.'],
  ['Y', 'Yttrium', '88.906', 'Yttrium is named after Ytterby, a Swedish village that also gave its name to ytterbium, terbium and erbium.'],
  ['Zr', 'Zirconium', '91.224', 'Zirconium hardly absorbs neutrons, so it is used to wrap the fuel inside nuclear reactors.'],
  ['Nb', 'Niobium', '92.906', 'Niobium–titanium wire makes the superconducting magnets in hospital MRI scanners.'],
  ['Mo', 'Molybdenum', '95.95', 'Molybdenum helps steel survive extreme heat, and plants need a tiny amount to use nitrogen.'],
  ['Tc', 'Technetium', '[98]', 'Technetium was the first element made artificially (1937). It has no stable isotopes at all.'],
  ['Ru', 'Ruthenium', '101.07', 'A little ruthenium makes platinum and palladium harder — handy for long-lasting electrical contacts.'],
  ['Rh', 'Rhodium', '102.91', 'Rhodium is one of the rarest, most expensive metals; it cleans exhaust gases in car catalytic converters.'],
  ['Pd', 'Palladium', '106.42', 'Palladium can soak up around 900 times its own volume of hydrogen gas.'],
  ['Ag', 'Silver', '107.87', 'Silver conducts electricity and heat better than any other metal.'],
  ['Cd', 'Cadmium', '112.41', 'Cadmium was used in rechargeable Ni-Cd batteries and gives artists a bright "cadmium yellow".'],
  ['In', 'Indium', '114.82', 'Indium tin oxide is the see-through conductor that makes touchscreens work.'],
  ['Sn', 'Tin', '118.71', 'Bend a bar of tin and it makes a crackling sound called the "tin cry".'],
  ['Sb', 'Antimony', '121.76', 'In ancient Egypt, ground-up antimony sulfide (stibnite) was used as black eye make-up.'],
  ['Te', 'Tellurium', '127.60', 'Even a tiny dose of tellurium can make a person\'s breath smell strongly of garlic.'],
  ['I', 'Iodine', '126.90', 'Your thyroid needs iodine, which is why it is added to salt. Heated iodine gives off a violet vapour.'],
  ['Xe', 'Xenon', '131.29', 'Xenon gives some car headlights and cinema projectors their brilliant white light.'],
  ['Cs', 'Caesium', '132.91', 'The second is officially defined by caesium atoms — and caesium melts at about 28 °C.'],
  ['Ba', 'Barium', '137.33', 'Patients drink a barium "meal" so their stomach shows up clearly on an X-ray.'],
  ['La', 'Lanthanum', '138.91', 'Lanthanum is added to camera and telescope lenses to help them bend light sharply.'],
  ['Ce', 'Cerium', '140.12', 'The "flint" in a lighter is mostly cerium — scrape it and it throws sparks.'],
  ['Pr', 'Praseodymium', '140.91', 'Praseodymium is in the special glass of glassblowers\' and welders\' goggles.'],
  ['Nd', 'Neodymium', '144.24', 'Neodymium magnets are the strongest permanent magnets — found in earbuds and electric motors.'],
  ['Pm', 'Promethium', '[145]', 'Promethium is radioactive and extremely rare in nature; it was once used in glowing watch dials.'],
  ['Sm', 'Samarium', '150.36', 'Samarium–cobalt magnets keep their strength even at high temperatures.'],
  ['Eu', 'Europium', '151.96', 'Europium glows red under UV light — it helps protect euro banknotes against forgery.'],
  ['Gd', 'Gadolinium', '157.25', 'Gadolinium is injected as a contrast agent to make MRI images clearer.'],
  ['Tb', 'Terbium', '158.93', 'Terbium gives the green glow in many fluorescent lamps and screens.'],
  ['Dy', 'Dysprosium', '162.50', 'Dysprosium helps the magnets in electric-car motors stay strong when they get hot.'],
  ['Ho', 'Holmium', '164.93', 'Holmium has one of the strongest magnetic responses of any element, used to focus powerful magnetic fields.'],
  ['Er', 'Erbium', '167.26', 'Erbium-doped fibres boost the light signals that carry the internet under the oceans.'],
  ['Tm', 'Thulium', '168.93', 'Thulium is one of the rarest lanthanides and is used in some portable X-ray devices.'],
  ['Yb', 'Ytterbium', '173.05', 'Ytterbium atoms tick inside some of the most precise atomic clocks ever built.'],
  ['Lu', 'Lutetium', '174.97', 'Lutetium is the densest and hardest of the lanthanides.'],
  ['Hf', 'Hafnium', '178.49', 'Hafnium was discovered in Copenhagen in 1923 — "Hafnia" is the Latin name of the city.'],
  ['Ta', 'Tantalum', '180.95', 'Tiny tantalum capacitors are inside almost every smartphone.'],
  ['W', 'Tungsten', '183.84', 'Tungsten has the highest melting point of any metal — about 3,400 °C.'],
  ['Re', 'Rhenium', '186.21', 'Rhenium (1925) was the last stable element to be discovered.'],
  ['Os', 'Osmium', '190.23', 'Osmium is the densest naturally occurring element — a football-sized lump would weigh over 100 kg.'],
  ['Ir', 'Iridium', '192.22', 'A thin layer of iridium-rich clay around the world is evidence of the asteroid that wiped out the dinosaurs.'],
  ['Pt', 'Platinum', '195.08', 'The old international prototype kilogram was made of platinum and iridium because they barely react.'],
  ['Au', 'Gold', '196.97', 'All the gold ever mined would fit in a cube only about 22 metres on each side.'],
  ['Hg', 'Mercury', '200.59', 'Mercury is the only metal that is liquid at room temperature.'],
  ['Tl', 'Thallium', '204.38', 'Thallium is highly toxic and was once used as rat poison.'],
  ['Pb', 'Lead', '207.2', 'Pb comes from the Latin "plumbum" — the Romans made water pipes of lead, which gave us the word "plumber".'],
  ['Bi', 'Bismuth', '208.98', 'Bismuth forms rainbow-coloured, staircase-shaped crystals, and it is in some stomach medicines.'],
  ['Po', 'Polonium', '[209]', 'Marie and Pierre Curie discovered polonium and named it after Poland, Marie\'s homeland.'],
  ['At', 'Astatine', '[210]', 'Astatine is so rare that there is thought to be less than 30 grams of it in Earth\'s crust at any moment.'],
  ['Rn', 'Radon', '[222]', 'Radon is a radioactive gas that can quietly build up in basements, so homes are tested for it.'],
  ['Fr', 'Francium', '[223]', 'Francium is so unstable that its longest-lived isotope lasts only about 22 minutes (half-life).'],
  ['Ra', 'Radium', '[226]', 'Radium glows faintly; it was once painted on watch dials — a very dangerous idea.'],
  ['Ac', 'Actinium', '[227]', 'Actinium is so radioactive that it glows a pale blue in the dark.'],
  ['Th', 'Thorium', '232.04', 'Thorium is named after Thor, the Norse god of thunder.'],
  ['Pa', 'Protactinium', '231.04', 'Protactinium is one of the rarest and most expensive naturally occurring elements.'],
  ['U', 'Uranium', '238.03', 'One small uranium fuel pellet can release about as much energy as a tonne of coal.'],
  ['Np', 'Neptunium', '[237]', 'Neptunium was named after the planet Neptune — the next planet after Uranus, like the next element after uranium.'],
  ['Pu', 'Plutonium', '[244]', 'Plutonium power sources still keep the Voyager probes talking to Earth from interstellar space.'],
  ['Am', 'Americium', '[243]', 'A tiny speck of americium sits inside many household smoke detectors.'],
  ['Cm', 'Curium', '[247]', 'Curium is named in honour of Marie and Pierre Curie.'],
  ['Bk', 'Berkelium', '[247]', 'Berkelium is named after Berkeley, California, where it was first made in 1949.'],
  ['Cf', 'Californium', '[251]', 'Californium gives off so many neutrons that it is used to help start up nuclear reactors.'],
  ['Es', 'Einsteinium', '[252]', 'Einsteinium was first found in the debris of the first hydrogen-bomb test in 1952.'],
  ['Fm', 'Fermium', '[257]', 'Fermium was also found in H-bomb debris and is named after physicist Enrico Fermi.'],
  ['Md', 'Mendelevium', '[258]', 'Mendelevium honours Dmitri Mendeleev, the creator of the periodic table.'],
  ['No', 'Nobelium', '[259]', 'Nobelium is named after Alfred Nobel, founder of the Nobel Prizes.'],
  ['Lr', 'Lawrencium', '[266]', 'Lawrencium is named after Ernest Lawrence, inventor of the cyclotron particle accelerator.'],
  ['Rf', 'Rutherfordium', '[267]', 'Rutherfordium honours Ernest Rutherford, who discovered the atomic nucleus.'],
  ['Db', 'Dubnium', '[268]', 'Dubnium is named after Dubna, a Russian town famous for its nuclear research lab.'],
  ['Sg', 'Seaborgium', '[269]', 'Seaborgium was the first element named after a person who was still alive — Glenn Seaborg.'],
  ['Bh', 'Bohrium', '[270]', 'Bohrium honours Niels Bohr, who pictured electrons orbiting in shells.'],
  ['Hs', 'Hassium', '[269]', 'Hassium is named after the German state of Hesse, where it was first made.'],
  ['Mt', 'Meitnerium', '[278]', 'Meitnerium honours Lise Meitner, who helped explain nuclear fission.'],
  ['Ds', 'Darmstadtium', '[281]', 'Darmstadtium is named after Darmstadt, Germany, the city where it was created.'],
  ['Rg', 'Roentgenium', '[282]', 'Roentgenium honours Wilhelm Röntgen, who discovered X-rays.'],
  ['Cn', 'Copernicium', '[285]', 'Copernicium is named after Copernicus, who put the Sun at the centre of the solar system.'],
  ['Nh', 'Nihonium', '[286]', 'Nihonium was the first element discovered in Asia — "Nihon" means Japan.'],
  ['Fl', 'Flerovium', '[289]', 'Flerovium is named after the Flerov Laboratory in Dubna, Russia.'],
  ['Mc', 'Moscovium', '[290]', 'Moscovium is named after the Moscow region of Russia.'],
  ['Lv', 'Livermorium', '[293]', 'Livermorium honours Lawrence Livermore National Laboratory in California.'],
  ['Ts', 'Tennessine', '[294]', 'Tennessine is named after the US state of Tennessee, home of the Oak Ridge lab.'],
  ['Og', 'Oganesson', '[294]', 'Oganesson is the heaviest element known, named after physicist Yuri Oganessian while he was still alive.'],
]

function position(z: number): [row: number, col: number] {
  if (z === 1) return [1, 1]
  if (z === 2) return [1, 18]
  if (z <= 4) return [2, z - 2]
  if (z <= 10) return [2, z + 8]
  if (z <= 12) return [3, z - 10]
  if (z <= 18) return [3, z]
  if (z <= 36) return [4, z - 18]
  if (z <= 54) return [5, z - 36]
  if (z <= 56) return [6, z - 54]
  if (z <= 71) return [9, z - 54]
  if (z <= 86) return [6, z - 68]
  if (z <= 88) return [7, z - 86]
  if (z <= 103) return [10, z - 86]
  return [7, z - 100]
}

const has = (list: number[], z: number) => list.includes(z)

function categoryOf(z: number): Category {
  if (has([3, 11, 19, 37, 55, 87], z)) return 'alkali'
  if (has([4, 12, 20, 38, 56, 88], z)) return 'alkaline-earth'
  if (has([2, 10, 18, 36, 54, 86, 118], z)) return 'noble-gas'
  if (has([9, 17, 35, 53, 85, 117], z)) return 'halogen'
  if (has([5, 14, 32, 33, 51, 52], z)) return 'metalloid'
  if (has([1, 6, 7, 8, 15, 16, 34], z)) return 'nonmetal'
  if (z >= 57 && z <= 71) return 'lanthanide'
  if (z >= 89 && z <= 103) return 'actinide'
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112))
    return 'transition'
  return 'post-transition'
}

export const ELEMENTS: Element[] = RAW.map(([symbol, name, mass, fact], i) => {
  const z = i + 1
  const [row, col] = position(z)
  const fBlock = row >= 9
  return {
    z,
    symbol,
    name,
    mass,
    fact,
    category: categoryOf(z),
    row,
    col,
    period: fBlock ? row - 3 : row,
    group: fBlock ? null : col,
  }
})

export const MAX_STUDENTS = ELEMENTS.length

export function elementFor(order: number): Element | undefined {
  return ELEMENTS[order - 1]
}

import { ELEMENTS, type Category } from './elements'

/*
 * What each element looks like "in real life", for the 3-D sample in the element card.
 *   form   — the shape the sample takes
 *   color  — main colour (hex)
 *   glow   — for gases: the colour it glows in a discharge tube (noble gases, H); omit = colourless
 *   vi/en  — one line: what it looks like + where students meet it
 */
export type Form =
  | 'nugget' // rough lump of metal
  | 'ingot' // cast bar / cube of metal
  | 'crystal' // cluster of crystals
  | 'powder' // heap of powder on a watch glass
  | 'gas' // sealed glass tube
  | 'liquid' // liquid in a vial
  | 'droplets' // liquid metal beads in a dish
  | 'unknown' // synthetic: only a few atoms ever made

export interface Look {
  form: Form
  color: string
  glow?: string
  /** Shiny metal? (metalness) */
  shiny?: boolean
  radioactive?: boolean
  vi: string
  en: string
}

type Row = [z: number, form: Form, color: string, vi: string, en: string, extra?: Partial<Look>]

const ROWS: Row[] = [
  [1, 'gas', '#e8f1ff', 'Khí không màu, nhẹ nhất; phát sáng hồng tím trong ống phóng điện. Có trong nước, khí cầu, nhiên liệu tên lửa.', 'Colourless, the lightest gas; glows pink-violet in a discharge tube. In water, balloons and rocket fuel.', { glow: '#ff7ad9' }],
  [2, 'gas', '#fff2e0', 'Khí không màu, rất nhẹ; phát sáng cam hồng. Bơm bóng bay, làm lạnh máy MRI.', 'Colourless, very light; glows orange-pink. Party balloons, cooling MRI magnets.', { glow: '#ffb070' }],
  [3, 'nugget', '#c9ccc4', 'Kim loại mềm, trắng bạc, nhẹ nhất, nổi trên dầu. Trong pin điện thoại, xe điện.', 'Soft silvery metal, the lightest, floats on oil. In phone and EV batteries.', { shiny: true }],
  [4, 'nugget', '#9fa6a3', 'Kim loại xám thép, cứng, nhẹ. Trong lò xo, dụng cụ vũ trụ, gương kính thiên văn.', 'Steel-grey, hard, light metal. Springs, spacecraft parts, telescope mirrors.', { shiny: true }],
  [5, 'powder', '#3b2f2a', 'Chất rắn đen nâu, rất cứng. Trong thuỷ tinh chịu nhiệt (Pyrex), bột giặt (borax).', 'Brown-black, very hard solid. In heat-proof glass (Pyrex) and borax.'],
  [6, 'nugget', '#2b2b2b', 'Than chì đen mềm (ruột bút chì), kim cương trong suốt. Có trong mọi sinh vật.', 'Soft black graphite (pencil lead) or clear diamond. In every living thing.'],
  [7, 'gas', '#e6ecff', 'Khí không màu, chiếm 78% không khí; phát sáng tím hồng. Trong phân đạm, túi khí ô tô.', 'Colourless gas, 78% of air; glows violet-pink. Fertiliser, car airbags.', { glow: '#c48cff' }],
  [8, 'gas', '#e6f4ff', 'Khí không màu, 21% không khí; ta hít thở nó. Lỏng thì màu xanh nhạt.', 'Colourless gas, 21% of air; what we breathe. Pale blue as a liquid.', { glow: '#9fd0ff' }],
  [9, 'gas', '#e9f5b8', 'Khí vàng nhạt, rất độc và hoạt động mạnh. Trong kem đánh răng (fluoride), chảo chống dính.', 'Pale yellow, very toxic and reactive gas. In toothpaste (fluoride) and non-stick pans.'],
  [10, 'gas', '#ffd9c9', 'Khí không màu; phát sáng đỏ cam rực rỡ — đèn neon quảng cáo.', 'Colourless gas that glows bright orange-red — neon signs.', { glow: '#ff5a2a' }],
  [11, 'nugget', '#d9dcd6', 'Kim loại mềm như sáp, cắt được bằng dao, bảo quản trong dầu. Trong muối ăn (NaCl).', 'Soft as wax, cut with a knife, kept under oil. In table salt (NaCl).', { shiny: true }],
  [12, 'nugget', '#cfd6d0', 'Kim loại trắng bạc, nhẹ, cháy sáng chói. Trong pháo hoa, khung xe đạp, lá cây (diệp lục).', 'Light silvery metal, burns with a dazzling flame. Fireworks, bike frames, chlorophyll.', { shiny: true }],
  [13, 'ingot', '#d8dcdc', 'Kim loại nhẹ, trắng bạc, không gỉ. Lon nước ngọt, giấy bạc, khung cửa.', 'Light silvery metal that does not rust. Drink cans, kitchen foil, window frames.', { shiny: true }],
  [14, 'nugget', '#5c6670', 'Tinh thể xám ánh kim. Trong cát (SiO₂), chip máy tính, pin mặt trời, thuỷ tinh.', 'Grey metallic-looking crystals. Sand (SiO₂), computer chips, solar panels, glass.', { shiny: true }],
  [15, 'powder', '#c8463a', 'Phosphorus đỏ: bột đỏ nâu trên vỏ bao diêm; phosphorus trắng cháy trong không khí.', 'Red phosphorus: red-brown powder on matchbox strikers; white phosphorus burns in air.'],
  [16, 'crystal', '#f2d33c', 'Tinh thể vàng tươi, giòn. Gần núi lửa, trong diêm, thuốc trừ sâu, lốp xe.', 'Bright yellow brittle crystals. Near volcanoes; matches, pesticides, tyres.'],
  [17, 'gas', '#c9e86a', 'Khí vàng lục, mùi hắc, độc. Trong muối ăn, nước Javel, nước bể bơi.', 'Yellow-green gas with a sharp smell, toxic. Salt, bleach, swimming-pool water.'],
  [18, 'gas', '#e0d6ff', 'Khí không màu, trơ; phát sáng tím xanh. Trong bóng đèn sợi đốt, hàn kim loại.', 'Colourless inert gas; glows violet-blue. Light bulbs, metal welding.', { glow: '#9a7bff' }],
  [19, 'nugget', '#d6d9d3', 'Kim loại mềm, trắng bạc, nổ khi gặp nước. Trong chuối, phân bón (kali).', 'Soft silvery metal, explodes in water. Bananas, potash fertiliser.', { shiny: true }],
  [20, 'nugget', '#d2d7cf', 'Kim loại xám bạc, mềm. Trong xương, răng, vỏ trứng, đá vôi, xi măng.', 'Soft grey-silver metal. Bones, teeth, eggshells, limestone, cement.', { shiny: true }],
  [21, 'nugget', '#c6ccc9', 'Kim loại trắng bạc, nhẹ. Trong hợp kim nhôm cho máy bay, đèn pha sân vận động.', 'Light silvery metal. Aluminium alloys for aircraft, stadium floodlights.', { shiny: true }],
  [22, 'nugget', '#b9bfc2', 'Kim loại xám bạc, bền và nhẹ, không gỉ. Khớp nhân tạo, máy bay, sơn trắng (TiO₂).', 'Strong, light grey metal that never rusts. Artificial joints, aircraft, white paint (TiO₂).', { shiny: true }],
  [23, 'nugget', '#aeb5b9', 'Kim loại xám thép. Làm thép cứng cho cờ lê, lò xo, khung xe.', 'Steel-grey metal. Toughens steel for spanners, springs, car frames.', { shiny: true }],
  [24, 'ingot', '#dfe3e6', 'Kim loại sáng bóng, cứng. Mạ crôm trên vòi nước, xe máy; thép không gỉ; màu đỏ của hồng ngọc.', 'Bright hard metal. Chrome plating on taps and bikes; stainless steel; the red of rubies.', { shiny: true }],
  [25, 'nugget', '#b0b7bb', 'Kim loại xám, giòn. Trong thép đường ray, pin thông thường, màu tím của thạch anh tím.', 'Grey brittle metal. Rail steel, ordinary batteries, the purple of amethyst.', { shiny: true }],
  [26, 'nugget', '#8a8f93', 'Kim loại xám, nặng, bị gỉ đỏ. Đinh, dao, cầu, xe hơi; trong máu (hemoglobin).', 'Heavy grey metal that rusts red. Nails, knives, bridges, cars; in blood (haemoglobin).', { shiny: true }],
  [27, 'nugget', '#9ba3a8', 'Kim loại xám bạc, từ tính. Màu xanh coban trên gốm sứ, pin lithium, vitamin B12.', 'Silvery magnetic metal. Cobalt-blue glaze on pottery, lithium batteries, vitamin B12.', { shiny: true }],
  [28, 'ingot', '#c9cdc9', 'Kim loại trắng bạc, bóng, không gỉ. Đồng xu, pin sạc, thép không gỉ.', 'Shiny silvery metal that resists rust. Coins, rechargeable batteries, stainless steel.', { shiny: true }],
  [29, 'ingot', '#c97a4a', 'Kim loại đỏ cam, dẫn điện tốt. Dây điện, nồi, tượng; lên gỉ xanh (ten đồng).', 'Orange-red metal, great conductor. Electric wires, pans, statues; turns green with age.', { shiny: true }],
  [30, 'ingot', '#c2c8cc', 'Kim loại xám xanh. Mạ kẽm tôn lợp mái, vỏ pin, kem chống nắng (ZnO).', 'Blue-grey metal. Galvanised roofing sheets, battery cases, sunscreen (ZnO).', { shiny: true }],
  [31, 'droplets', '#cfd4d6', 'Kim loại bạc chảy lỏng trong lòng bàn tay (nóng chảy ở 30 °C). Trong đèn LED, chip điện thoại.', 'Silvery metal that melts in your hand (30 °C). LEDs, phone chips.', { shiny: true }],
  [32, 'nugget', '#9aa0a6', 'Á kim xám bạc, giòn, ánh kim. Trong cáp quang, kính hồng ngoại, bóng bán dẫn đầu tiên.', 'Brittle grey-silver metalloid. Fibre optics, infrared lenses, the first transistors.', { shiny: true }],
  [33, 'nugget', '#7d8287', 'Chất rắn xám ánh kim, rất độc ("thạch tín"). Trong thuốc trừ sâu cũ, bảo quản gỗ.', 'Grey metallic-looking solid, very poisonous. Old pesticides, wood preservative.', { shiny: true }],
  [34, 'nugget', '#5a5658', 'Chất rắn xám. Trong máy photocopy, dầu gội trị gàu, hạt điều và cá.', 'Grey solid. Photocopiers, anti-dandruff shampoo, Brazil nuts and fish.'],
  [35, 'liquid', '#8a2b14', 'Chất lỏng nâu đỏ, bốc khói nâu, mùi hắc. Trong thuốc nhuộm, phim ảnh, chất chống cháy.', 'Red-brown liquid giving off brown fumes. Dyes, photographic film, flame retardants.'],
  [36, 'gas', '#f0f4ff', 'Khí không màu, hiếm; phát sáng trắng xanh. Đèn flash máy ảnh, đèn pha xe hơi.', 'Rare colourless gas; glows blue-white. Camera flashes, car headlamps.', { glow: '#d6e4ff' }],
  [37, 'nugget', '#d7dad4', 'Kim loại rất mềm, bắt lửa trong không khí. Trong đồng hồ nguyên tử, pháo hoa màu tím.', 'Very soft metal that ignites in air. Atomic clocks, purple fireworks.', { shiny: true }],
  [38, 'nugget', '#d3d8d1', 'Kim loại mềm, trắng bạc. Cho màu đỏ rực của pháo hoa và pháo sáng.', 'Soft silvery metal. The brilliant red of fireworks and flares.', { shiny: true }],
  [39, 'nugget', '#c3c9c6', 'Kim loại xám bạc. Trong đèn LED trắng, laser phẫu thuật, màn hình TV cũ.', 'Grey-silver metal. White LEDs, surgical lasers, old TV screens.', { shiny: true }],
  [40, 'nugget', '#bfc5c7', 'Kim loại xám bạc, chịu ăn mòn. Vỏ thanh nhiên liệu hạt nhân, "kim cương" nhân tạo (zirconia).', 'Corrosion-proof grey metal. Nuclear fuel cladding, fake diamonds (zirconia).', { shiny: true }],
  [41, 'nugget', '#b5bbc0', 'Kim loại xám mềm, ánh xanh khi oxi hoá. Nam châm siêu dẫn, đường ống dẫn khí.', 'Soft grey metal, bluish when oxidised. Superconducting magnets, gas pipelines.', { shiny: true }],
  [42, 'nugget', '#9ea5aa', 'Kim loại xám, chịu nhiệt rất cao. Thép dụng cụ, mũi khoan, enzyme trong cơ thể.', 'Grey metal with a very high melting point. Tool steel, drill bits, enzymes in the body.', { shiny: true }],
  [43, 'unknown', '#b8bec3', 'Kim loại phóng xạ, hầu như không có trong tự nhiên. Dùng chụp hình y học (xạ hình).', 'Radioactive metal, almost absent in nature. Medical imaging scans.', { radioactive: true }],
  [44, 'nugget', '#aab1b6', 'Kim loại cứng, xám bạc, hiếm. Ngòi bút máy cao cấp, tiếp điểm điện.', 'Hard rare grey metal. Premium fountain-pen nibs, electrical contacts.', { shiny: true }],
  [45, 'nugget', '#d3d7da', 'Kim loại trắng bạc, rất đắt. Bộ lọc khí thải xe hơi, mạ trang sức.', 'Silvery-white, very expensive metal. Car catalytic converters, jewellery plating.', { shiny: true }],
  [46, 'nugget', '#cfd3d5', 'Kim loại trắng bạc, mềm. Bộ lọc khí thải, răng giả, điện thoại.', 'Soft silvery-white metal. Catalytic converters, dental work, phones.', { shiny: true }],
  [47, 'ingot', '#e4e7e8', 'Kim loại trắng sáng, dẫn điện tốt nhất. Trang sức, gương, tiền xu cổ, bị xỉn đen.', 'Brilliant white metal, the best conductor. Jewellery, mirrors, old coins; tarnishes black.', { shiny: true }],
  [48, 'nugget', '#c5cacc', 'Kim loại mềm, xanh bạc, độc. Pin Ni-Cd, màu vàng cadmium trong sơn vẽ.', 'Soft bluish-silver toxic metal. Ni-Cd batteries, cadmium-yellow artists’ paint.', { shiny: true }],
  [49, 'nugget', '#d0d4d5', 'Kim loại rất mềm, kêu "rít" khi bẻ. Màn hình cảm ứng (ITO), hàn vi mạch.', 'Very soft metal that "cries" when bent. Touchscreens (ITO), chip soldering.', { shiny: true }],
  [50, 'ingot', '#d5d8d8', 'Kim loại trắng bạc mềm. Lớp mạ hộp "thiếc", thiếc hàn, chuông đồng thiếc.', 'Soft silvery metal. Tin-plated cans, solder, bronze bells.', { shiny: true }],
  [51, 'nugget', '#9fa7ad', 'Á kim xám bạc, giòn. Chất chống cháy, pin chì, phấn mắt cổ (kohl).', 'Brittle grey metalloid. Flame retardants, lead batteries, ancient eye make-up (kohl).', { shiny: true }],
  [52, 'nugget', '#9a9ea3', 'Á kim xám bạc, ánh kim. Trong pin mặt trời, đĩa DVD ghi lại, hợp kim thép.', 'Silvery-grey metalloid. Solar cells, rewritable DVDs, steel alloys.', { shiny: true }],
  [53, 'crystal', '#3a2340', 'Tinh thể tím đen ánh kim, bốc hơi tím khi đun. Thuốc sát trùng, muối i-ốt, tuyến giáp.', 'Dark violet shiny crystals giving purple vapour when warmed. Antiseptic, iodised salt, thyroid.', { shiny: true }],
  [54, 'gas', '#dbe8ff', 'Khí không màu, nặng, rất hiếm; phát sáng xanh lam. Đèn pha xenon, động cơ ion của vệ tinh.', 'Heavy rare colourless gas; glows blue. Xenon headlamps, ion engines on satellites.', { glow: '#6fa8ff' }],
  [55, 'droplets', '#e6d27a', 'Kim loại vàng nhạt, mềm, chảy lỏng ở 28 °C, nổ trong nước. Đồng hồ nguyên tử định nghĩa giây.', 'Pale-gold soft metal, liquid at 28 °C, explodes in water. Atomic clocks define the second.', { shiny: true }],
  [56, 'nugget', '#cfd4cd', 'Kim loại mềm, trắng bạc. Pháo hoa xanh lá, "uống bari" khi chụp X-quang dạ dày.', 'Soft silvery metal. Green fireworks, the "barium meal" for stomach X-rays.', { shiny: true }],
  [57, 'nugget', '#c8cdcb', 'Kim loại mềm, trắng bạc, mờ dần trong không khí. Thấu kính máy ảnh, pin xe hybrid.', 'Soft silvery metal that tarnishes in air. Camera lenses, hybrid-car batteries.', { shiny: true }],
  [58, 'nugget', '#c5cac8', 'Kim loại xám bạc, toé lửa khi cạo. Đá lửa bật lửa, bột đánh bóng kính.', 'Grey-silver metal that sparks when scraped. Lighter flints, glass polish.', { shiny: true }],
  [60, 'nugget', '#c1c7c5', 'Kim loại xám bạc. Nam châm siêu mạnh trong tai nghe, ổ cứng, xe điện.', 'Grey-silver metal. Super-strong magnets in earphones, hard drives, EVs.', { shiny: true }],
  [63, 'nugget', '#c3c8c6', 'Kim loại mềm, xỉn nhanh. Màu đỏ trên màn hình, mực chống giả tiền euro.', 'Soft metal that tarnishes fast. Red phosphors on screens, anti-forgery ink on euro notes.', { shiny: true }],
  [64, 'nugget', '#c4c9c7', 'Kim loại xám bạc, từ tính ở nhiệt độ phòng. Thuốc cản quang chụp MRI.', 'Grey-silver metal, magnetic at room temperature. MRI contrast agents.', { shiny: true }],
  [72, 'nugget', '#b7bdc0', 'Kim loại xám bạc, bóng. Thanh điều khiển lò hạt nhân, chip máy tính.', 'Shiny grey metal. Nuclear reactor control rods, computer chips.', { shiny: true }],
  [73, 'nugget', '#a9b0b5', 'Kim loại xám xanh, bền. Tụ điện trong điện thoại, ốc vít cấy ghép xương.', 'Blue-grey durable metal. Capacitors in phones, bone-implant screws.', { shiny: true }],
  [74, 'nugget', '#8f969b', 'Kim loại xám, khó nóng chảy nhất. Dây tóc bóng đèn, đầu mũi khoan, đạn.', 'Grey metal with the highest melting point. Light-bulb filaments, drill tips, ammunition.', { shiny: true }],
  [75, 'nugget', '#a3aaae', 'Kim loại xám bạc, rất hiếm. Cánh tua-bin động cơ phản lực.', 'Very rare grey-silver metal. Jet-engine turbine blades.', { shiny: true }],
  [76, 'nugget', '#8c96a3', 'Kim loại xanh xám, nặng nhất. Ngòi bút, kim máy hát, tiếp điểm điện.', 'Blue-grey, the densest metal. Pen nibs, record-player needles, electrical contacts.', { shiny: true }],
  [77, 'nugget', '#c9ced0', 'Kim loại cứng, chống ăn mòn tốt nhất. Bugi xe, quả cân chuẩn 1 kg (Pt-Ir).', 'Hard metal, the most corrosion-resistant. Spark plugs, the standard kilogram (Pt-Ir).', { shiny: true }],
  [78, 'ingot', '#dfe2e3', 'Kim loại trắng bạc quý, không xỉn. Nhẫn cưới, bộ lọc khí thải, thuốc chữa ung thư.', 'Precious silvery-white metal that never tarnishes. Wedding rings, catalytic converters, cancer drugs.', { shiny: true }],
  [79, 'ingot', '#e3b23c', 'Kim loại vàng óng, mềm, không bao giờ xỉn. Trang sức, tiếp điểm điện thoại, kính phi hành gia.', 'Soft, gleaming yellow metal that never tarnishes. Jewellery, phone contacts, astronaut visors.', { shiny: true }],
  [80, 'droplets', '#d5d9db', 'Kim loại lỏng bạc ở nhiệt độ phòng, rất độc. Nhiệt kế cũ, đèn huỳnh quang.', 'Silvery liquid metal at room temperature, very toxic. Old thermometers, fluorescent lamps.', { shiny: true }],
  [81, 'nugget', '#aeb4b8', 'Kim loại mềm xám, rất độc. Thuốc diệt chuột cũ, kính quang học đặc biệt.', 'Soft grey toxic metal. Old rat poison, special optical glass.', { shiny: true }],
  [82, 'ingot', '#7f858a', 'Kim loại xám xanh, nặng, mềm, độc. Ắc-quy xe, chì câu cá, tấm chắn tia X.', 'Heavy, soft, blue-grey toxic metal. Car batteries, fishing weights, X-ray shields.', { shiny: true }],
  [83, 'crystal', '#c9a9b8', 'Kim loại giòn, tinh thể bậc thang óng ánh cầu vồng. Thuốc đau dạ dày, mỹ phẩm ánh nhũ.', 'Brittle metal with rainbow-tinted stair-step crystals. Stomach medicine, shimmery make-up.', { shiny: true }],
  [84, 'unknown', '#b5bcc1', 'Kim loại phóng xạ cực mạnh, phát sáng xanh. Nguồn nhiệt cho vệ tinh; cực kỳ độc.', 'Intensely radioactive metal that glows blue. Satellite heaters; extremely toxic.', { radioactive: true }],
  [85, 'unknown', '#8a8f94', 'Nguyên tố hiếm nhất trên Trái Đất — chưa đến 30 g toàn hành tinh.', 'The rarest element on Earth — under 30 g on the whole planet.', { radioactive: true }],
  [86, 'gas', '#e0e6ec', 'Khí phóng xạ không màu, thoát ra từ đất đá vào tầng hầm nhà.', 'Colourless radioactive gas that seeps from rock into basements.', { radioactive: true, glow: '#ffd27a' }],
  [87, 'unknown', '#d7dad4', 'Kim loại kiềm phóng xạ, chỉ tồn tại vài phút.', 'Radioactive alkali metal that lasts only minutes.', { radioactive: true }],
  [88, 'nugget', '#dde0dc', 'Kim loại phóng xạ, từng dùng sơn dạ quang kim đồng hồ (rất nguy hiểm).', 'Radioactive metal once used in glow-in-the-dark watch paint (very dangerous).', { shiny: true, radioactive: true }],
  [90, 'nugget', '#b9bfc3', 'Kim loại phóng xạ xám bạc. Măng-sông đèn măng-xông cũ, nhiên liệu lò phản ứng thế hệ mới.', 'Grey-silver radioactive metal. Old gas-lamp mantles, next-generation reactor fuel.', { shiny: true, radioactive: true }],
  [92, 'nugget', '#9ea4a8', 'Kim loại xám bạc rất nặng, phóng xạ. Nhiên liệu nhà máy điện hạt nhân, thuỷ tinh xanh lục cổ.', 'Very heavy grey-silver radioactive metal. Nuclear power-plant fuel, old green glass.', { shiny: true, radioactive: true }],
  [94, 'nugget', '#a7adb2', 'Kim loại phóng xạ, ấm khi chạm. Pin cho tàu vũ trụ Voyager, vũ khí hạt nhân.', 'Radioactive metal, warm to the touch. Voyager spacecraft power, nuclear weapons.', { shiny: true, radioactive: true }],
  [95, 'nugget', '#b4bac0', 'Kim loại phóng xạ. Có một lượng cực nhỏ trong đầu báo khói ở nhà bạn.', 'Radioactive metal. A tiny speck is inside the smoke detector at home.', { shiny: true, radioactive: true }],
]

const BY_Z = new Map(ROWS.map((r) => [r[0], r]))

const DEFAULT: Record<Category, Omit<Look, 'form' | 'color'> & { form: Form; color: string }> = {
  alkali: { form: 'nugget', color: '#d7dad4', shiny: true, vi: 'Kim loại mềm, trắng bạc, phản ứng mạnh với nước.', en: 'Soft silvery metal, reacts violently with water.' },
  'alkaline-earth': { form: 'nugget', color: '#d0d5cf', shiny: true, vi: 'Kim loại xám bạc, mềm.', en: 'Soft grey-silver metal.' },
  transition: { form: 'nugget', color: '#b5bbbf', shiny: true, vi: 'Kim loại xám bạc, cứng.', en: 'Hard grey-silver metal.' },
  'post-transition': { form: 'nugget', color: '#c0c5c8', shiny: true, vi: 'Kim loại mềm, xám bạc.', en: 'Soft grey-silver metal.' },
  metalloid: { form: 'nugget', color: '#9aa0a6', shiny: true, vi: 'Chất rắn xám ánh kim, giòn.', en: 'Brittle grey metallic-looking solid.' },
  nonmetal: { form: 'powder', color: '#c9c3b2', vi: 'Chất rắn phi kim.', en: 'Non-metal solid.' },
  halogen: { form: 'gas', color: '#e7f0c0', vi: 'Khí màu, độc.', en: 'Coloured toxic gas.' },
  'noble-gas': { form: 'gas', color: '#eef2ff', glow: '#bcd0ff', vi: 'Khí không màu, trơ.', en: 'Colourless inert gas.' },
  lanthanide: { form: 'nugget', color: '#c4c9c7', shiny: true, vi: 'Kim loại đất hiếm xám bạc, mềm, xỉn dần trong không khí. Trong nam châm, màn hình, pin.', en: 'Soft grey-silver rare-earth metal that tarnishes in air. Magnets, screens, batteries.' },
  actinide: { form: 'unknown', color: '#aeb4ba', radioactive: true, vi: 'Kim loại phóng xạ nhân tạo, chỉ tạo ra được vài nguyên tử trong lò phản ứng.', en: 'Man-made radioactive metal, only a few atoms made in reactors.' },
}

const SYNTHETIC: Look = {
  form: 'unknown',
  color: '#9fb5c9',
  radioactive: true,
  vi: 'Nguyên tố nhân tạo, siêu nặng: chỉ vài nguyên tử từng được tạo ra trong máy gia tốc và tan rã sau chưa đầy một giây. Chưa ai nhìn thấy nó.',
  en: 'Man-made super-heavy element: only a few atoms have ever been made in accelerators, decaying in under a second. No one has seen it.',
}

/** The real-life look of element z. */
export function lookOf(z: number): Look {
  const r = BY_Z.get(z)
  if (r) return { form: r[1], color: r[2], vi: r[3], en: r[4], ...(r[5] ?? {}) }
  if (z >= 99) return SYNTHETIC
  const el = ELEMENTS[z - 1]
  const d = DEFAULT[el.category]
  return { ...d, radioactive: d.radioactive || z >= 84 }
}

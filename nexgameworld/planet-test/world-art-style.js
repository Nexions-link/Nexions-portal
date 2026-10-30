// NGW-ART-REMASTER-001 / G-03 — one original painterly palette for both biomes.
// No THREE, DOM, networking, random state or gameplay/server dependencies.
// Pixel palettes are encoded as sRGB bytes; mesh and light tints as #RRGGBB.
const rgb=(r,g,b)=>Object.freeze([r,g,b]);
const shades=(...colors)=>Object.freeze(colors);
export const ART_STYLE_VERSION='R1-G03-1';
export const WORLD_ART_PALETTE=Object.freeze({
 terrain:Object.freeze({
  meadowShade:rgb(94,114,66),meadowSun:rgb(132,128,74),
  meadowSoil:rgb(130,96,67),meadowMoss:rgb(71,100,58),
  forestShade:rgb(89,109,64),forestSoil:rgb(129,94,62),
  forestMoss:rgb(64,94,54),forestLitter:rgb(143,102,64),
  trailShade:rgb(133,108,72),trailSun:rgb(160,134,91),
  forestTrailShade:rgb(134,107,72),forestTrailSun:rgb(160,133,91),
  wetRuts:rgb(73,70,57),vergeGrass:rgb(72,94,58)
 }),
 canopy:Object.freeze({
  pineLower:shades('#477651','#355e47'),
  pineUpper:shades('#6b915c','#507950'),
  oakLower:shades('#5c854d','#638649'),
  oakUpper:shades('#89a45d','#628851'),
  oakOuter:shades('#5b7e50','#7c985c'),
  hangingMoss:shades('#66855c','#718760'),
  meadowGrass:shades('#507746','#769650','#406b43','#91a968'),
  fern:shades('#50784b','#749458','#3c6849','#829b61'),
  understory:shades('#53714b','#426448','#718353')
 }),
 wood:Object.freeze({
  bark:shades('#968674','#827261'),root:shades('#514437','#645243'),
  fallen:'#655241',albedo:rgb(229,217,199)
 }),
 stone:Object.freeze({
  shade:shades('#6d786b','#8a8977','#758177'),warm:'#9a9482',
  light:'#b4ad97'
 }),
 flowers:Object.freeze({
  white:shades('#f8f6e5','#eeeecf','#dce8c6','#fffdf2'),
  blue:shades('#e8e9ff','#d7e3fb','#bccde9','#f4f4ff'),
  yellow:'#e8c96e',center:'#e9bf65',mushroom:'#ad7950'
 }),
 light:Object.freeze({
  sky:'#a1ccd5',sun:'#ffebba',ambientSky:'#f7e6c6',
  ambientGround:'#486b70',sunflecks:shades('#ffe2aa','#f9e6b9','#fff0c4','#eed097')
 }),
 material:Object.freeze({
  terrainRoughness:.94,trailRoughness:.88,foliageRoughness:1,
  barkRoughness:1,stoneRoughness:1,metalness:0
 })
});
export const ART_MATERIAL_SWATCHES=Object.freeze([
 Object.freeze({id:'meadow',name:'Луговая почва',hex:'#5e7242',group:'terrain',roughness:.94,
  detail:'Мягкие травяные островки и тёплая земля, не сплошная ровная зелень'}),
 Object.freeze({id:'forest',name:'Лесная почва',hex:'#596d40',group:'terrain',roughness:.94,
  detail:'Тень полога, крупные мягкие пятна гумуса и лесной подстилки'}),
 Object.freeze({id:'moss',name:'Мох',hex:'#405e36',group:'terrain',roughness:1,
  detail:'Насыщенный приглушённый зелёный у корней и влажных камней'}),
 Object.freeze({id:'path',name:'Золотистая тропа',hex:'#a0855b',group:'terrain',roughness:.88,
  detail:'Неровная охристая дорожка, световые пятна и мягкая травяная кромка'}),
 Object.freeze({id:'bark',name:'Кора дерева',hex:'#968674',group:'wood',roughness:1,
  detail:'Древесина с вертикальными бороздами и тёмными продольными трещинами'}),
 Object.freeze({id:'pine',name:'Хвойная крона',hex:'#477651',group:'canopy',roughness:1,
  detail:'Разделённые ярусы свисающих лап и глубокие зелёные полутени'}),
 Object.freeze({id:'oak',name:'Лиственная крона',hex:'#89a45d',group:'canopy',roughness:1,
  detail:'Тёплые светлые края листвы и прохладные внутренние карманы'}),
 Object.freeze({id:'stone',name:'Лесной камень',hex:'#8a8977',group:'stone',roughness:1,
  detail:'Нейтральная тёплая порода, мох в щелях, без холодного чистого серого'}),
 Object.freeze({id:'flower',name:'Полевые цветы',hex:'#f8f6e5',group:'flowers',roughness:1,
  detail:'Небольшие кремовые, белые и голубые цветы в траве'}),
 Object.freeze({id:'sun',name:'Солнце и блики',hex:'#ffebba',group:'light',roughness:0,
  detail:'Тёплый свет на тропе, прохладная тень в глубине леса'})
]);
export function colorHexBytes(hex){
 if(!/^#[0-9a-fA-F]{6}$/.test(hex))throw new RangeError('Invalid palette hex');
 return Object.freeze([parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]);
}
export function paletteColor(group,role){
 const family=WORLD_ART_PALETTE[group],color=family?.[role];
 if(!color)throw new RangeError('Unknown world art role '+group+'.'+role);
 return color;
}

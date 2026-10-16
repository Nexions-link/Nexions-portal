// Classic item identities and combat values; see LOOT.md for sources and Alpha balance.
// Prices and group drop chances are NexGame values, not Blizzard's drop statistics.
const gear=(sourceId,name,slot,values)=>({sourceId,name,slot,rarity:'poor',quality:'Низкое качество',requiredLevel:1,stack:1,description:'Потрёпанное, но пригодное снаряжение.',...values});
export const ITEM_CATALOG={
 feather:{name:'Перо долгонога',icon:'🪶',rarity:'poor',quality:'Низкое качество',sell:1,description:'Длинное крепкое перо. Можно продать торговцу.'},
 beak:{name:'Клюв долгонога',icon:'🦴',rarity:'poor',quality:'Низкое качество',sell:2,description:'Прочный клюв. Можно продать торговцу.'},
 down:{name:'Мягкий пух',icon:'☁️',rarity:'poor',quality:'Низкое качество',sell:2,description:'Тёплый и лёгкий пух с равнин.'},
 charm:{name:'Полированная бусина',icon:'🔮',rarity:'uncommon',quality:'Необычный',sell:8,description:'Редкая ценная безделушка. Не является экипировкой.'},
 giantFeather:{name:'Перо Грозоклюва',icon:'🪶',rarity:'rare',quality:'Редкий',sell:20,description:'Огромное багряное перо поверженного исполина.'},
 wornAxe:gear(37,'Поношенный топор','weapon',{icon:'🪓',rarity:'common',quality:'Обычный',weaponKind:'axe',damageMin:1,damageMax:3,speed:2,buy:8,sell:1,description:'Твой первый одноручный топор. Можно использовать со щитом.'}),
 chainVest:gear(2656,'Тонкий кольчужный нагрудник','chest',{icon:'👕',armor:63,buy:32,sell:6}),
 chainPants:gear(2654,'Тонкие кольчужные штаны','legs',{icon:'👖',armor:37,buy:20,sell:4}),
 chainBoots:gear(2650,'Тонкие кольчужные сапоги','feet',{icon:'🥾',armor:34,buy:16,sell:3}),
 chainGloves:gear(2653,'Тонкие кольчужные перчатки','hands',{icon:'🧤',armor:35,buy:16,sell:3}),
 chainBelt:gear(2649,'Тонкий кольчужный пояс','waist',{icon:'➰',armor:24,buy:10,sell:2}),
 chainBracers:gear(2651,'Тонкие кольчужные наручи','wrists',{icon:'▥',armor:25,buy:12,sell:2}),
 raggedVest:gear(1364,'Рваный кожаный жилет','chest',{icon:'👕',armor:31,buy:14,sell:2}),
 raggedPants:gear(1366,'Рваные кожаные штаны','legs',{icon:'👖',armor:17,buy:8,sell:1}),
 letterOpener:gear(2138,'Заточенный нож для писем','weapon',{icon:'🗡',weaponKind:'dagger',damageMin:2,damageMax:5,speed:1.7,requiredLevel:2,buy:24,sell:4}),
 feebleSword:gear(1413,'Непрочный меч','weapon',{icon:'⚔',weaponKind:'sword',damageMin:3,damageMax:7,speed:2,requiredLevel:3,buy:35,sell:7}),
 rustyHatchet:gear(1416,'Ржавый топорик','weapon',{icon:'🪓',weaponKind:'axe',damageMin:4,damageMax:8,speed:2.1,requiredLevel:4,buy:48,sell:9}),
 batteredBuckler:gear(2210,'Потрёпанный кулачный щит','shield',{icon:'🛡',armor:12,block:1,buy:10,sell:2}),
 bentShield:gear(2211,'Погнутый большой щит','shield',{icon:'🛡',armor:32,block:1,buy:24,sell:4}),
 warriorTunic:gear(2965,'Мундир воина','chest',{icon:'👕',rarity:'uncommon',quality:'Необычный',armor:115,strength:2,requiredLevel:6,sell:30,description:'Кольчужный мундир. Сила увеличивает мощь атак воина.'}),
 warriorPants:gear(2966,'Штаны воина','legs',{icon:'👖',rarity:'uncommon',quality:'Необычный',armor:94,stamina:1,requiredLevel:5,sell:25,description:'Кольчужные поножи. Выносливость увеличивает запас здоровья.'}),
 scalpingStrength:gear(4561,'Томагавк силы','weapon',{icon:'🪓',rarity:'uncommon',quality:'Необычный',weaponKind:'axe',damageMin:7,damageMax:14,speed:1.8,strength:1,requiredLevel:6,sell:40,description:'Одноручный томагавк со свойством «силы».'}),
 scalpingStamina:gear(4561,'Томагавк выносливости','weapon',{icon:'🪓',rarity:'uncommon',quality:'Необычный',weaponKind:'axe',damageMin:7,damageMax:14,speed:1.8,stamina:1,requiredLevel:6,sell:40,description:'Одноручный томагавк со свойством «выносливости».'}),
 infantryBear:gear(7108,'Пехотный щит медведя','shield',{icon:'🛡',rarity:'uncommon',quality:'Необычный',armor:207,block:4,strength:1,stamina:1,requiredLevel:6,sell:35,description:'Щит со свойством «медведя»: сила и выносливость.'})
};
export const MERCHANT_STOCK=['batteredBuckler','bentShield','chainVest','chainPants','chainGloves','chainBoots','chainBracers','chainBelt','raggedVest','raggedPants','wornAxe','letterOpener','feebleSword','rustyHatchet'];
export const GEAR_LOOT={
 poor:['chainVest','chainPants','chainBoots','chainGloves','chainBelt','chainBracers','raggedVest','raggedPants','letterOpener','feebleSword','rustyHatchet','batteredBuckler','bentShield'],
 // One row per base item; weapon suffix is rolled afterwards, so it does not double its weight.
 uncommon:['warriorTunic','warriorPants','scalpingStrength','infantryBear']
};
export const LOOT_CHANCES={normal:{poor:.06,uncommon:.01},boss:{poor:.18,uncommon:.06}};
export function rollEquipmentLoot(boss=false,rng=Math.random){
 const chances=LOOT_CHANCES[boss?'boss':'normal'],roll=rng();
 const pool=roll<chances.uncommon?GEAR_LOOT.uncommon:roll<chances.uncommon+chances.poor?GEAR_LOOT.poor:null;
 if(!pool)return null;
 let id=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
 if(id==='scalpingStrength'&&rng()<.5)id='scalpingStamina';
 return {id,qty:1};
}
export const itemStackLimit=id=>ITEM_CATALOG[id]?.slot?1:20;
export const staminaHealth=stamina=>Math.min(stamina,20)+Math.max(0,stamina-20)*10;
export const armorReduction=(armor,attackerLevel)=>Math.min(.75,armor/(armor+400+85*Math.max(1,attackerLevel)));
export function deriveStats(level,equipment){
 let strength=28+(level-1)*2,stamina=22+(level-1)*2,armor=0;
 for(const [slot,item] of Object.entries(equipment||{})){
  const def=ITEM_CATALOG[item?.id];if(!def||def.slot!==slot)continue;
  strength+=def.strength||0;stamina+=def.stamina||0;armor+=def.armor||0;
 }
 const weapon=ITEM_CATALOG[equipment?.weapon?.id],shield=ITEM_CATALOG[equipment?.shield?.id];
 const speed=weapon?.slot==='weapon'?weapon.speed:2,attackPower=Math.max(0,level*3+strength*2-20);
 const bonus=attackPower/14*speed;
 const damageMin=(weapon?.slot==='weapon'?weapon.damageMin:1)+bonus,damageMax=(weapon?.slot==='weapon'?weapon.damageMax:2)+bonus;
 return {strength,stamina,armor,attackPower,maxHp:80+staminaHealth(stamina),speed,damageMin,damageMax,dps:(damageMin+damageMax)/2/speed,blockChance:shield?.slot==='shield' ? .05 : 0,blockValue:shield?.slot==='shield'?(shield.block||0)+Math.floor(strength/20):0};
}

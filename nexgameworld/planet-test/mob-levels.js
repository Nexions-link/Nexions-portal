// NexGameWorld: canonical static levels and WoW Classic-inspired XP reduction.
// The progression curve is NexGameWorld's own 22/26/70 baseline, so character
// levelling remains balanced with our current quests (not Blizzard's XP totals).
export const DOLGONOG_LEVELS=Object.freeze([1,1,1,1,1,2,2,2,2,3]);
// Canonical positions must be identical in browser and authoritative server.
export const DOLGONOG_SPAWNS=Object.freeze([
 [-9,-23],[1,-28],[13,-22],[21,-33],[-22,-35],
 [-28,29],[15,36],[48,9],[29,-25],[39,47]
].map(row=>Object.freeze(row)));
export const DOLGONOG_BOSS_INDEX=DOLGONOG_LEVELS.length-1;
export const mobLevelForIndex=index=>DOLGONOG_LEVELS[index]??null;
export const monsterMaxHealth=(mobLevel,elite=false)=>elite?108:54+(mobLevel-1)*12;
export const monsterAttackDamage=(mobLevel,elite=false)=>elite?14:9+(mobLevel-1)*2;
export const mobBaseExperience=(mobLevel,elite=false)=>elite?70:22+4*(mobLevel-1);
export function grayMonsterLevel(playerLevel){
 if(playerLevel<=5)return 0;
 if(playerLevel<=39)return playerLevel-5-Math.floor(playerLevel/10);
 if(playerLevel===50)return 40;
 if(playerLevel<=59)return playerLevel-1-Math.floor(playerLevel/5);
 return playerLevel-9;
}
export function xpZeroDifference(playerLevel){
 if(playerLevel<=7)return 5;
 if(playerLevel<=9)return 6;
 if(playerLevel<=11)return 7;
 if(playerLevel<=15)return 8;
 if(playerLevel<=19)return 9;
 if(playerLevel<=29)return 11;
 if(playerLevel<=39)return 12;
 if(playerLevel<=44)return 13;
 if(playerLevel<=49)return 14;
 if(playerLevel<=54)return 15;
 if(playerLevel<=59)return 16;
 return 17;
}
export function monsterDifficulty(playerLevel,mobLevel){
 if(mobLevel<=grayMonsterLevel(playerLevel))return 'gray';
 const delta=mobLevel-playerLevel;
 return delta>=5?'red':delta>=3?'orange':delta>=-2?'yellow':'green';
}
export const MONSTER_LEVEL_COLORS=Object.freeze({
 gray:0x9fa5a0,green:0x58c979,yellow:0xf6d774,
 orange:0xf5a357,red:0xec6c62
});
export function monsterKillExperience(playerLevel,mobLevel,baseXp=mobBaseExperience(mobLevel)){
 if(!Number.isInteger(playerLevel)||playerLevel<1||playerLevel>60||
    !Number.isInteger(mobLevel)||mobLevel<1||mobLevel>60||
    !Number.isInteger(baseXp)||baseXp<0||baseXp>100000)
  throw new RangeError('invalid_monster_experience');
 if(mobLevel<=grayMonsterLevel(playerLevel))return 0;
 const delta=mobLevel-playerLevel;
 const multiplier=delta>=0?1+Math.min(4,delta)*.05:
  Math.max(0,1+delta/xpZeroDifference(playerLevel));
 return Math.round(baseXp*multiplier);
}

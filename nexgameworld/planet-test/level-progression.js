// The same early-level rules serve the authenticated world, offline preview,
// character sheet, and testing. No client-controlled XP awards or stat writes.
export const MAX_CHARACTER_LEVEL=60;
export const EARLY_GAME_LEVEL_CAP=10;
export function levelExperienceRequirement(level){
 if(!Number.isSafeInteger(level)||level<1||level>MAX_CHARACTER_LEVEL)
  throw new RangeError('invalid_level');
 return 100+(level-1)*50;
}
export function totalExperienceToLevel(level){
 if(!Number.isSafeInteger(level)||level<1||level>MAX_CHARACTER_LEVEL)
  throw new RangeError('invalid_level');
 const last=level-1;
 return 100*last+25*last*(last-1);
}
export function earnedExperienceSince(previousLevel,previousXp,currentLevel,currentXp){
 if(!Number.isInteger(previousLevel)||!Number.isInteger(currentLevel)||
  previousLevel<1||currentLevel<previousLevel||currentLevel>MAX_CHARACTER_LEVEL||
  !Number.isSafeInteger(previousXp)||previousXp<0||
  !Number.isSafeInteger(currentXp)||currentXp<0)return 0;
 if(currentLevel===MAX_CHARACTER_LEVEL&&previousLevel===MAX_CHARACTER_LEVEL)return 0;
 const total=totalExperienceToLevel(currentLevel)+currentXp-
  totalExperienceToLevel(previousLevel)-previousXp;
 return Math.max(0,total);
}
export function earlyLevelMilestone(level){
 if(!Number.isSafeInteger(level)||level<1)return null;
 if(level<8)return {level:8,abilityId:'charge',label:'Рывок'};
 return null;
}
export function levelProgress(level,experience){
 const requirement=levelExperienceRequirement(level);
 const current=level===MAX_CHARACTER_LEVEL?0:Math.max(0,Math.min(requirement,Number(experience)||0));
 return {level,experience:current,required:requirement,
  remaining:level===MAX_CHARACTER_LEVEL?0:Math.max(0,requirement-current),
  percent:level===MAX_CHARACTER_LEVEL?100:100*current/requirement,
  toEarlyCap:level>=EARLY_GAME_LEVEL_CAP?0:
   Math.max(0,totalExperienceToLevel(EARLY_GAME_LEVEL_CAP)-
    totalExperienceToLevel(level)-current),
  milestone:earlyLevelMilestone(level)};
}

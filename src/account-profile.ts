/**
 * Profiles live inside the authenticated user's RLS-protected settings record.
 * The previous browser-wide key is intentionally NOT read or migrated: there
 * is no reliable evidence that the legacy value belonged to the signed-in user.
 */
export type AccountProfile = {name:string;headline:string;bio:string;color:'lilac'|'coral'|'mint'|'amber'};
export const emptyProfile = ():AccountProfile=>({name:'',headline:'',bio:'',color:'lilac'});
const colors=new Set(['lilac','coral','mint','amber']);
export function cleanProfile(value:unknown):AccountProfile {
 const raw=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return {name:typeof raw.name==='string'?raw.name.slice(0,60):'',
   headline:typeof raw.headline==='string'?raw.headline.slice(0,80):'',
   bio:typeof raw.bio==='string'?raw.bio.slice(0,240):'',
   color:typeof raw.color==='string'&&colors.has(raw.color)?raw.color as AccountProfile['color']:'lilac'};
}
export function profileFromSettings(settings:unknown,authenticatedUserId:string|null):AccountProfile {
 if(!authenticatedUserId||!settings||typeof settings!=='object')return emptyProfile();
 const data=settings as Record<string,unknown>;
 if(data.profileOwnerId!==authenticatedUserId)return emptyProfile();
 return cleanProfile(data.profile);
}
export function profilePatch(authenticatedUserId:string|null,value:unknown) {
 if(!authenticatedUserId)throw Error('Sign in to save your profile.');
 return {profileOwnerId:authenticatedUserId,profile:cleanProfile(value)};
}

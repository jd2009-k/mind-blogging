/**
 * Only known browser push providers can be subscribed or sent notifications.
 * This is a defense against server-side request forgery through an arbitrary
 * user-supplied PushSubscription.endpoint.
 * Update this allow-list after reviewing new browser provider documentation.
 */
export function trustedPushEndpoint(endpoint) {
  if(typeof endpoint!=='string'||endpoint.length>2048)return false;
  let value;
  try{value=new URL(endpoint);}catch{return false;}
  if(value.protocol!=='https:'||value.username||value.password||value.port&&value.port!=='443')return false;
  if(value.hash)return false;
  const host=value.hostname.toLowerCase().replace(/\.$/,'');
  const same=(name)=>host===name;
  const sub=(domain)=>host.endsWith('.'+domain)&&host!==domain;
  return same('fcm.googleapis.com') || same('android.googleapis.com') ||
    same('updates.push.services.mozilla.com') || sub('push.services.mozilla.com') ||
    sub('push.apple.com') || same('web.push.apple.com') ||
    sub('notify.windows.com');
}
export function validPushSubscription(subscription){
  if(!subscription||typeof subscription!=='object')return false;
  if(!trustedPushEndpoint(subscription.endpoint))return false;
  if(!subscription.keys||typeof subscription.keys!=='object')return false;
  const keys=[subscription.keys.auth,subscription.keys.p256dh];
  return keys.every(key=>typeof key==='string'&&key.length>=8&&key.length<=256&&/^[A-Za-z0-9_-]+$/.test(key));
}


self.addEventListener('push',event=>{
 let payload={title:'Mind Blogging',body:'Time for your weekly reflection.',url:'/'};
 try{payload={...payload,...event.data.json()};}catch{}
 event.waitUntil(self.registration.showNotification(payload.title,{
  body:payload.body,icon:'/favicon.ico',data:{url:payload.url},tag:'mind-blogging-reminder'
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async tabs=>{
  const open=tabs.find(w=>new URL(w.url).origin===self.location.origin);
  if(open){await open.focus();return open.navigate('/');}
  return clients.openWindow('/');
 }));
});

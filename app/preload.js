const {contextBridge:c,ipcRenderer:r}=require('electron');
c.exposeInMainWorld('api',{list:()=>r.invoke('list'),set:i=>r.invoke('set',i),stop:()=>r.invoke('stop'),
del:i=>r.invoke('del',i),imp:()=>r.invoke('imp'),save:d=>r.invoke('save',d),
cfg:()=>r.invoke('cfg'),behind:v=>r.invoke('behind',v)});

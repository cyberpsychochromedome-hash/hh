const {app,BrowserWindow,ipcMain,dialog,screen,Tray,Menu}=require('electron');
const path=require('path'),fs=require('fs'),{execFile}=require('child_process');
const lock=app.requestSingleInstanceLock();
let win,wp,tray,poll;
const icon=path.join(__dirname,'icon.png');
const dir=()=>{const d=path.join(app.getPath('userData'),'wallpapers');fs.mkdirSync(d,{recursive:true});return d};
const cfgP=()=>path.join(app.getPath('userData'),'cfg.json');
const rc=()=>{try{return JSON.parse(fs.readFileSync(cfgP()))}catch{return{behind:true}}};
const wc=o=>fs.writeFileSync(cfgP(),JSON.stringify({...rc(),...o}));
const attachExe=()=>app.isPackaged?path.join(process.resourcesPath,'attach.exe'):path.join(__dirname,'bin','attach.exe');
const list=()=>fs.readdirSync(dir()).map(id=>{try{return{id,...JSON.parse(fs.readFileSync(path.join(dir(),id,'wallpaper.json')))}}catch{return null}}).filter(Boolean);
const wrap=(f,v)=>`<body style="margin:0;background:#000"><${v?'video autoplay loop muted':'img'} src="${f}" style="width:100vw;height:100vh;object-fit:cover"></body>`;
function add(name,type,entry){const id=Date.now().toString(36);const d=path.join(dir(),id);fs.mkdirSync(d);
  fs.writeFileSync(path.join(d,'wallpaper.json'),JSON.stringify({name,type,entry}));return d}
function stopWp(){clearInterval(poll);if(wp){const w=wp;wp=null;w.close()}}
function setWp(id){
  const m=list().find(w=>w.id===id);if(!m)return;stopWp();
  const d=screen.getPrimaryDisplay(),{x,y,width,height}=d.bounds,sf=d.scaleFactor;
  const w=wp=new BrowserWindow({x,y,width,height,frame:false,skipTaskbar:true,focusable:false,resizable:false,movable:false,show:false});
  w.loadFile(path.join(dir(),id,m.entry));
  w.once('ready-to-show',()=>{w.show();
    if(rc().behind!==false&&process.platform==='win32'){
      const h=w.getNativeWindowHandle(),hw=(h.length>=8?h.readBigUInt64LE(0):BigInt(h.readUInt32LE(0))).toString();
      execFile(attachExe(),[hw,x*sf,y*sf,width*sf,height*sf].map(v=>String(Math.round(+v||0))),e=>{if(e)console.log('attach failed:',e.message)});
    }
    // forward the real cursor so interactive wallpapers still work behind the icons
    poll=setInterval(()=>{if(wp!==w||w.isDestroyed())return;const p=screen.getCursorScreenPoint();
      w.webContents.executeJavaScript(`dispatchEvent(new MouseEvent('mousemove',{clientX:${p.x-x},clientY:${p.y-y}}))`).catch(()=>{})},33);
  });
  w.on('closed',()=>{if(wp===w){wp=null;clearInterval(poll)}});
  wc({id});
}
ipcMain.handle('list',list);
ipcMain.handle('set',(e,id)=>setWp(id));
ipcMain.handle('stop',()=>{stopWp();wc({id:null})});
ipcMain.handle('del',(e,id)=>fs.rmSync(path.join(dir(),id),{recursive:true,force:true}));
ipcMain.handle('cfg',rc);
ipcMain.handle('behind',(e,v)=>{wc({behind:!!v});const c=rc();if(c.id&&wp)setWp(c.id)});
ipcMain.handle('imp',async()=>{
  const r=await dialog.showOpenDialog(win,{filters:[{name:'Wallpapers',extensions:['png','jpg','jpeg','gif','webp','mp4','webm','html']}]});
  if(r.canceled)return;const f=r.filePaths[0],ext=path.extname(f).slice(1).toLowerCase(),n=path.basename(f,'.'+ext);
  if(ext==='html'){const d=add(n,'live',path.basename(f));fs.cpSync(path.dirname(f),d,{recursive:true,filter:s=>!s.endsWith('wallpaper.json')})}
  else{const v=['mp4','webm'].includes(ext),d=add(n,v?'video':'art','index.html');
    fs.copyFileSync(f,path.join(d,'media.'+ext));fs.writeFileSync(path.join(d,'index.html'),wrap('media.'+ext,v))}
});
ipcMain.handle('save',(e,{name,type,html,png})=>{
  const d=add(name,type,'index.html');
  if(png){fs.writeFileSync(path.join(d,'art.png'),Buffer.from(png,'base64'));fs.writeFileSync(path.join(d,'index.html'),wrap('art.png',false))}
  else fs.writeFileSync(path.join(d,'index.html'),html);
});
function showWin(){if(win){win.show();win.focus();return}
  win=new BrowserWindow({width:1250,height:900,title:'Wallpaper Studio',icon,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js')}});
  win.loadFile('index.html');win.on('closed',()=>win=null)}
if(!lock)app.quit();else{
  app.on('second-instance',showWin);
  app.on('window-all-closed',()=>{}); // keep running in the tray so the wallpaper stays
  app.whenReady().then(()=>{
    tray=new Tray(icon);tray.setToolTip('Wallpaper Studio');tray.on('click',showWin);
    tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Wallpaper Studio',click:showWin},
      {label:'Stop wallpaper',click:()=>{stopWp();wc({id:null})}},{label:'Quit',click:()=>app.quit()}]));
    showWin();const c=rc();if(c.id)setWp(c.id);
  });
}

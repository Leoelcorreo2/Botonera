const KEY='botonera_config_v1', PIN_KEY='botonera_pin_v1', BACKUP_KEY='botonera_backup_v1';
const DEFAULT_CONFIG_URL='./datos.json';
const $=id=>document.getElementById(id);
const state={buttons:[],pin:'0000',view:'home'};
const defaults=[
{id:'emergencia',position:1000,type:'CALL',label:'LLAMAR A EMERGENCIA',emoji:'🚨',target:{phone:'112'},style:{background:'#B42318',foreground:'#FFFFFF',size:'XL'}},
{id:'youtube',position:2000,type:'URL',label:'VER YOUTUBE',emoji:'▶️',target:{url:'https://www.youtube.com'},style:{background:'#C62828',foreground:'#FFFFFF',size:'L'}},
{id:'tiempo',position:3000,type:'URL',label:'VER EL TIEMPO',emoji:'🌤️',target:{url:'https://www.meteoblue.com'},style:{background:'#E8B638',foreground:'#202020',size:'L'}}
];
function get(key){return localStorage.getItem(key)}
function set(key,value){localStorage.setItem(key,value)}

/**
 * Carga la botonera. En cada apertura consulta datos.json del servidor
 * y actualiza solo si la versión del servidor es mayor que la local,
 * O si el estado local está vacío (para recuperar tras borrar todo).
 */
async function load(){
  let localState=null;
  try{
    const raw=get(KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      if(parsed && Array.isArray(parsed.buttons)) localState=parsed;
    }
  }catch(e){
    console.warn('localStorage corrupto, se ignorará',e);
    localState=null;
  }

  state.pin=get(PIN_KEY)||'0000';

  try{
    const res=await fetch(DEFAULT_CONFIG_URL,{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const serverConfig=await res.json();
    if(!serverConfig || serverConfig.format!=='botonera-config'){
      throw new Error('Formato de datos.json no válido');
    }

    const serverVersion=serverConfig.version??1;
    const localVersion=localState?.version??0;
    const localIsEmpty=!localState || !Array.isArray(localState.buttons) || localState.buttons.length===0;

    // Actualizar si: versión nueva en servidor O estado local vacío
    if(serverVersion>localVersion || localIsEmpty){
      const merged=aplicarConfigServidor(localState,serverConfig);
      const newState={
        format:'botonera-config',
        version:serverVersion,
        importMode:serverConfig.importMode||'upsert',
        buttons:merged
      };
      set(KEY,JSON.stringify(newState));
      state.buttons=merged;
      console.log('Botonera actualizada a versión '+serverVersion);
      return;
    }

    if(localState && Array.isArray(localState.buttons)){
      state.buttons=localState.buttons;
      return;
    }

    const inicial={
      format:'botonera-config',
      version:serverVersion,
      importMode:serverConfig.importMode||'upsert',
      buttons:Array.isArray(serverConfig.buttons)?structuredClone(serverConfig.buttons):[]
    };
    set(KEY,JSON.stringify(inicial));
    state.buttons=inicial.buttons;
  }catch(err){
    console.warn('No se pudo cargar datos.json, usando estado local:',err);
    if(localState && Array.isArray(localState.buttons)){
      state.buttons=localState.buttons;
    }else{
      state.buttons=structuredClone(defaults);
      persist();
      toast('Sin conexión y sin datos locales. Se ha cargado una botonera de ejemplo.');
    }
  }
}

/**
 * Fusiona la configuración del servidor con el estado local según importMode del servidor.
 * - "replace": sustituye todo por los botones del servidor.
 * - "upsert": añade/actualiza por ID, conservando los botones locales que no estén en el servidor.
 */
function aplicarConfigServidor(localState,serverConfig){
  const mode=serverConfig.importMode||'replace';
  const serverButtons=Array.isArray(serverConfig.buttons)?serverConfig.buttons:[];

  if(mode==='replace' || !localState || !Array.isArray(localState.buttons) || localState.buttons.length===0){
    return structuredClone(serverButtons);
  }

  const map=new Map(localState.buttons.map(b=>[b.id,b]));
  for(const sb of serverButtons){
    map.set(sb.id,sb);
  }
  return [...map.values()];
}

function persist(){set(KEY,JSON.stringify({format:'botonera-config',version:state.version||1,buttons:state.buttons}));}
function validateButton(b,index=0){
if(!b||typeof b!=='object')throw Error('Hay un botón con formato incorrecto.');
const type=String(b.type||'').toUpperCase();if(!['CALL','URL'].includes(type))throw Error('Solo se admiten botones URL o CALL.');
const label=String(b.label||'').trim();if(!label||label.length>70)throw Error('Cada botón necesita un nombre de 1 a 70 caracteres.');
const id=String(b.id||`btn-${Date.now()}-${index}`).trim();if(!id||id.length>80)throw Error('Identificador no válido.');
const target={...(b.target||{})};
if(type==='CALL'){target.phone=String(target.phone||'').trim();if(!/^\+?[0-9()-]{3,24}$/.test(target.phone))throw Error(`Teléfono no válido en «${label}».`);}
if(type==='URL'){target.url=String(target.url||'').trim();let u;try{u=new URL(target.url)}catch{throw Error(`Dirección web no válida en «${label}».`)}if(!['https:','http:'].includes(u.protocol))throw Error('Solo se admiten direcciones HTTP o HTTPS.');}
const bg=String(b.style?.background||'#245B87'),fg=String(b.style?.foreground||'#FFFFFF'),size=['S','M','L','XL'].includes(b.style?.size)?b.style.size:'L';
if(!/^#[0-9A-Fa-f]{6}$/.test(bg)||!/^#[0-9A-Fa-f]{6}$/.test(fg))throw Error('Color no válido.');
return{id,position:Number.isFinite(Number(b.position))?Math.max(0,Math.floor(Number(b.position))):(index+1)*1000,type,label,emoji:String(b.emoji||'🔘').slice(0,8),target,style:{background:bg,foreground:fg,size}};
}
function validateConfig(data){if(!data||!Array.isArray(data.buttons))throw Error('El JSON no contiene una lista de botones.');if(data.buttons.length>200)throw Error('Máximo 200 botones por configuración.');const buttons=data.buttons.map(validateButton),ids=new Set();for(const b of buttons){if(ids.has(b.id))throw Error(`Identificador duplicado: ${b.id}`);ids.add(b.id);}const importMode=data.importMode||'upsert';if(!['upsert','replace'].includes(importMode))throw Error('Modo de importación no válido.');return{format:'botonera-config',version:1,importMode,buttons};}
function sorted(){return [...state.buttons].sort((a,b)=>a.position-b.position||a.label.localeCompare(b.label,'es'));}
function render(){$('count').textContent=`${state.buttons.length} ${state.buttons.length===1?'botón':'botones'}`;renderHome();renderAdmin();$('homeView').hidden=state.view!=='home';$('adminView').hidden=state.view!=='admin';}
function renderHome(){const host=$('buttonList');host.replaceChildren();$('emptyState').hidden=state.buttons.length!==0;for(const b of sorted()){const el=document.createElement('button');el.className=`action-tile size-${b.style.size}`;el.style.setProperty('--bg',b.style.background);el.style.setProperty('--fg',b.style.foreground);el.type='button';const emoji=document.createElement('span');emoji.className='tile-emoji';emoji.setAttribute('aria-hidden','true');emoji.textContent=b.emoji;const label=document.createElement('span');label.className='tile-label';label.textContent=b.label;el.append(emoji,label);el.setAttribute('aria-label',`${b.label}. ${b.type==='CALL'?'Llamar':'Abrir página web'}`);el.addEventListener('click',()=>runAction(b));host.append(el);}}
function renderAdmin(){const host=$('adminList');host.replaceChildren();for(const b of sorted()){const card=document.createElement('article');card.className='admin-card';const info=document.createElement('div'),title=document.createElement('div'),meta=document.createElement('div');title.className='admin-card-title';title.textContent=`${b.emoji} ${b.label}`;meta.className='admin-card-meta';meta.textContent=`${b.type} · Posición ${String(b.position).padStart(4,'0')} · Tamaño ${b.style.size}`;info.append(title,meta);const color=document.createElement('span');color.style.cssText=`width:30px;height:30px;border-radius:8px;background:${b.style.background};border:1px solid #0002`;card.append(info,color);const controls=document.createElement('div');controls.className='admin-card-controls';[['Editar',()=>openEditor(b)],['↑ Subir',()=>move(b,-1)],['↓ Bajar',()=>move(b,1)],['Borrar',()=>deleteButton(b)]].forEach(([label,fn])=>{const btn=document.createElement('button');btn.className='small-button'+(label==='Borrar'?' delete':'');btn.textContent=label;btn.addEventListener('click',fn);controls.append(btn);});card.append(controls);host.append(card);}}
function runAction(b){if(b.type==='CALL'){window.location.href=`tel:${b.target.phone.replace(/[^+0-9]/g,'')}`;return;}window.open(b.target.url,'_blank','noopener,noreferrer');}
function showDialog(html){const host=$('dialogHost');host.innerHTML=`<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true">${html}</section></div>`;host.querySelector('.dialog-backdrop').addEventListener('click',e=>{if(e.target.classList.contains('dialog-backdrop'))closeDialog();});}
function closeDialog(){$('dialogHost').replaceChildren();}
function field(label,id,value='',type='text',hint=''){return `<label class="field">${label}<input id="${id}" type="${type}" value="${escapeAttr(value)}" autocomplete="off">${hint?`<span class="field-hint">${hint}</span>`:''}</label>`;}
function escapeAttr(s){return String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
function openEditor(existing=null){const b=existing||{id:`btn-${crypto.randomUUID()}`,position:(sorted().at(-1)?.position||0)+1000,type:'URL',label:'',emoji:'🔘',target:{url:'https://'},style:{background:'#245B87',foreground:'#FFFFFF',size:'L'}};
showDialog(`<h2>${existing?'Editar botón':'Crear botón'}</h2><div class="form-grid">${field('Nombre del botón','fLabel',b.label)}${field('Emoji','fEmoji',b.emoji)}<label class="field">Tipo de acción<select id="fType"><option value="URL" ${b.type==='URL'?'selected':''}>URL · Abrir página web</option><option value="CALL" ${b.type==='CALL'?'selected':''}>CALL · Llamar por teléfono</option></select></label><div id="targetFields"></div><div class="form-row">${field('Posición numérica','fPosition',b.position,'number')}<label class="field">Tamaño<select id="fSize"><option>S</option><option>M</option><option>L</option><option>XL</option></select></label></div><div class="form-row">${field('Color de fondo','fBg',b.style.background,'color')}${field('Color del texto','fFg',b.style.foreground,'color')}</div></div><div class="dialog-actions"><button id="cancelEdit">Cancelar</button><button id="saveEdit" class="confirm">Guardar</button></div>`);
const updateTarget=()=>{const t=$('fType').value;$('targetFields').innerHTML=t==='CALL'?field('Número de teléfono','fTarget',b.target.phone||'','tel','Ejemplo: 600 123 456'):field('Dirección web','fTarget',b.target.url||'https://','url','Ejemplo: https://www.youtube.com/watch?v=...');};$('fType').addEventListener('change',updateTarget);updateTarget();$('fSize').value=b.style.size;$('cancelEdit').onclick=closeDialog;
$('saveEdit').onclick=()=>{try{const type=$('fType').value,target=type==='CALL'?{phone:$('fTarget').value}:{url:$('fTarget').value};const next=validateButton({id:b.id,position:Number($('fPosition').value),type,label:$('fLabel').value,emoji:$('fEmoji').value,target,style:{background:$('fBg').value,foreground:$('fFg').value,size:$('fSize').value}});const i=state.buttons.findIndex(x=>x.id===next.id);if(i>=0)state.buttons[i]=next;else state.buttons.push(next);persist();closeDialog();render();toast('Botón guardado.');}catch(e){toast(e.message);}};
}
function move(b,dir){const a=sorted(),i=a.findIndex(x=>x.id===b.id),j=i+dir;if(j<0||j>=a.length)return;const other=a[j],[p,q]=[b.position,other.position];b.position=q;other.position=p;persist();renderAdmin();}
function deleteButton(b){confirmDialog(`¿Borrar «${b.label}»?`,()=>{state.buttons=state.buttons.filter(x=>x.id!==b.id);persist();render();toast('Botón borrado.');});}
function confirmDialog(message,onConfirm,danger=false){showDialog(`<h2>Confirmar</h2><p>${escapeAttr(message)}</p><div class="dialog-actions"><button id="no">Cancelar</button><button id="yes" class="${danger?'danger':'confirm'}">Confirmar</button></div>`);$('no').onclick=closeDialog;$('yes').onclick=()=>{closeDialog();onConfirm();};}
function askPin(onSuccess,title='Acceso a configuración'){showDialog(`<h2>${title}</h2><p>Introduce el PIN de cuatro cifras.</p>${field('PIN','pin','','password')}<div class="dialog-actions"><button id="pinCancel">Cancelar</button><button id="pinOk" class="confirm">Entrar</button></div>`);$('pin').classList.add('pin-input');$('pin').inputMode='numeric';$('pin').maxLength=4;$('pinCancel').onclick=closeDialog;$('pinOk').onclick=()=>{if($('pin').value===state.pin){closeDialog();onSuccess();}else toast('PIN incorrecto.');};}
function openAdmin(){askPin(()=>{state.view='admin';render();});}
function exportAll(){const data=JSON.stringify({format:'botonera-config',version:1,importMode:'replace',buttons:sorted()},null,2),filename=`botonera-${new Date().toISOString().slice(0,10)}.json`;const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Copia JSON descargada.');}
function importFile(){$('fileInput').click();}
$('fileInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{importConfig(validateConfig(JSON.parse(await file.text())));}catch(err){toast(`No se pudo importar: ${err.message}`);}finally{e.target.value='';}});
function importConfig(config){const replace=config.importMode==='replace',incoming=config.buttons;if(replace){confirmDialog(`Vas a sustituir los ${state.buttons.length} botones actuales por ${incoming.length} botones recibidos. Se guardará una copia de seguridad. ¿Continuar?`,()=>{set(BACKUP_KEY,JSON.stringify({buttons:state.buttons,savedAt:new Date().toISOString()}));state.buttons=incoming;persist();render();toast('Botonera sustituida correctamente.');},true);return;}const ids=new Set(state.buttons.map(b=>b.id));let added=0,updated=0;for(const b of incoming){if(ids.has(b.id))updated++;else added++;}confirmDialog(`Se añadirán ${added} botones y se actualizarán ${updated}. Los demás se conservarán. ¿Continuar?`,()=>{set(BACKUP_KEY,JSON.stringify({buttons:state.buttons,savedAt:new Date().toISOString()}));for(const b of incoming){const i=state.buttons.findIndex(x=>x.id===b.id);if(i>=0)state.buttons[i]=b;else state.buttons.push(b);}persist();render();toast('Importación completada.');});}
function changePin(){showDialog(`<h2>Cambiar PIN</h2><div class="form-grid">${field('PIN actual','oldPin','','password')}${field('Nuevo PIN (4 cifras)','newPin','','password')}${field('Repetir nuevo PIN','newPin2','','password')}</div><div class="dialog-actions"><button id="pinNo">Cancelar</button><button id="pinSave" class="confirm">Guardar</button></div>`);$('pinNo').onclick=closeDialog;$('pinSave').onclick=()=>{const a=$('oldPin').value,b=$('newPin').value,c=$('newPin2').value;if(a!==state.pin){toast('El PIN actual no es correcto.');return;}if(!/^\d{4}$/.test(b)||b!==c){toast('El nuevo PIN debe tener cuatro cifras iguales en ambos campos.');return;}state.pin=b;set(PIN_KEY,b);closeDialog();toast('PIN actualizado.');};}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);}
$('configButton').onclick=openAdmin;$('importButton').onclick=importFile;$('backHome').onclick=()=>{state.view='home';render();};$('newButton').onclick=()=>openEditor();$('exportAll').onclick=exportAll;$('changePin').onclick=changePin;$('deleteAll').onclick=()=>confirmDialog(`Se eliminarán los ${state.buttons.length} botones. Se guardará una copia de seguridad. ¿Continuar?`,()=>{set(BACKUP_KEY,JSON.stringify({buttons:state.buttons,savedAt:new Date().toISOString()}));state.buttons=[];persist();render();toast('Botonera vaciada.');},true);

load().then(render);
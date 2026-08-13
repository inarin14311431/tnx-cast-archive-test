/* Network scan sequence and ambient data stream for the public cast view. */
(function(){
  if(window.matchMedia?.('(max-width: 600px)').matches===true)return;
  document.body.classList.add('cast-scan-mode');
  const publicId=new URLSearchParams(location.search).get('id')?.trim()||'UNKNOWN';

  const rain=document.createElement('div');
  rain.className='cast-data-rain';
  rain.setAttribute('aria-hidden','true');
  const chars='01 N◎VA CAST ACCESS DATA LINK TRACE AUTH ';
  for(let index=0;index<16;index++){
    const line=document.createElement('span');
    line.style.left=`${index*6.4+(index%3)*1.2}%`;
    line.style.animationDuration=`${10+(index%6)*2.2}s`;
    line.style.animationDelay=`-${(index*1.7)%12}s`;
    line.textContent=Array.from({length:34},(_,row)=>{
      const start=(index*7+row*5)%chars.length;
      return chars.slice(start,start+8).padEnd(8,'0');
    }).join('\n');
    rain.append(line);
  }
  document.body.prepend(rain);

  const overlay=document.createElement('section');
  overlay.className='cast-access-overlay';
  overlay.setAttribute('aria-live','polite');
  overlay.innerHTML=`
    <div class="cast-access-terminal">
      <p class="cast-access-kicker">N◎VA MUNICIPAL NET // SECURE TRACE</p>
      <h1 class="cast-access-title">CAST DATA SCAN</h1>
      <p class="cast-access-target">TARGET: ${escapeHtml(publicId)}</p>
      <div class="cast-access-progress" aria-label="スキャン進行"><span></span></div>
      <div class="cast-access-log"></div>
    </div>`;
  document.body.prepend(overlay);

  const bar=overlay.querySelector('.cast-access-progress span');
  const log=overlay.querySelector('.cast-access-log');
  const entries=[['ROUTE','都市ネットへ接続'],['TRACE','対象IDを追跡'],['AUTH','アクセス権限を照合'],['SCAN','身体・経歴・技能データを抽出'],['VERIFY','データ整合性を確認']];
  const startedAt=performance.now();
  const minimumDisplayMs=2100;
  let progress=0,line=0,resolved=false;

  function addLog(label,text,ok=false){const p=document.createElement('p');p.className=ok?'ok':'';p.innerHTML=`<strong>${escapeHtml(label)}</strong> // ${escapeHtml(text)}`;log.append(p);}
  function finish(success){
    if(resolved)return;resolved=true;progress=100;bar.style.width='100%';addLog(success?'ACCESS GRANTED':'DENIED',success?'パーソナルデータ取得完了':'対象データの取得に失敗',success);
    const remain=Math.max(0,minimumDisplayMs-(performance.now()-startedAt));
    window.setTimeout(()=>{overlay.classList.add('is-complete');window.setTimeout(()=>overlay.remove(),620);},remain+220);
  }
  addLog('LINK','暗号化経路を確立中…');
  const timer=setInterval(()=>{
    const content=document.querySelector('#cast-content'),error=document.querySelector('#cast-error');
    const dataReady=content&&!content.hidden,failed=error&&!error.hidden,cap=(dataReady||failed)?100:90;
    progress=Math.min(cap,progress+Math.max(2,Math.round((cap-progress)*.15)));bar.style.width=`${progress}%`;
    const threshold=[18,36,56,76,91];while(line<entries.length&&progress>=threshold[line]){addLog(entries[line][0],entries[line][1],line<2);line++;}
    if(failed){clearInterval(timer);finish(false);return;}if(dataReady&&progress>=96){clearInterval(timer);finish(true);}
  },110);
  window.setTimeout(()=>{if(resolved)return;const content=document.querySelector('#cast-content'),error=document.querySelector('#cast-error');if(content&&!content.hidden){clearInterval(timer);finish(true);}else if(error&&!error.hidden){clearInterval(timer);finish(false);}},3600);
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
})();

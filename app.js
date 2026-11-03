'use strict';
const $=id=>document.getElementById(id);
const chapters={
    1:'Nền tảng ngôn ngữ',2:'Xây dựng lớp – Đối tượng',3:'Kế thừa – Đa hình',4:'Giao diện',5:'Tập hợp',6:'Xử lý ngoại lệ',7:'Delegate và Event'
}
;
const topicTitles=Object.fromEntries(BANK.map(q=>[q.topic,q.topicTitle]));
const state={
    list:[],answers:{
    }
    ,idx:0,submitted:false
}
;
function shuffle(items){
    let a=[...items];
    for(let i=a.length-1;i>0;i--){
        let j=Math.floor(Math.random()*(i+1));
        [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
}
function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,c=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }
    [c]));
}
function setupChapters(){
    for(let k of Object.keys(chapters)){
        let opt=document.createElement('option');
        opt.value=k;
        opt.textContent=`Chương ${k}: ${chapters[k]}`;
        $('chapter').append(opt);
    }
    refreshTopics();
}
function refreshTopics(){
    let selected=$('chapter').value, old=$('topic').value;
    $('topic').innerHTML='<option value="all">Tất cả tiểu mục</option>';
    for(let key of Object.keys(topicTitles).sort((a,b)=>parseFloat(a)-parseFloat(b))){
        if(selected!=='all' && !key.startsWith(selected+'.'))continue;
        let o=document.createElement('option');
        o.value=key;
        o.textContent=key+' — '+topicTitles[key];
        $('topic').append(o);
    }
    $('topic').value=[...$('topic').options].some(o=>o.value===old)?old:'all';
    refreshAvailable();
}
function pool(){
    return BANK.filter(q=>($('chapter').value==='all'||q.chapter===+ $('chapter').value)&&($('topic').value==='all'||q.topic===$('topic').value)&&($('kind').value==='all'||q.type===$('kind').value)&&($('difficulty').value==='all'||q.difficulty===$('difficulty').value));
}
function refreshAvailable(){
    let p=pool(),t=p.filter(x=>x.type==='theory').length;
    $('available').textContent=`Đang có ${p.length} câu phù hợp (${t} lý thuyết, ${p.length-t} code). Có thể chọn tối đa ${p.length} câu theo bộ lọc hiện tại.`;
    $('start').disabled=!p.length;
}
function selectedBank(p,n){
    if($('kind').value!=='all')return shuffle(p).slice(0,n);
    let theory=shuffle(p.filter(q=>q.type==='theory')),code=shuffle(p.filter(q=>q.type==='code'));
    let t=Math.min(theory.length,Math.round(n*.2)),c=Math.min(code.length,n-t);
    while(t+c<n&&t<theory.length)t++;
    while(t+c<n&&c<code.length)c++;
    return shuffle([...theory.slice(0,t),...code.slice(0,c)]);
}
function startQuiz(){
    let p=pool(),n=Math.max(1,Math.min(1000,parseInt($('count').value)||20));
    n=Math.min(n,p.length);
    if(!n)return;
    $('count').value=n;
    state.list=selectedBank(p,n);
    state.answers={
    }
    ;
    state.idx=0;
    state.submitted=false;
    $('setup').classList.add('hidden');
    $('result').classList.add('hidden');
    $('quiz').classList.remove('hidden');
    render();
    window.scrollTo(0,0);
}
function render(){
    let q=state.list[state.idx];
    if(!q)return;
    $('qpos').textContent=`Câu ${state.idx+1} / ${state.list.length}`;
    $('qmeta').textContent=`${q.topic} · ${q.type==='code'?'Code':'Lý thuyết'} · ${q.difficulty}`;
    $('qtext').textContent=q.question;
    $('snippet').textContent=q.code;
    $('snippet').classList.toggle('hidden',!q.code);
    $('choices').innerHTML='';
    q.options.forEach((option,i)=>{
        let label=document.createElement('label');label.className='opt';let r=document.createElement('input');r.type='radio';r.name='answer';r.value=i;r.checked=state.answers[q.id]===i;r.setAttribute('aria-label',String.fromCharCode(65+i));r.onchange=()=>{
            state.answers[q.id]=i;updateProgress();
        }
        ;let letter=document.createElement('span');letter.className='letter';letter.textContent=String.fromCharCode(65+i)+'.';let text=document.createElement('span');text.textContent=option;label.append(r,letter,text);$('choices').append(label);
    }
    );
    $('prev').disabled=state.idx===0;
    $('next').disabled=state.idx===state.list.length-1;
    updateProgress();
}
function updateProgress(){
    let count=state.list.filter(q=>state.answers[q.id]!==undefined).length;
    $('progressText').textContent=`${count}/${state.list.length} câu đã trả lời · ${state.list.length-count} câu còn trống`;
    $('progressbar').style.width=(100*count/state.list.length)+'%';
    let nav=$('navigator');
    nav.innerHTML='';
    state.list.forEach((q,i)=>{
        let b=document.createElement('button');b.className='num'+(state.answers[q.id]!==undefined?' done':'')+(i===state.idx?' current':'');b.textContent=i+1;b.title=`Đi tới câu ${i+1}`;b.onclick=()=>{
            state.idx=i;render();
        }
        ;nav.append(b);
    }
    );
}
function submitQuiz(){
    let blank=state.list.filter(q=>state.answers[q.id]===undefined).length;
    if(blank&&!confirm(`Bạn chưa trả lời ${blank} câu. Vẫn nộp bài?`))return;
    state.submitted=true;
    const hit=state.list.filter(q=>state.answers[q.id]===q.correct).length;
    $('quiz').classList.add('hidden');
    $('result').classList.remove('hidden');
    $('score').textContent=`${hit} / ${state.list.length}`;
    $('summary').textContent=`Đúng ${hit} câu · Sai/bỏ qua ${state.list.length-hit} câu · Đạt ${(100*hit/state.list.length).toFixed(1)}%`;
    renderReview(false);
    window.scrollTo(0,0);
}
function renderReview(onlyWrong){
    let div=$('reviewList');
    div.innerHTML='';
    let items=state.list.map((q,i)=>({
        q,i
    }
    )).filter(({
        q
    }
    )=>!onlyWrong||state.answers[q.id]!==q.correct);
    if(items.length===0){
        div.textContent='Không có câu sai hoặc bỏ qua.';
        return;
    }
    const frag=document.createDocumentFragment();
    for(let {
        q,i
    }
    of items){
        let isCorrect=state.answers[q.id]===q.correct;
        let part=document.createElement('article');
        part.className='review '+(isCorrect?'good':'bad');
        let selected=state.answers[q.id];
        let userText=selected===undefined?'Chưa trả lời':`${'ABCD'[selected]}. ${q.options[selected]}`;
        part.innerHTML=`<strong>Câu ${i+1} · ${escapeHtml(q.topic)} · ${isCorrect?'Đúng':'Sai / bỏ qua'}</strong><p>${escapeHtml(q.question)}</p>${q.code?'<pre>'+escapeHtml(q.code)+'</pre>':''}<p><b>Bạn chọn:</b> ${escapeHtml(userText)}</p><p><b>Đáp án:</b> ${'ABCD'[q.correct]}. ${escapeHtml(q.options[q.correct])}</p><p><b>Giải thích:</b> ${escapeHtml(q.explanation)}</p><p class="small">Tham khảo: ${escapeHtml(q.source.join(', '))}</p>`;
        frag.append(part);
    }
    div.append(frag);
}
function exportResults(){
    let lines=[['STT','ID','Tiểu mục','Loại','Đáp án chọn','Đáp án đúng','Đúng?']];
    state.list.forEach((q,i)=>lines.push([i+1,q.id,q.topic,q.type,state.answers[q.id]===undefined?'':('ABCD'[state.answers[q.id]]),'ABCD'[q.correct],state.answers[q.id]===q.correct?'1':'0']));
    let csv='\ufeff'+lines.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
    let url=URL.createObjectURL(new Blob([csv],{
        type:'text/csv;charset=utf-8'
    }
    )),a=document.createElement('a');
    a.href=url;
    a.download='ket_qua_OOP.csv';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('chapter').onchange=refreshTopics;
$('topic').onchange=refreshAvailable;
$('kind').onchange=refreshAvailable;
$('difficulty').onchange=refreshAvailable;
document.querySelectorAll('.quick').forEach(b=>b.onclick=()=>$('count').value=b.dataset.n);
$('start').onclick=startQuiz;
$('prev').onclick=()=>{
    if(state.idx>0){
        state.idx--;
        render();
    }
}
;
$('next').onclick=()=>{
    if(state.idx<state.list.length-1){
        state.idx++;
        render();
    }
}
;
$('submit').onclick=submitQuiz;
$('allReview').onclick=()=>renderReview(false);
$('wrongReview').onclick=()=>renderReview(true);
$('restart').onclick=()=>{
    $('result').classList.add('hidden');
    $('setup').classList.remove('hidden');
    refreshAvailable();
    window.scrollTo(0,0);
}
;
$('export').onclick=exportResults;
setupChapters();

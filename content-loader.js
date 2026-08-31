/* BALAD LIVE CONTENT LOADER
   Public pages read safe, public website content from Firestore.
   No staff passwords, parent details or student private records are exposed here.
*/
import { db } from "./firebase-config.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

function safeUrl(url=""){
  try{
    const u=new URL(url, location.href);
    if(["http:","https:"].includes(u.protocol)) return u.href;
  }catch{}
  return "";
}

function applyText(items){
  for(const item of items){
    if(item.type!=="text") continue;
    const el=document.querySelector(`[data-text-key="${CSS.escape(item.key||"")}"]`);
    if(el && item.value!==undefined) el.innerHTML=String(item.value).replace(/\n/g,"<br>");
  }
}

function applyMedia(items){
  for(const item of items){
    if(item.type!=="media") continue;
    const el=document.querySelector(`[data-media-key="${CSS.escape(item.key||"")}"]`);
    const url=safeUrl(item.url||item.value||"");
    if(!el||!url) continue;
    if(el.tagName==="IMG"){ el.src=url; }
    else if(item.mode==="background"){ el.style.backgroundImage=`url("${url.replace(/"/g,'\\"')}")`; }
  }
}

function renderBlock(block){
  const url=safeUrl(block.mediaUrl||"");
  const media=block.mediaType==="video" && url
    ? `<video controls preload="metadata" src="${esc(url)}"></video>`
    : block.mediaType==="image" && url
      ? `<img src="${esc(url)}" alt="${esc(block.title||"BALAD")}">`
      : "";
  return `<article class="cms-content-card">
    ${media}
    ${block.title?`<h2>${esc(block.title)}</h2>`:""}
    ${block.body?`<div>${esc(block.body).replace(/\n/g,"<br>")}</div>`:""}
  </article>`;
}

async function loadPublicContent(){
  try{
    const snap=await getDocs(collection(db,"publicContent"));
    const items=snap.docs.map(d=>({id:d.id,...d.data()}));
    applyText(items); applyMedia(items);
    const blocks=items.filter(x=>x.type==="block")
      .filter(x=>x.page===document.body.dataset.cmsPage || x.page===location.pathname.split("/").pop()?.replace(".html",""))
      .sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    const root=document.getElementById("cms-page-content");
    if(root) root.innerHTML=blocks.map(renderBlock).join("");
  }catch(e){ console.warn("BALAD public content unavailable:",e.message); }
}

function staffCard(s){
  const photo=s.photoUrl ? `<img class="staff-photo" src="${esc(s.photoUrl)}" alt="${esc(s.name||"Staff")}">` :
    `<div class="staff-placeholder">${esc((s.name||"S").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase())}</div>`;
  const subjects=(s.subjects||s.assignedSubjects||[]).filter(Boolean);
  return `<article class="team-card teacher-card">${photo}<div class="team-card-content">
    <h3>${esc(s.name||"Staff")}</h3>
    ${subjects.length?`<p><strong>Subjects:</strong><br>${subjects.map(esc).join(" / ")}</p>`:""}
    ${s.position?`<p class="position">${esc(s.position)}</p>`:""}
  </div></article>`;
}

async function loadPublicStaff(){
  const targets=[...document.querySelectorAll("[data-public-staff-category],[data-public-staff-school]")];
  if(!targets.length) return;
  try{
    const snap=await getDocs(collection(db,"publicStaff"));
    const staff=snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.active!==false);
    for(const el of targets){
      let rows=staff;
      const category=el.dataset.publicStaffCategory;
      const school=el.dataset.publicStaffSchool;
      if(category==="management") rows=rows.filter(s=>s.category==="management");
      else if(category==="college") rows=rows.filter(s=>s.category==="college");
      else if(category==="primary") rows=rows.filter(s=>s.category==="primary");
      else if(category==="non_teaching") rows=rows.filter(s=>s.category==="non_teaching").slice(0,6);
      if(school) rows=rows.filter(s=>s.school===school || s.school==="both" || s.category==="management" && school==="college");
      el.innerHTML=rows.length?rows.map(staffCard).join(""):`<p class="cms-empty">Team profiles will be published here.</p>`;
    }
  }catch(e){ console.warn("BALAD public staff unavailable:",e.message); }
}

async function loadGallery(){
  const root=document.getElementById("albumGrid");
  if(!root) return;
  try{
    const snap=await getDocs(collection(db,"publicGalleryAlbums"));
    const albums=snap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.active!==false);
    if(!albums.length) return;
    root.innerHTML=albums.map(a=>{
      const photos=Array.isArray(a.items)?a.items:[];
      const cover=safeUrl(a.coverUrl||photos[0]?.url||"");
      const search=esc(`${a.title||""} ${a.description||""} ${a.activity||""}`);
      return `<article class="album-card" data-search="${search}">
        <button class="album-cover" type="button" data-live-album="${esc(a.id)}">
          <div class="album-stack">${photos.slice(0,3).map(p=>`<img src="${esc(safeUrl(p.url)||"")}" alt="${esc(p.caption||a.title||"Album")}">`).join("") || (cover?`<img src="${esc(cover)}" alt="${esc(a.title||"Album")}">`:"")}</div>
        </button>
        <div class="album-meta"><span class="album-location">${esc(a.schoolLabel||"BALAD PRIVATE SCHOOLS")}</span>
        <h2>${esc(a.title||"Album")}</h2><p>${esc(a.description||a.activity||"School activity")}</p>
        <span class="album-count">${photos.length} item${photos.length===1?"":"s"}</span></div>
      </article>`;
    }).join("");
    const count=document.getElementById("albumCount"); if(count) count.textContent=`${albums.length} album${albums.length===1?"":"s"}`;
    const search=document.getElementById("gallerySearch");
    if(search){
      search.oninput=()=>{
        const term=search.value.trim().toLowerCase();
        let visible=0;
        root.querySelectorAll(".album-card").forEach(card=>{const show=!term||(card.dataset.search||"").toLowerCase().includes(term);card.hidden=!show;if(show)visible++;});
        if(count) count.textContent=`${visible} album${visible===1?"":"s"}`;
      };
      document.getElementById("albumReset")?.addEventListener("click",()=>{search.value="";search.oninput();});
    }
    root.querySelectorAll("[data-live-album]").forEach(btn=>btn.addEventListener("click",()=>{
      const a=albums.find(x=>x.id===btn.dataset.liveAlbum); if(!a) return;
      const modal=document.getElementById("albumModal"), photos=document.getElementById("albumPhotos");
      if(!modal||!photos) return;
      document.getElementById("albumModalTitle").textContent=a.title||"Album";
      document.getElementById("albumModalDescription").textContent=a.description||"";
      document.getElementById("albumModalLocation").textContent=a.schoolLabel||"BALAD PRIVATE SCHOOLS";
      photos.innerHTML=(a.items||[]).map(p=>p.type==="video"
        ? `<video controls src="${esc(safeUrl(p.url))}"></video>`
        : `<img src="${esc(safeUrl(p.url))}" alt="${esc(p.caption||a.title||"Photo")}">`).join("");
      modal.hidden=false;
    }));
  }catch(e){ console.warn("BALAD gallery unavailable:",e.message); }
}

document.addEventListener("DOMContentLoaded",()=>{
  loadPublicContent(); loadPublicStaff(); loadGallery();
});

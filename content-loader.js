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



function renderFeatureMedia(item, cls=""){
  const url=safeUrl(item.url||"");
  if(!url) return `<div class="${cls}spotlight-placeholder"><strong>Coming Soon</strong></div>`;
  if(item.mediaType==="video") return `<video class="${cls}" controls muted playsinline preload="metadata" src="${esc(url)}"></video>`;
  return `<img class="${cls}" src="${esc(url)}" alt="${esc(item.title||"BALAD feature")}">`;
}

function renderHomepageFeatures(items){
  const featureItems=items.filter(x=>x.type==="homepageFeature");
  const spotlight=featureItems.find(x=>x.feature==="spotlight" && x.active!==false);
  const spotlightRoot=document.getElementById("baladSpotlight");
  if(spotlightRoot && spotlight){
    const media=spotlight.mediaUrl ? (spotlight.mediaType==="video"
      ? `<video controls muted playsinline preload="metadata" src="${esc(safeUrl(spotlight.mediaUrl))}"></video>`
      : `<img src="${esc(safeUrl(spotlight.mediaUrl))}" alt="${esc(spotlight.title||"BALAD Spotlight")}">`) : `<div class="spotlight-placeholder"><strong>Coming Soon</strong></div>`;
    spotlightRoot.innerHTML=`<div class="spotlight-media">${media}</div><div class="spotlight-copy"><p class="spotlight-kicker">${esc(spotlight.label||"BALAD SPOTLIGHT")}</p><h3>${esc(spotlight.title||"BALAD Spotlight")}</h3><p>${esc(spotlight.body||"").replace(/\n/g,"<br>")}</p></div>`;
  }
  const weekRoot=document.getElementById("baladWeekGrid");
  if(weekRoot){
    const week=featureItems.filter(x=>x.feature==="week" && x.active!==false).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)).slice(0,3);
    if(week.length){
      weekRoot.innerHTML=week.map((w,i)=>{
        const url=safeUrl(w.mediaUrl||"");
        const media=url ? (w.mediaType==="video" ? `<video muted playsinline preload="metadata" src="${esc(url)}"></video>` : `<img src="${esc(url)}" alt="${esc(w.title||"This Week at BALAD")}">`) : `<div class="week-placeholder">Coming Soon</div>`;
        return `<article class="week-card"><div class="week-media">${media}</div><div class="week-copy"><h3>${esc(w.title||["Week Moment","School Activity","Achievement"][i]||"BALAD Moment")}</h3><p>${esc(w.body||"").replace(/\n/g,"<br>")}</p></div></article>`;
      }).join("");
    }
  }

  const popup=document.getElementById("backSchoolOverlay");
  if(!popup) return;
  const now=new Date();
  let bs=featureItems.find(x=>x.feature==="backToSchool");
  if(!bs){
    bs={active:true,startAt:"2026-09-12T00:00:00+01:00",endAt:"2026-09-20T00:00:00+01:00",title:"WELCOME TO THE 2026/2027 SCHOOL YEAR",subtitle:"2026/2027 Academic Session",body:"A new session. New goals. New possibilities. Welcome back to our students, parents and staff.",items:[]};
  }
  const start=new Date(bs.startAt||"2026-09-12T00:00:00+01:00"), end=new Date(bs.endAt||"2026-09-20T00:00:00+01:00");
  const shouldShow=now>=start && now<end;
  if(!shouldShow){popup.hidden=true;return;}
  document.getElementById("backSchoolTitle").textContent=bs.title||"WELCOME BACK";
  document.getElementById("backSchoolSubtitle").textContent=bs.subtitle||"2026/2027 Academic Session";
  document.getElementById("backSchoolBody").textContent=bs.body||"Welcome back to BALAD Private Schools.";
  const gallery=document.getElementById("backSchoolGallery");
  // Back-to-School popup: show images only. Videos are intentionally excluded.
  const mediaItems=(Array.isArray(bs.items)?bs.items:[]).filter(m=>m && m.type!=="video" && m.url);
  const galleryBtn=document.getElementById("backSchoolGalleryBtn");
  if(mediaItems.length){
    gallery.innerHTML=mediaItems.slice(0,5).map(m=>`<figure><img src="${esc(safeUrl(m.url))}" alt="${esc(m.caption||"Back-to-School moment")}"></figure>`).join("");
    if(galleryBtn) galleryBtn.hidden=false;
  } else {
    gallery.innerHTML='<div class="back-school-empty" aria-hidden="true"></div>';
    if(galleryBtn) galleryBtn.hidden=false;
  }
  const close=()=>{popup.hidden=true;};
  window.closeBaladBackSchool=close;
  document.getElementById("backSchoolClose")?.addEventListener("click",close);
  document.getElementById("backSchoolEnterBtn")?.addEventListener("click",close);
  document.getElementById("backSchoolGalleryBtn")?.addEventListener("click",()=>gallery.scrollIntoView({behavior:"smooth",block:"center"}));
  popup.hidden=false;
}

function renderPrimaryClassroomFacility(){
  const page=document.body.dataset.cmsPage || location.pathname.split("/").pop()?.replace(".html","");
  if(page!=="nursery-primary") return;
  const card=document.querySelector(".facilities-wrap .facility-proto-card");
  if(!card) return;
  const images=[1,2,3,4,5].map(n=>`images/primary-classroom-${n}.jpg`);
  card.innerHTML=`
    <div class="primary-facility-gallery">
      ${images.map((src,i)=>`<img src="${src}" alt="BALAD Primary School classroom ${i+1}" loading="lazy">`).join("")}
    </div>
    <div class="primary-facility-copy">
      <h3>Primary School Classrooms</h3>
      <p>Bright and welcoming learning spaces designed to support focused learning, creativity and everyday classroom activities.</p>
    </div>`;

  if(!document.getElementById("primaryFacilityGalleryStyles")){
    const style=document.createElement("style");
    style.id="primaryFacilityGalleryStyles";
    style.textContent=`
      .primary-facility-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:8px;background:#f6f3e8;border-radius:16px;overflow:hidden}
      .primary-facility-gallery img{display:block;width:100%;height:150px;object-fit:cover;border-radius:11px;box-shadow:0 3px 12px rgba(0,0,0,.10)}
      .primary-facility-gallery img:first-child{grid-column:1 / -1;height:220px}
      .primary-facility-copy{padding:14px 4px 2px}
      .primary-facility-copy h3{margin:0 0 7px}
      .primary-facility-copy p{margin:0;line-height:1.6}
      @media(max-width:600px){.primary-facility-gallery img{height:105px}.primary-facility-gallery img:first-child{height:170px}}
    `;
    document.head.appendChild(style);
  }
}

async function loadPublicContent(){
  try{
    const snap=await getDocs(collection(db,"publicContent"));
    const items=snap.docs.map(d=>({id:d.id,...d.data()}));
    applyText(items); applyMedia(items); renderHomepageFeatures(items);
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

function normalizeStaffRole(value){
  return String(value || "")
    .toLowerCase()
    .replace(/&/g,"and")
    .replace(/[‐‑‒–—-]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function leadershipCard(s){
  const photo=s.photoUrl
    ? `<img class="school-leader-photo" src="${esc(s.photoUrl)}" alt="${esc(s.name||"School Leader")}">`
    : `<div class="school-leader-placeholder">${esc((s.name||"S").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase())}</div>`;
  return `<article class="school-leader-card">
    <div class="school-leader-media">${photo}</div>
    <div class="school-leader-content">
      <p class="school-leader-eyebrow">SCHOOL LEADERSHIP</p>
      <h3>${esc(s.name||"School Leader")}</h3>
      <p class="school-leader-role">${esc(s.position||s.role||"")}</p>
    </div>
  </article>`;
}

async function loadPublicStaff(){
  const targets=[...document.querySelectorAll("[data-public-staff-category],[data-public-staff-school],[data-public-leadership-role]")];
  if(!targets.length) return;
  try{
    const snap=await getDocs(collection(db,"publicStaff"));
    const staff=snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.active!==false);
    for(const el of targets){
      let rows=staff;
      const category=el.dataset.publicStaffCategory;
      const school=el.dataset.publicStaffSchool;
      const leadershipRole=el.dataset.publicLeadershipRole;

      if(leadershipRole){
        const wanted=normalizeStaffRole(leadershipRole);
        rows=rows.filter(s=>{
          const role=normalizeStaffRole(s.position||s.role);
          return normalizeStaffRole(s.category)==="management" && role===wanted;
        }).slice(0,1);
        el.innerHTML=rows.length
          ? rows.map(leadershipCard).join("")
          : `<p class="cms-empty">School leadership information will be published here.</p>`;
        continue;
      }

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
  renderHomepageFeatures([]);
  renderPrimaryClassroomFacility();
  loadPublicContent(); loadPublicStaff(); loadGallery();
});

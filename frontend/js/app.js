/* ================================================
   PRICHOY — Core App Logic v5 (Phase 3.1)
   Connected to the real backend (js/api.js) instead
   of the hardcoded PRODUCTS/MEN_PRODUCTS arrays the
   static demo shipped with. Auth (login/register) is
   UNCHANGED and still demo-only localStorage — there
   is no customer account system in the backend (see
   the Phase 3 report); only products/cart/checkout
   were connected.
   ================================================ */

// ── PRODUCTS (now loaded from the backend, not hardcoded) ──
let PRODUCTS_CACHE = [];
let PRODUCTS_LOADED = false;

async function loadProductsCache(){
  try {
    const res = await api.getProducts({ limit: 100 });
    PRODUCTS_CACHE = (res.data || []).map(adaptProduct);
  } catch(e){
    console.error("Failed to load products from the backend:", e);
    PRODUCTS_CACHE = [];
  }
  PRODUCTS_LOADED = true;
}

function assetUrl(path) {
  if (!path || /^(https?:)?\/\//.test(path)) return path;
  return window.location.pathname.includes("/pages/") ? `../${path}` : path;
}

// ── STATE ─────────────────────────────────────────
const state = {
  cart:[], wishlist:[], user:null,
  filterCat:"all", filterSort:"default", filterGender:"men", coupon:null,
};

function saveState() {
  localStorage.setItem("prichoy_v5", JSON.stringify({ cart:state.cart, wishlist:state.wishlist, user:state.user }));
}
function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem("prichoy_v5") || "{}");
    // Validate against the real catalog — a product that's since been
    // unpublished/deleted quietly drops out of a saved cart/wishlist
    // rather than showing a broken row.
    state.cart     = (d.cart || []).filter(item => PRODUCTS_CACHE.some(product => product.id === item.productId));
    state.wishlist = (d.wishlist || []).filter(id => PRODUCTS_CACHE.some(product => product.id === id));
    state.user     = d.user     || null;
  } catch(e){}
}
function checkInactivity() {
  if (!state.user) return;
  if (Date.now() - (state.user.lastActive||0) > 90*24*60*60*1000) {
    localStorage.removeItem("prichoy_v5");
    state.user=null; state.cart=[]; state.wishlist=[];
    toast("Account inactive 90+ days — data cleared.","err");
  }
}
function touchActivity() { if(state.user){ state.user.lastActive=Date.now(); saveState(); } }

// ── CART ──────────────────────────────────────────
// Every cart line carries the real productId/variantId so checkout can
// send them straight to POST /api/public/orders — the price shown here is
// a snapshot for display only; the server re-prices everything from the
// database at checkout time and that number is the one that's charged.
function cartAdd(p, qty=1, size=null, colorId=null, variant=null) {
  if(!p) return;
  size = size || (p.sizes[0] !== "One Size" ? p.sizes[0] : "One Size");
  colorId = colorId !== undefined ? colorId : (p.colors[0]?.id ?? null);
  variant = variant || findVariant(p, size, colorId);
  const unitPrice = variant ? Number(variant.salePrice ?? variant.price ?? p.price) : p.price;

  const ex = state.cart.find(i=>i.productId===p.id && i.size===size && i.colorId===colorId);
  if(ex){ ex.qty+=qty; }
  else {
    state.cart.push({
      productId:p.id, variantId:variant?variant.id:null, qty, size, colorId,
      name:p.name, price:unitPrice, image:p.image, gender:p.gender,
    });
  }
  saveState(); refreshCartUI(); toast(`${p.name} added to cart ✓`,"ok");
}
/** For inline onclick handlers (shop grid cards) that only have a product id, not the full object. */
function cartAddById(id, qty=1, size=null){
  const p = PRODUCTS_CACHE.find(x=>x.id===id); if(!p) return;
  cartAdd(p, qty, size);
}
function cartRemove(productId,size){ state.cart=state.cart.filter(i=>!(i.productId===productId&&i.size===size)); saveState(); refreshCartUI(); }
function cartQty(productId,size,delta){ const i=state.cart.find(x=>x.productId===productId&&x.size===size); if(!i) return; i.qty=Math.max(1,i.qty+delta); saveState(); refreshCartUI(); }
function cartTotal(){ return state.cart.reduce((s,i)=>s+i.price*i.qty,0); }
function cartCount(){ return state.cart.reduce((s,i)=>s+i.qty,0); }
function clearCart(){ state.cart=[]; state.coupon=null; saveState(); refreshCartUI(); }

function wishToggle(pid){ const idx=state.wishlist.indexOf(pid); if(idx===-1){state.wishlist.push(pid);toast("Added to wishlist ♥","ok");}else{state.wishlist.splice(idx,1);toast("Removed from wishlist","");} saveState(); refreshWishUI(); }
function isWished(pid){ return state.wishlist.includes(pid); }

// Coupon codes are now validated server-side (POST /api/public/coupons/validate,
// see checkout.html) rather than looked up in a hardcoded client-side table.
// The cart drawer no longer shows a live discount preview — that requires an
// async round trip, and the drawer previously did it synchronously; the
// checkout page (which is already async/API-driven) is where discount
// preview now happens.
function deliveryCharge(city){ if(!city) return 0; return city.toLowerCase().includes("dhaka")?80:120; }

// ── TOAST ─────────────────────────────────────────
function toast(msg, type="") {
  const w=document.getElementById("toastWrap"); if(!w) return;
  const el=document.createElement("div"); el.className=`toast ${type}`;
  el.innerHTML=`<span>${msg}</span>`;
  w.appendChild(el);
  setTimeout(()=>{el.style.opacity="0";el.style.transform="translateY(8px)";setTimeout(()=>el.remove(),300);},3000);
}

function comingSoon(){
  if(typeof closeMobNav==="function") closeMobNav();
  toast("👗 Women's Collection — Coming Soon!","info");
}

// ── CART UI ───────────────────────────────────────
function refreshCartUI(){
  const n=cartCount();
  document.querySelectorAll(".cart-count").forEach(el=>{el.textContent=n;el.classList.toggle("show",n>0);});
  renderCartItems();
}
function renderCartItems(){
  const body=document.getElementById("cartBody"); if(!body) return;
  if(!state.cart.length){
    body.innerHTML=`<div class="cart-empty-state"><span class="empty-icon">🛍️</span><p>Your cart is empty</p><a href="pages/shop.html" class="btn btn-black btn-sm" onclick="closeCart()" style="margin-top:10px">Explore Collections</a></div>`;
    updateCartFooter(); return;
  }
  body.innerHTML=state.cart.map(item=>`
    <div class="c-item">
      <img src="${assetUrl(item.image)}" alt="${item.name}" class="c-item-img">
      <div class="c-item-info">
        <div class="c-item-name">${item.name}</div>
        <div class="c-item-meta">Size: ${item.size}</div>
        <div class="c-item-price">৳${(item.price*item.qty).toLocaleString()}</div>
        <div class="c-item-qty">
          <button class="qty-b" onclick="cartQty('${item.productId}','${item.size}',-1)">−</button>
          <span class="qty-v">${item.qty}</span>
          <button class="qty-b" onclick="cartQty('${item.productId}','${item.size}',1)">+</button>
        </div>
      </div>
      <button class="c-item-rm" onclick="cartRemove('${item.productId}','${item.size}')">✕</button>
    </div>`).join("");
  updateCartFooter();
}
function updateCartFooter(){
  const sub=cartTotal();
  const s=document.getElementById("cSub"), dr=document.getElementById("cDiscRow"), t=document.getElementById("cTot");
  if(s) s.textContent=`৳${sub.toLocaleString()}`;
  if(t) t.textContent=`৳${sub.toLocaleString()}`;
  if(dr) dr.style.display="none"; // discount preview now lives on the checkout page — see note above
}

function openCart(){ document.getElementById("cartDrawer")?.classList.add("open"); document.getElementById("cartMask")?.classList.add("open"); document.body.style.overflow="hidden"; }
function closeCart(){ document.getElementById("cartDrawer")?.classList.remove("open"); document.getElementById("cartMask")?.classList.remove("open"); document.body.style.overflow=""; }
function openMobNav(){ document.getElementById("mobNav")?.classList.add("open"); document.body.style.overflow="hidden"; }
function closeMobNav(){ document.getElementById("mobNav")?.classList.remove("open"); document.body.style.overflow=""; }
function openAuth(tab="login"){ document.getElementById("authModal")?.classList.add("open"); switchAuthTab(tab); document.body.style.overflow="hidden"; }
function closeAuth(){ document.getElementById("authModal")?.classList.remove("open"); document.body.style.overflow=""; }
function switchAuthTab(tab){ document.querySelectorAll(".m-tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===tab)); document.querySelectorAll(".a-form").forEach(f=>f.classList.toggle("hidden",f.id!==`af-${tab}`)); }

// ── AUTH (unchanged — demo-only, no real backend customer-login system exists) ──
function doLogin(e){
  e.preventDefault();
  const email=document.getElementById("l-email").value.trim(), pass=document.getElementById("l-pass").value;
  const users=JSON.parse(localStorage.getItem("prichoy_users")||"[]");
  const u=users.find(x=>x.email===email&&x.password===pass);
  if(!u){toast("Invalid email or password","err");return;}
  state.user={...u,lastActive:Date.now()};
  const saved=JSON.parse(localStorage.getItem(`prichoy_u_${email}`)||"{}");
  if(saved.cart) state.cart=saved.cart; if(saved.wishlist) state.wishlist=saved.wishlist;
  saveState(); refreshCartUI(); refreshWishUI(); refreshAuthUI(); closeAuth();
  toast(`Welcome back, ${u.name.split(" ")[0]}! 🌸`,"ok");
}
function doRegister(e){
  e.preventDefault();
  const name=document.getElementById("r-name").value.trim(), email=document.getElementById("r-email").value.trim(), phone=document.getElementById("r-phone").value.trim(), pass=document.getElementById("r-pass").value, confirm=document.getElementById("r-confirm").value;
  if(pass!==confirm){toast("Passwords don't match","err");return;}
  if(pass.length<6){toast("Password must be 6+ characters","err");return;}
  const users=JSON.parse(localStorage.getItem("prichoy_users")||"[]");
  if(users.find(u=>u.email===email)){toast("Email already registered","err");return;}
  const newU={name,email,phone,password:pass,createdAt:Date.now()};
  users.push(newU); localStorage.setItem("prichoy_users",JSON.stringify(users));
  state.user={...newU,lastActive:Date.now()}; saveState(); refreshAuthUI(); closeAuth();
  toast(`Welcome to Prichoy, ${name}! 🌸`,"ok");
}
function doForgot(e){
  e.preventDefault();
  const email=document.getElementById("f-email").value.trim();
  const users=JSON.parse(localStorage.getItem("prichoy_users")||"[]");
  if(!users.find(u=>u.email===email)){toast("No account with that email","err");return;}
  const token=Math.random().toString(36).substr(2,10).toUpperCase();
  localStorage.setItem(`prichoy_reset_${email}`,token);
  toast(`Reset link sent! Demo token: ${token}`,"ok"); switchAuthTab("login");
}
function doLogout(){
  if(state.user) localStorage.setItem(`prichoy_u_${state.user.email}`,JSON.stringify({cart:state.cart,wishlist:state.wishlist}));
  state.user=null; state.cart=[]; state.wishlist=[];
  saveState(); refreshCartUI(); refreshWishUI(); refreshAuthUI();
  toast("Logged out successfully","");
}

function refreshWishUI(){
  document.querySelectorAll("[data-wid]").forEach(btn=>{
    const id=btn.dataset.wid;
    btn.classList.toggle("loved",isWished(id));
    btn.innerHTML=isWished(id)?"♥":"♡";
  });
}
function refreshAuthUI(){
  const li=document.getElementById("navLogin"), lo=document.getElementById("navLogout"), u=document.getElementById("navUser"), n=document.getElementById("navUserName");
  if(state.user){ li?.classList.add("hidden"); lo?.classList.remove("hidden"); u?.classList.remove("hidden"); if(n) n.textContent=state.user.name.split(" ")[0]; }
  else { li?.classList.remove("hidden"); lo?.classList.add("hidden"); u?.classList.add("hidden"); }
}

// ── PRODUCT RENDERING ─────────────────────────────
function renderProducts(products, targetId="productsGrid"){
  const grid=document.getElementById(targetId); if(!grid) return;
  const countEl=document.getElementById("shopCount");
  if(countEl) countEl.textContent=`${products.length} items`;
  if(!products.length){
    grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px 24px;color:var(--ink-muted);font-family:var(--ff-serif);font-style:italic;font-size:1.1rem">No items found.</div>`;
    return;
  }
  grid.innerHTML=products.map((p,i)=>{
    const disc=p.originalPrice?Math.round((1-p.price/p.originalPrice)*100):0;
    const defaultSize=p.sizes[1]||p.sizes[0];
    return `
    <div class="p-card men-card" onclick="goProduct('${p.slug}')" style="transition-delay:${(i%4)*55}ms">
      <div class="p-card-img">
        <img src="${assetUrl(p.image)}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&q=80'">
        ${p.badge?`<span class="p-card-badge badge-${p.badge.toLowerCase().replace(/\s+/g,"-")}">${p.badge}</span>`:""}
        <button class="p-card-wish ${isWished(p.id)?"loved":""}" data-wid="${p.id}" onclick="event.stopPropagation();wishToggle('${p.id}')">${isWished(p.id)?"♥":"♡"}</button>
        <div class="p-card-actions">
          <button class="p-card-add" onclick="event.stopPropagation();cartAddById('${p.id}',1,'${defaultSize}')">+ Cart</button>
          <button class="p-card-buy" onclick="event.stopPropagation();quickBuy('${p.id}')">Buy Now</button>
        </div>
      </div>
      <div class="p-card-body">
        <div class="p-card-gender"><span class="${p.gender==='women'?'tag-women':'tag-men'}">${p.gender==='women'?'Women’s':'Men’s'} Collection</span></div>
        <div class="p-card-cat">${p.category}</div>
        <div class="p-card-name">${p.name}</div>
        <div class="p-card-price">
          <span class="price-now">৳${p.price.toLocaleString()}</span>
          ${p.originalPrice?`<span class="price-was">৳${p.originalPrice.toLocaleString()}</span>`:""}
          ${disc>=8?`<span class="price-save">${disc}% off</span>`:""}
        </div>
      </div>
    </div>`;
  }).join("");
  observeCards();
}

function quickBuy(id){
  const p=PRODUCTS_CACHE.find(x=>x.id===id); if(!p) return;
  cartAdd(p,1,p.sizes[1]||p.sizes[0]);
  const base=window.location.pathname.includes("/pages/")?"":"pages/";
  window.location.href=`${base}checkout.html`;
}
function goProduct(slug){
  const base=window.location.pathname.includes("/pages/")?"":"pages/";
  window.location.href=`${base}product.html?slug=${encodeURIComponent(slug)}`;
}

function getFiltered(){
  let list=[...PRODUCTS_CACHE];
  if(state.filterGender!=="all") list=list.filter(p=>p.gender===state.filterGender);
  if(state.filterCat!=="all") list=list.filter(p=>p.categorySlug===state.filterCat || p.category.toLowerCase()===state.filterCat);
  if(state.filterSort==="price-asc")  list.sort((a,b)=>a.price-b.price);
  if(state.filterSort==="price-desc") list.sort((a,b)=>b.price-a.price);
  if(state.filterSort==="newest")     list.sort((a,b)=>(b.badge==="New"?1:0)-(a.badge==="New"?1:0));
  return list;
}

// ── SCROLL ANIMATIONS ─────────────────────────────
function observeCards(){
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){en.target.classList.add("visible");io.unobserve(en.target);} });
  },{threshold:0.05,rootMargin:"0px 0px -20px 0px"});
  document.querySelectorAll(".p-card,.why-card,.val-card,.insta-tile,.fade-up,.fade-left,.fade-right,.scale-in,.col-tile").forEach(el=>io.observe(el));
  // Fallback
  setTimeout(()=>{ document.querySelectorAll(".p-card,.why-card,.val-card,.insta-tile,.fade-up,.fade-left,.fade-right,.scale-in,.col-tile").forEach(el=>el.classList.add("visible")); },900);
}

// ── FLOATING NAV SCROLL ───────────────────────────
function initNav(){
  const outer=document.querySelector(".nav-outer"); if(!outer) return;
  window.addEventListener("scroll",()=>outer.classList.toggle("scrolled",window.scrollY>30),{passive:true});
}

// ── MAIN INIT ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", async ()=>{
  document.querySelectorAll('a[href*="gender=women"], .women-tile, .editorial-women, [data-gender="women"]').forEach(el=>el.remove());

  await loadProductsCache();       // must resolve before loadState() can validate cart/wishlist against real products
  loadState(); checkInactivity(); touchActivity();
  refreshCartUI(); refreshWishUI(); refreshAuthUI(); initNav();

  // Cart
  document.getElementById("cartBtn")?.addEventListener("click",openCart);
  document.getElementById("cartBtnMob")?.addEventListener("click",openCart);
  document.getElementById("cartMask")?.addEventListener("click",closeCart);
  document.getElementById("cartCloseBtn")?.addEventListener("click",closeCart);
  document.getElementById("cartCheckoutBtn")?.addEventListener("click",()=>{
    if(!state.cart.length){toast("Your cart is empty!","err");return;}
    closeCart();
    window.location.href=(window.location.pathname.includes("/pages/")?"":"pages/")+"checkout.html";
  });
  document.getElementById("cartContinueBtn")?.addEventListener("click",closeCart);

  // Mobile nav
  document.getElementById("hamburgerBtn")?.addEventListener("click",openMobNav);
  document.getElementById("mobNavClose")?.addEventListener("click",closeMobNav);
  document.getElementById("mobNavBg")?.addEventListener("click",closeMobNav);

  // Auth
  document.getElementById("navLogin")?.addEventListener("click",()=>openAuth("login"));
  document.getElementById("authModal")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeAuth();});
  document.getElementById("authClose")?.addEventListener("click",closeAuth);
  document.querySelectorAll(".m-tab").forEach(t=>t.addEventListener("click",()=>switchAuthTab(t.dataset.tab)));
  document.getElementById("af-login")?.addEventListener("submit",doLogin);
  document.getElementById("af-register")?.addEventListener("submit",doRegister);
  document.getElementById("af-forgot")?.addEventListener("submit",doForgot);
  document.getElementById("navLogout")?.addEventListener("click",doLogout);
  document.querySelectorAll("[data-open-login]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();openAuth("login");}));
  document.querySelectorAll("[data-open-register]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();openAuth("register");}));

  // Category filters
  document.querySelectorAll("[data-cat]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      state.filterCat=btn.dataset.cat;
      document.querySelectorAll("[data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===state.filterCat));
      if(document.getElementById("productsGrid")) renderProducts(getFiltered());
    });
  });

  // Gender tabs
  document.querySelectorAll("[data-gender]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      state.filterGender=btn.dataset.gender;
      document.querySelectorAll("[data-gender]").forEach(b=>{
        b.classList.remove("on-women","on-men","on-all");
        if(b.dataset.gender===state.filterGender){
          if(state.filterGender==="women") b.classList.add("on-women");
          else if(state.filterGender==="men") b.classList.add("on-men");
          else b.classList.add("on-all");
        }
      });
      if(document.getElementById("productsGrid")) renderProducts(getFiltered());
    });
  });

  // Sort
  document.getElementById("sortSel")?.addEventListener("change",e=>{state.filterSort=e.target.value;renderProducts(getFiltered());});

  // Render shop grid
  if(document.getElementById("productsGrid")){
    const params=new URLSearchParams(window.location.search);
    const cat=params.get("cat"); const gen=params.get("gender");
    if(cat){state.filterCat=cat;document.querySelectorAll("[data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===cat));}
    if(gen){state.filterGender=gen;}
    renderProducts(getFiltered());
  }

  // Newsletter
  document.getElementById("nlForm")?.addEventListener("submit",e=>{e.preventDefault();toast("Subscribed! Thank you 💌","ok");e.target.reset();});

  observeCards();
});

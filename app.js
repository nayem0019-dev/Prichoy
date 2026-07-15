/* ================================================
   PRICHOY — Core App Logic v4
   Men & Women Collections
   ================================================ */

// ── PRODUCTS ─────────────────────────────────────
const PRODUCTS = [
  // ── WOMEN ──
  { id:1,  gender:"women", name:"Floral Wrap Dress",       category:"dresses",  price:1850, originalPrice:2400, image:"https://images.unsplash.com/photo-1623609163859-ca93c959b98a?w=700&q=80", badge:"Sale",    rating:4.8, reviews:124, colors:["#D4918A","#8A9ED4","#D4C48A"], sizes:["XS","S","M","L","XL"],      description:"A beautifully crafted wrap dress adorned with delicate floral prints. Perfect for any occasion — from casual brunches to evening outings.", fabric:"100% Rayon",    care:"Hand wash cold", discount:null },
  { id:2,  gender:"women", name:"Silk Blend Kurti",         category:"kurtis",   price:1200, originalPrice:null, image:"https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&q=80", badge:"New",    rating:4.9, reviews:87,  colors:["#D4918A","#8AD48A","#FFF"],    sizes:["XS","S","M","L","XL","XXL"],description:"An elegant silk blend kurti with intricate embroidery details. Combines traditional craftsmanship with modern silhouettes.", fabric:"Silk Blend",    care:"Dry clean only", discount:null },
  { id:3,  gender:"women", name:"Embroidered Salwar Set",   category:"salwar",   price:2800, originalPrice:3500, image:"https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=700&q=80", badge:"Sale",    rating:4.7, reviews:203, colors:["#F0E0D0","#D4918A","#4A4A6A"], sizes:["S","M","L","XL"],           description:"A stunning embroidered salwar kameez set featuring hand-stitched floral motifs. Includes dupatta.", fabric:"Cotton Silk",   care:"Hand wash mild", discount:null },
  { id:4,  gender:"women", name:"Casual Linen Top",         category:"tops",     price:850,  originalPrice:null, image:"https://images.unsplash.com/photo-1485218126466-34e6392ec754?w=700&q=80", badge:"New",    rating:4.6, reviews:56,  colors:["#FFF","#F5E6D0","#D4918A"],    sizes:["XS","S","M","L","XL"],      description:"A breezy linen top perfect for warm days. Features subtle pintuck details and a relaxed fit.", fabric:"100% Linen",    care:"Machine wash gentle", discount:null },
  { id:5,  gender:"women", name:"Festive Sharara Set",      category:"sharara",  price:3200, originalPrice:4000, image:"https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=700&q=80", badge:"Sale",    rating:4.9, reviews:178, colors:["#D4918A","#C9A96E","#8A6AD4"], sizes:["S","M","L","XL"],           description:"An exquisite sharara set crafted for festive celebrations with intricate zari work.", fabric:"Georgette",     care:"Dry clean only", discount:null },
  { id:6,  gender:"women", name:"Cotton Palazzo Set",       category:"palazzo",  price:1450, originalPrice:null, image:"https://images.unsplash.com/photo-1594938298603-c8148c4b4ac8?w=700&q=80", badge:null,     rating:4.5, reviews:92,  colors:["#FFF","#F0E0D0","#8AD4C8"],    sizes:["XS","S","M","L","XL","XXL"],description:"Comfortable yet chic cotton palazzo pants paired with a coordinated top. Perfect for everyday wear.", fabric:"Cotton",        care:"Machine wash cold", discount:null },
  { id:7,  gender:"women", name:"Designer Anarkali Suit",   category:"salwar",   price:4200, originalPrice:5500, image:"https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=700&q=80", badge:"Sale",    rating:4.8, reviews:145, colors:["#D4918A","#C9A96E","#6A8AD4"], sizes:["S","M","L","XL","XXL"],     description:"A regal Anarkali suit with floor-length flare and rich embellishments. Perfect for weddings.", fabric:"Net & Satin",   care:"Dry clean only", discount:null },
  { id:8,  gender:"women", name:"Printed Maxi Dress",       category:"dresses",  price:1650, originalPrice:2100, image:"https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=700&q=80", badge:"Sale",    rating:4.6, reviews:67,  colors:["#D4C48A","#8AD4C8","#D4918A"], sizes:["XS","S","M","L","XL"],      description:"A flowing maxi dress with vibrant prints. Features a tiered hem and adjustable waist tie.", fabric:"Viscose Crepe", care:"Hand wash cold", discount:null },
  { id:9,  gender:"women", name:"Embroidered Kurti Set",    category:"kurtis",   price:1600, originalPrice:null, image:"https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=700&q=80", badge:"New",    rating:4.7, reviews:113, colors:["#FFF","#F0E0D0","#D4918A"],    sizes:["XS","S","M","L","XL","XXL"],description:"A beautifully embroidered kurti set with subtle thread work. Comes with matching pants.", fabric:"Cotton Blend",  care:"Machine wash gentle", discount:null },
  { id:10, gender:"women", name:"Wedding Lehenga Choli",    category:"lehenga",  price:8500, originalPrice:12000,image:"https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=700&q=80", badge:"Sale",    rating:5.0, reviews:289, colors:["#D4918A","#C9A96E","#D4C48A"], sizes:["S","M","L","XL"],           description:"A breathtaking bridal lehenga with extensive hand embroidery and zari work. Make your day unforgettable.", fabric:"Silk & Zari",   care:"Dry clean only", discount:null },
  { id:11, gender:"women", name:"Casual Printed Kurti",     category:"kurtis",   price:750,  originalPrice:null, image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&q=80", badge:null,     rating:4.4, reviews:44,  colors:["#FFF","#F5E6D0","#8AD4C8"],    sizes:["XS","S","M","L","XL","XXL"],description:"A fun casual kurti with bold block prints. Soft cotton for everyday comfort.", fabric:"100% Cotton",   care:"Machine wash warm", discount:null },
  { id:12, gender:"women", name:"Party Wear Gown",          category:"gowns",    price:5500, originalPrice:7000, image:"https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=700&q=80", badge:"Sale",    rating:4.9, reviews:198, colors:["#D4918A","#6A4A6A","#C9A96E"], sizes:["XS","S","M","L","XL"],      description:"An elegant party gown with beadwork and a sweeping A-line silhouette. Turn heads at every event.", fabric:"Net & Sequin",  care:"Dry clean only", discount:null },

  // ── MEN ──
  { id:13, gender:"men",   name:"Classic Polo Shirt",       category:"shirts",   price:950,  originalPrice:null, image:"https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=700&q=80", badge:"New",    rating:4.7, reviews:88,  colors:["#FFF","#2a2a2a","#1b4332"],    sizes:["S","M","L","XL","XXL"],     description:"A premium cotton polo shirt with a clean classic cut. Versatile for both casual and semi-formal occasions.", fabric:"100% Pique Cotton", care:"Machine wash cold", discount:null },
  { id:14, gender:"men",   name:"Slim Fit Chino Pants",     category:"bottoms",  price:1800, originalPrice:2200, image:"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=700&q=80", badge:"Sale",    rating:4.8, reviews:112, colors:["#C8A882","#2a2a2a","#1b4332"], sizes:["28","30","32","34","36"],     description:"Modern slim fit chinos with a tailored silhouette. Comfortable stretch fabric for all-day wear.", fabric:"Cotton Stretch", care:"Machine wash cold", discount:null },
  { id:15, gender:"men",   name:"Formal Oxford Shirt",      category:"shirts",   price:1400, originalPrice:null, image:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=700&q=80", badge:"New",    rating:4.6, reviews:65,  colors:["#FFF","#a8c4e0","#D4C48A"],    sizes:["S","M","L","XL","XXL"],     description:"A crisp oxford weave shirt for the modern professional. Features a button-down collar and chest pocket.", fabric:"Oxford Cotton",  care:"Iron medium heat", discount:null },
  { id:16, gender:"men",   name:"Premium Panjabi",          category:"ethnic",   price:2200, originalPrice:2800, image:"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=700&q=80", badge:"Sale",    rating:4.9, reviews:156, colors:["#FFF","#C8A882","#1b4332"],    sizes:["S","M","L","XL","XXL"],     description:"A beautifully crafted premium Panjabi with intricate embroidery. Ideal for Eid, weddings and festivals.", fabric:"Cotton Blend",  care:"Hand wash cold", discount:null },
  { id:17, gender:"men",   name:"Casual Linen Shirt",       category:"shirts",   price:1100, originalPrice:null, image:"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=700&q=80", badge:null,     rating:4.5, reviews:73,  colors:["#FFF","#C8A882","#a8c4e0"],    sizes:["S","M","L","XL","XXL"],     description:"Breathable linen shirt for warm days. Relaxed fit with a clean minimal look perfect for any casual setting.", fabric:"100% Linen",    care:"Machine wash gentle", discount:null },
  { id:18, gender:"men",   name:"Festive Sherwani",         category:"ethnic",   price:6500, originalPrice:8500, image:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&q=80", badge:"Sale",    rating:4.9, reviews:201, colors:["#C8A882","#1b4332","#2a2a2a"], sizes:["S","M","L","XL","XXL"],     description:"A grand festive sherwani with rich embroidery. Perfect for weddings and formal celebrations — make a royal entrance.", fabric:"Silk Blend",    care:"Dry clean only", discount:null },
  { id:19, gender:"men",   name:"Jogger Track Pants",       category:"bottoms",  price:850,  originalPrice:null, image:"https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=700&q=80", badge:null,     rating:4.4, reviews:54,  colors:["#2a2a2a","#1b4332","#FFF"],    sizes:["S","M","L","XL","XXL"],     description:"Comfortable cotton jogger pants for casual wear and active days. Features drawstring waist and tapered fit.", fabric:"French Terry",  care:"Machine wash cold", discount:null },
  { id:20, gender:"men",   name:"Denim Jacket",             category:"outerwear",price:3200, originalPrice:4000, image:"https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=700&q=80", badge:"Sale",    rating:4.7, reviews:89,  colors:["#4a6a8a","#2a2a2a"],           sizes:["S","M","L","XL"],           description:"A timeless denim jacket with a modern slim cut. Pairs with everything from jeans to chinos.", fabric:"100% Denim",    care:"Machine wash cold", discount:null },
  { id:21, gender:"men",   name:"Cotton Kurta Pajama",      category:"ethnic",   price:1600, originalPrice:1900, image:"https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=700&q=80", badge:"Sale",    rating:4.6, reviews:97,  colors:["#FFF","#C8A882","#a8c4e0"],    sizes:["S","M","L","XL","XXL"],     description:"A classic cotton kurta pajama set for everyday ethnic wear. Comfortable fabric with a clean embroidered neckline.", fabric:"100% Cotton",   care:"Machine wash cold", discount:null },
  { id:22, gender:"men",   name:"Formal Blazer",            category:"outerwear",price:4800, originalPrice:6000, image:"https://images.unsplash.com/photo-1594938374182-a57022e45ced?w=700&q=80", badge:"Sale",    rating:4.8, reviews:134, colors:["#2a2a2a","#1b4332","#4a6a8a"], sizes:["S","M","L","XL"],           description:"A sharp formal blazer cut from premium woven fabric. Elevate any formal or business casual look instantly.", fabric:"Polyester Wool Blend", care:"Dry clean only", discount:null },
  { id:23, gender:"men",   name:"Graphic Print T-Shirt",    category:"shirts",   price:650,  originalPrice:null, image:"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=700&q=80", badge:"New",    rating:4.3, reviews:38,  colors:["#FFF","#2a2a2a","#1b4332"],    sizes:["XS","S","M","L","XL","XXL"],description:"A comfortable and stylish graphic print t-shirt for casual everyday wear. Soft cotton that gets better with every wash.", fabric:"100% Cotton",   care:"Machine wash warm", discount:null },
  { id:24, gender:"men",   name:"Structured Sweatshirt",    category:"outerwear",price:1500, originalPrice:null, image:"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=700&q=80", badge:null,     rating:4.5, reviews:61,  colors:["#2a2a2a","#1b4332","#C8A882"], sizes:["S","M","L","XL","XXL"],     description:"A premium structured sweatshirt with a relaxed fit. Perfect for cooler days with a clean modern aesthetic.", fabric:"Cotton Fleece",  care:"Machine wash cold", discount:null },

  // ── DISCOUNT ──
  { id:25, gender:"women", name:"Eid Special Salwar Set",   category:"discount", price:2200, originalPrice:3000, image:"https://images.unsplash.com/photo-1609372332255-611485350f25?w=700&q=80", badge:"Discount", rating:4.8, reviews:96,  colors:["#D4918A","#8AD4C8","#F5E6D0"], sizes:["S","M","L","XL"],           description:"Celebrate every occasion in this beautifully crafted Eid special salwar set. Comes with matching dupatta.", fabric:"Cotton Silk",   care:"Hand wash cold", discount:{ code:"EID15",    pct:15, label:"EID15 — 15% off auto-applied!" } },
  { id:26, gender:"women", name:"Summer Floral Kurti",      category:"discount", price:900,  originalPrice:1400, image:"https://images.unsplash.com/photo-1594938298603-c8148c4b4ac8?w=700&q=80", badge:"Discount", rating:4.6, reviews:72,  colors:["#FFF","#D4C48A","#D4918A"],    sizes:["XS","S","M","L","XL","XXL"],description:"A vibrant summer kurti with cheerful floral prints. Lightweight and breathable.", fabric:"Cotton Voile",  care:"Machine wash gentle", discount:{ code:"SUMMER20", pct:20, label:"SUMMER20 — 20% off auto-applied!" } },
  { id:27, gender:"men",   name:"Summer Polo Sale",         category:"discount", price:750,  originalPrice:1100, image:"https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=700&q=80", badge:"Discount", rating:4.5, reviews:58,  colors:["#FFF","#1b4332","#2a2a2a"],    sizes:["S","M","L","XL","XXL"],     description:"A classic polo shirt at summer sale price. Same premium pique cotton, big savings!", fabric:"Pique Cotton",  care:"Machine wash cold", discount:{ code:"POLO20",   pct:20, label:"POLO20 — 20% off auto-applied!" } },
  { id:28, gender:"men",   name:"Clearance Panjabi",        category:"discount", price:1400, originalPrice:2500, image:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&q=80", badge:"Discount", rating:4.7, reviews:44,  colors:["#FFF","#C8A882"],              sizes:["S","M","L","XL","XXL"],     description:"Premium Panjabi at clearance price. Same quality craftsmanship — grab it before stocks run out!", fabric:"Cotton Blend",  care:"Hand wash cold", discount:{ code:"CLEAR30",  pct:30, label:"CLEAR30 — 30% off auto-applied!" } },
];

const COUPONS = {
  "PRICHOY10": { pct:10,  flat:null, desc:"10% off your order" },
  "WELCOME20": { pct:20,  flat:null, desc:"20% off for new customers" },
  "FLAT100":   { pct:null, flat:100, desc:"৳100 flat discount" },
  "FASHION15": { pct:15,  flat:null, desc:"15% off on fashion" },
  "EID15":     { pct:15,  flat:null, desc:"Eid special 15% off" },
  "SUMMER20":  { pct:20,  flat:null, desc:"Summer sale 20% off" },
  "POLO20":    { pct:20,  flat:null, desc:"Men's polo 20% off" },
  "CLEAR30":   { pct:30,  flat:null, desc:"Clearance 30% off" },
};

// ── STATE ─────────────────────────────────────────
const state = {
  cart:[], wishlist:[], user:null,
  filterCat:"all", filterSort:"default", filterGender:"all", coupon:null,
};

function saveState() {
  localStorage.setItem("prichoy_v4", JSON.stringify({ cart:state.cart, wishlist:state.wishlist, user:state.user }));
}
function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem("prichoy_v4") || "{}");
    state.cart     = d.cart     || [];
    state.wishlist = d.wishlist || [];
    state.user     = d.user     || null;
  } catch(e){}
}
function checkInactivity() {
  if (!state.user) return;
  if (Date.now() - (state.user.lastActive||0) > 90*24*60*60*1000) {
    localStorage.removeItem("prichoy_v4");
    state.user=null; state.cart=[]; state.wishlist=[];
    toast("Account inactive 90+ days — data cleared.","err");
  }
}
function touchActivity() { if(state.user){ state.user.lastActive=Date.now(); saveState(); } }

// ── CART ──────────────────────────────────────────
function cartAdd(pid, qty=1, size="M", color=null) {
  const p = PRODUCTS.find(x=>x.id===pid); if(!p) return;
  const ex = state.cart.find(i=>i.pid===pid&&i.size===size);
  if(ex){ ex.qty+=qty; }
  else { state.cart.push({pid,qty,size,color:color||p.colors[0],name:p.name,price:p.price,image:p.image,gender:p.gender,discount:p.discount||null}); }
  if(p.discount&&!state.coupon) state.coupon={code:p.discount.code,...COUPONS[p.discount.code]};
  saveState(); refreshCartUI(); toast(`${p.name} added to cart ✓`,"ok");
}
function cartRemove(pid,size){ state.cart=state.cart.filter(i=>!(i.pid===pid&&i.size===size)); saveState(); refreshCartUI(); }
function cartQty(pid,size,delta){ const i=state.cart.find(x=>x.pid===pid&&x.size===size); if(!i) return; i.qty=Math.max(1,i.qty+delta); saveState(); refreshCartUI(); }
function cartTotal(){ return state.cart.reduce((s,i)=>s+i.price*i.qty,0); }
function cartCount(){ return state.cart.reduce((s,i)=>s+i.qty,0); }
function wishToggle(pid){ const idx=state.wishlist.indexOf(pid); if(idx===-1){state.wishlist.push(pid);toast("Added to wishlist ♥","ok");}else{state.wishlist.splice(idx,1);toast("Removed from wishlist","");} saveState(); refreshWishUI(); }
function isWished(pid){ return state.wishlist.includes(pid); }
function applyCoupon(code){ const c=COUPONS[code.toUpperCase()]; if(!c) return false; state.coupon={code:code.toUpperCase(),...c}; return true; }
function couponDiscount(sub){ if(!state.coupon) return 0; if(state.coupon.flat) return state.coupon.flat; return Math.round(sub*state.coupon.pct/100); }
function deliveryCharge(city){ if(!city) return 0; return city.toLowerCase().includes("dhaka")?80:120; }
function genOrderId(){ return "PRC-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).substr(2,4).toUpperCase(); }
function saveOrder(data){
  const orders=JSON.parse(localStorage.getItem("prichoy_orders")||"[]");
  const order={...data,id:genOrderId(),at:new Date().toISOString()};
  orders.push(order); localStorage.setItem("prichoy_orders",JSON.stringify(orders));
  sessionStorage.setItem("prichoy_last_order",JSON.stringify(order));
  state.cart=[]; state.coupon=null; saveState(); refreshCartUI(); return order;
}

// ── TOAST ─────────────────────────────────────────
function toast(msg, type="") {
  const w=document.getElementById("toastWrap"); if(!w) return;
  const el=document.createElement("div"); el.className=`toast ${type}`;
  el.innerHTML=`<span>${msg}</span>`;
  w.appendChild(el);
  setTimeout(()=>{el.style.opacity="0";el.style.transform="translateY(8px)";setTimeout(()=>el.remove(),300);},3000);
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
      <img src="${item.image}" alt="${item.name}" class="c-item-img" onerror="this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200&q=60'">
      <div class="c-item-info">
        <div class="c-item-name">${item.name}</div>
        <div class="c-item-meta">Size: ${item.size} · ${item.gender==="men"?"👔 Men":"👗 Women"}</div>
        ${item.discount?`<div style="font-size:.62rem;color:var(--green);font-weight:700;margin-top:2px">🏷️ ${item.discount.label}</div>`:""}
        <div class="c-item-price">৳${(item.price*item.qty).toLocaleString()}</div>
        <div class="c-item-qty">
          <button class="qty-b" onclick="cartQty(${item.pid},'${item.size}',-1)">−</button>
          <span class="qty-v">${item.qty}</span>
          <button class="qty-b" onclick="cartQty(${item.pid},'${item.size}',1)">+</button>
        </div>
      </div>
      <button class="c-item-rm" onclick="cartRemove(${item.pid},'${item.size}')">✕</button>
    </div>`).join("");
  updateCartFooter();
}
function updateCartFooter(){
  const sub=cartTotal(), disc=couponDiscount(sub);
  const s=document.getElementById("cSub"), d=document.getElementById("cDisc"), dr=document.getElementById("cDiscRow"), t=document.getElementById("cTot");
  if(s) s.textContent=`৳${sub.toLocaleString()}`;
  if(t) t.textContent=`৳${(sub-disc).toLocaleString()}`;
  if(dr){ dr.style.display=disc>0?"flex":"none"; if(d) d.textContent=`−৳${disc.toLocaleString()}`; }
}

function openCart(){ document.getElementById("cartDrawer")?.classList.add("open"); document.getElementById("cartMask")?.classList.add("open"); document.body.style.overflow="hidden"; }
function closeCart(){ document.getElementById("cartDrawer")?.classList.remove("open"); document.getElementById("cartMask")?.classList.remove("open"); document.body.style.overflow=""; }
function openMobNav(){ document.getElementById("mobNav")?.classList.add("open"); document.body.style.overflow="hidden"; }
function closeMobNav(){ document.getElementById("mobNav")?.classList.remove("open"); document.body.style.overflow=""; }
function openAuth(tab="login"){ document.getElementById("authModal")?.classList.add("open"); switchAuthTab(tab); document.body.style.overflow="hidden"; }
function closeAuth(){ document.getElementById("authModal")?.classList.remove("open"); document.body.style.overflow=""; }
function switchAuthTab(tab){ document.querySelectorAll(".m-tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===tab)); document.querySelectorAll(".a-form").forEach(f=>f.classList.toggle("hidden",f.id!==`af-${tab}`)); }

// ── AUTH ──────────────────────────────────────────
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
    const id=parseInt(btn.dataset.wid);
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
    const isM=p.gender==="men";
    return `
    <div class="p-card ${isM?"men-card":"women-card"}" onclick="goProduct(${p.id})" style="transition-delay:${(i%4)*55}ms">
      <div class="p-card-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=60'">
        ${p.badge?`<span class="p-card-badge badge-${p.badge.toLowerCase().replace(" ","-")}">${p.badge}</span>`:""}
        ${p.discount?`<span class="p-card-badge badge-discount" style="top:${p.badge?"42px":"12px"}">🏷️ ${p.discount.pct}% Off</span>`:""}
        <button class="p-card-wish ${isWished(p.id)?"loved":""}" data-wid="${p.id}" onclick="event.stopPropagation();wishToggle(${p.id})">${isWished(p.id)?"♥":"♡"}</button>
        <div class="p-card-actions">
          <button class="p-card-add" onclick="event.stopPropagation();cartAdd(${p.id},1,'${p.sizes[1]||p.sizes[0]}')">+ Cart</button>
          <button class="p-card-buy" onclick="event.stopPropagation();quickBuy(${p.id})">Buy Now</button>
        </div>
      </div>
      <div class="p-card-body">
        <div class="p-card-gender"><span class="${isM?"tag-men":"tag-women"}">${isM?"👔 Men":"👗 Women"}</span></div>
        <div class="p-card-cat">${p.category}</div>
        <div class="p-card-name">${p.name}</div>
        <div class="p-card-price">
          <span class="price-now">৳${p.price.toLocaleString()}</span>
          ${p.originalPrice?`<span class="price-was">৳${p.originalPrice.toLocaleString()}</span>`:""}
          ${disc>=8?`<span class="price-save">${disc}% off</span>`:""}
        </div>
        ${p.discount?`<div class="disc-coupon-tag">🏷️ ${p.discount.label}</div>`:""}
        <div class="p-card-rating"><span class="stars">${"★".repeat(Math.floor(p.rating))}${p.rating%1?"☆":""}</span><span class="rating-count">(${p.reviews})</span></div>
      </div>
    </div>`;
  }).join("");
  observeCards();
}

function quickBuy(pid){
  const p=PRODUCTS.find(x=>x.id===pid); if(!p) return;
  cartAdd(pid,1,p.sizes[1]||p.sizes[0]);
  const base=window.location.pathname.includes("/pages/")?"":"pages/";
  window.location.href=`${base}checkout.html`;
}
function goProduct(pid){
  const base=window.location.pathname.includes("/pages/")?"":"pages/";
  window.location.href=`${base}product.html?id=${pid}`;
}

function getFiltered(){
  let list=[...PRODUCTS];
  if(state.filterGender!=="all") list=list.filter(p=>p.gender===state.filterGender);
  if(state.filterCat!=="all") list=list.filter(p=>p.category===state.filterCat);
  if(state.filterSort==="price-asc")  list.sort((a,b)=>a.price-b.price);
  if(state.filterSort==="price-desc") list.sort((a,b)=>b.price-a.price);
  if(state.filterSort==="newest")     list.sort((a,b)=>(b.badge==="New"?1:0)-(a.badge==="New"?1:0));
  if(state.filterSort==="rating")     list.sort((a,b)=>b.rating-a.rating);
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
document.addEventListener("DOMContentLoaded",()=>{
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

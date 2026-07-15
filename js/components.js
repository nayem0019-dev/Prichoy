/* ================================================
   PRICHOY — Shared Components v4
   ================================================ */

function getBase(sub){ return sub?"../":""; }

function renderNav(active, sub){
  const b=getBase(sub);
  const links=[
    {href:`${b}index.html`,key:"home",label:"Home"},
    {href:`${b}pages/shop.html`,key:"shop",label:"Shop"},
    {href:`${b}pages/about.html`,key:"about",label:"About"},
    {href:`${b}pages/contact.html`,key:"contact",label:"Contact"},
  ];
  return `
  <div class="announce-bar" id="announceBar">
    <div class="announce-inner">
      <span>Free delivery over ৳3000</span><span>48hr Dhaka delivery</span>
      <span>Cash on delivery</span><span>Men & Women collections</span>
      <span>New arrivals weekly</span><span>Auto discount deals</span>
      <span>Free delivery over ৳3000</span><span>48hr Dhaka delivery</span>
      <span>Cash on delivery</span><span>Men & Women collections</span>
      <span>New arrivals weekly</span><span>Auto discount deals</span>
    </div>
  </div>
  <div class="nav-outer" id="navOuter">
    <div class="nav-glass">
      <div class="nav-left">
        ${links.slice(0,2).map(l=>`<a href="${l.href}" class="${active===l.key?"active":""}">${l.label}</a>`).join("")}
        <a href="${b}pages/shop.html?gender=women" class="nav-pill nav-pill-women">👗 Women</a>
        <a href="${b}pages/shop.html?gender=men"   class="nav-pill nav-pill-men">👔 Men</a>
      </div>
      <div class="nav-logo">
        <a href="${b}index.html">
          Prichoy
          <span class="nav-logo-sub">Clothing</span>
        </a>
      </div>
      <div class="nav-right">
        <a href="${b}pages/shop.html?cat=discount" class="nav-pill nav-pill-green">Sale 🔥</a>
        ${links.slice(2).map(l=>`<a href="${l.href}" class="btn-nav-outline ${active===l.key?"active":""}">${l.label}</a>`).join("")}
        <button class="nav-icon-btn" id="cartBtn" aria-label="Cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          <span class="cart-count" id="cCount1"></span>
        </button>
        <div class="hidden" id="navUser" style="display:none;align-items:center;gap:6px">
          <span style="font-size:.65rem;font-weight:700;color:var(--ink)" id="navUserName"></span>
        </div>
        <button class="btn-nav-outline hidden" id="navLogout" style="font-size:.6rem">Sign Out</button>
        <button class="btn-nav-outline" id="navLogin">Sign In</button>
        <button class="hamburger" id="hamburgerBtn" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </div>
  <div class="mob-nav" id="mobNav">
    <div class="mob-nav-bg" id="mobNavBg"></div>
    <div class="mob-nav-panel">
      <div class="mob-nav-head">
        <span class="mob-logo">Prichoy</span>
        <button class="mob-close" id="mobNavClose">✕</button>
      </div>
      <ul class="mob-nav-links">
        ${links.map(l=>`<li><a href="${l.href}">${l.label}</a></li>`).join("")}
        <li><a href="${b}pages/shop.html?gender=women">👗 Women <span class="mob-badge mob-badge-women">New</span></a></li>
        <li><a href="${b}pages/shop.html?gender=men">👔 Men <span class="mob-badge mob-badge-men">New</span></a></li>
        <li><a href="${b}pages/shop.html?cat=discount">🔥 Sale <span class="mob-badge mob-badge-sale">Deals</span></a></li>
        <li><a href="#" data-open-login>👤 Sign In / Register</a></li>
        <li><a href="#" id="cartBtnMob">🛍️ Cart</a></li>
      </ul>
    </div>
  </div>`;
}

function renderCart(){
  return `
  <div class="cart-mask" id="cartMask"></div>
  <div class="cart-drawer" id="cartDrawer">
    <div class="cart-head">
      <span class="cart-head-title">Your Cart 🛍️</span>
      <button class="cart-close-btn" id="cartCloseBtn">✕</button>
    </div>
    <div class="cart-body" id="cartBody"></div>
    <div class="cart-foot">
      <div class="cart-sub-row"><span>Subtotal</span><span id="cSub">৳0</span></div>
      <div class="cart-sub-row" id="cDiscRow" style="display:none;color:var(--green)"><span>Discount</span><span id="cDisc"></span></div>
      <div class="cart-tot-row"><span>Total</span><span class="amt" id="cTot">৳0</span></div>
      <div class="cart-btns">
        <button class="btn btn-black btn-w" id="cartCheckoutBtn">Checkout →</button>
        <button class="btn btn-ghost btn-w" id="cartContinueBtn">Continue Shopping</button>
      </div>
    </div>
  </div>`;
}

function renderAuthModal(){
  return `
  <div class="modal-mask" id="authModal">
    <div class="modal-box">
      <button class="m-close" id="authClose">✕</button>
      <div class="modal-logo">Prichoy</div>
      <div class="modal-tabs">
        <button class="m-tab active" data-tab="login">Sign In</button>
        <button class="m-tab" data-tab="register">Register</button>
        <button class="m-tab" data-tab="forgot">Forgot</button>
      </div>
      <form id="af-login" class="a-form">
        <div class="form-group"><label class="f-label">Email<span class="f-req">*</span></label><input id="l-email" type="email" class="f-ctrl" placeholder="your@email.com" required></div>
        <div class="form-group"><label class="f-label">Password<span class="f-req">*</span></label><input id="l-pass" type="password" class="f-ctrl" placeholder="••••••••" required></div>
        <button type="submit" class="btn btn-black btn-w">Sign In</button>
        <p style="text-align:center;margin-top:12px;font-size:.75rem;color:var(--ink-muted)">New here? <a href="#" data-open-register style="color:var(--green);font-weight:600">Create account</a></p>
      </form>
      <form id="af-register" class="a-form hidden">
        <div class="form-group"><label class="f-label">Full Name<span class="f-req">*</span></label><input id="r-name" type="text" class="f-ctrl" placeholder="Your full name" required></div>
        <div class="f-2">
          <div class="form-group"><label class="f-label">Email<span class="f-req">*</span></label><input id="r-email" type="email" class="f-ctrl" placeholder="your@email.com" required></div>
          <div class="form-group"><label class="f-label">Phone<span class="f-req">*</span></label><input id="r-phone" type="tel" class="f-ctrl" placeholder="01XXXXXXXXX" required></div>
        </div>
        <div class="form-group"><label class="f-label">Password<span class="f-req">*</span></label><input id="r-pass" type="password" class="f-ctrl" placeholder="Min 6 characters" required></div>
        <div class="form-group"><label class="f-label">Confirm Password<span class="f-req">*</span></label><input id="r-confirm" type="password" class="f-ctrl" placeholder="Repeat password" required></div>
        <button type="submit" class="btn btn-black btn-w">Create Account</button>
        <p style="text-align:center;margin-top:10px;font-size:.68rem;color:var(--ink-muted)">Accounts inactive 90+ days are auto-deleted.</p>
      </form>
      <form id="af-forgot" class="a-form hidden">
        <p style="color:var(--ink-muted);font-size:.82rem;line-height:1.8;margin-bottom:18px">Enter your email and we'll send a password reset link.</p>
        <div class="form-group"><label class="f-label">Email<span class="f-req">*</span></label><input id="f-email" type="email" class="f-ctrl" placeholder="your@email.com" required></div>
        <button type="submit" class="btn btn-black btn-w">Send Reset Link</button>
      </form>
    </div>
  </div>`;
}

function renderFooter(sub){
  const b=getBase(sub);
  return `
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div>
          <span class="f-brand-logo">Prichoy</span>
          <small class="f-brand-since">Clothing · Est. 2026</small>
          <p class="f-brand-desc">Your premium destination for men's & women's fashion in Bangladesh. We celebrate every style — from everyday elegance to festive glamour.</p>
          <div class="f-socials">
            <a href="https://www.facebook.com/PRICHOY/" target="_blank" class="f-soc-btn" title="Facebook">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
            </a>
            <a href="https://www.instagram.com/prichoy.info/" target="_blank" class="f-soc-btn" title="Instagram">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/></svg>
            </a>
            <a href="https://wa.me/8801762647661" target="_blank" class="f-soc-btn" title="WhatsApp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <div class="f-col-title">Shop</div>
          <div class="f-links">
            <a href="${b}pages/shop.html?gender=women">👗 Women's Collection</a>
            <a href="${b}pages/shop.html?gender=men">👔 Men's Collection</a>
            <a href="${b}pages/shop.html?cat=discount">🔥 Sale & Discounts</a>
            <a href="${b}pages/shop.html">All Products</a>
          </div>
        </div>
        <div>
          <div class="f-col-title">Company</div>
          <div class="f-links">
            <a href="${b}index.html">Home</a>
            <a href="${b}pages/about.html">About Us</a>
            <a href="${b}pages/contact.html">Contact</a>
          </div>
        </div>
        <div>
          <div class="f-col-title">Contact</div>
          <div class="f-contact-row"><span class="f-contact-ic">📞</span><div class="f-contact-text"><a href="tel:01762647661">01762647661</a></div></div>
          <div class="f-contact-row"><span class="f-contact-ic">✉️</span><div class="f-contact-text"><a href="mailto:nayem@mail.com">nayem@mail.com</a></div></div>
          <div class="f-contact-row"><span class="f-contact-ic">📘</span><div class="f-contact-text"><a href="https://www.facebook.com/PRICHOY/" target="_blank">facebook.com/PRICHOY</a></div></div>
          <div class="f-contact-row"><span class="f-contact-ic">📷</span><div class="f-contact-text"><a href="https://www.instagram.com/prichoy.info/" target="_blank">@prichoy.info</a></div></div>
          <div class="f-contact-row"><span class="f-contact-ic">🕐</span><div class="f-contact-text">Always Open · 24/7</div></div>
        </div>
      </div>
      <div class="footer-bot">
        <span>© 2026 Prichoy Clothing. All rights reserved.</span>
        <span>Crafted with ♥ for Bangladesh</span>
      </div>
    </div>
  </footer>
  <div class="toast-wrap" id="toastWrap"></div>`;
}

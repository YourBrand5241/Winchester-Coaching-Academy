// ---- Demo data ----
// Winchester Coaching Academy's real sessions/packages — this is the
// only part of the app that changes from business to business; everything
// else (basket, booking, checkout) stays exactly the same.
const PRODUCTS = [
  { id: 1, name: "1-to-1 Coaching Session", desc: "Personalised one-on-one football coaching session.", price: 30.00, emoji: "⚽" },
  { id: 2, name: "Group Session", desc: "Small-group coaching session for developing skills together.", price: 15.00, emoji: "👥" },
  { id: 3, name: "Bronze Birthday Party Package", desc: "A fun football-themed party session for the birthday group.", price: 75.00, emoji: "🥉" },
  { id: 4, name: "Silver Birthday Party Package", desc: "Extended party package with more games and activities.", price: 120.00, emoji: "🥈" },
  { id: 5, name: "Gold Birthday Party Package", desc: "Our full birthday experience — games, prizes and a party host.", price: 180.00, emoji: "🥇" },
];

let basket = []; // { id, name, price, qty }

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = "";
  PRODUCTS.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-photo">${product.emoji}</div>
      <div class="product-name">${product.name}</div>
      <div class="product-desc">${product.desc}</div>
      <div class="product-footer">
        <span class="product-price">${formatPrice(product.price)}</span>
        <button class="add-btn" data-id="${product.id}">Add</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", () => addToBasket(Number(btn.dataset.id)));
  });
}

function addToBasket(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  const existing = basket.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    basket.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  renderBasket();
}

function removeFromBasket(productId) {
  basket = basket.filter(item => item.id !== productId);
  renderBasket();
}

function renderBasket() {
  const container = document.getElementById("basket-items");
  const totalEl = document.getElementById("basket-total");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (basket.length === 0) {
    container.innerHTML = `<p class="empty-basket">Nothing added yet</p>`;
    totalEl.textContent = formatPrice(0);
    checkoutBtn.disabled = true;
    return;
  }

  container.innerHTML = "";
  let total = 0;
  basket.forEach(item => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    const row = document.createElement("div");
    row.className = "basket-row";
    row.innerHTML = `
      <span>${item.qty} × ${item.name}</span>
      <span>${formatPrice(lineTotal)} <button data-id="${item.id}">remove</button></span>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => removeFromBasket(Number(btn.dataset.id)));
  });

  totalEl.textContent = formatPrice(total);
  checkoutBtn.disabled = false;
}

function populateTimeSlots() {
  const select = document.getElementById("time-slot");
  select.innerHTML = "";
  const slots = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM"];
  slots.forEach(slot => {
    const opt = document.createElement("option");
    opt.value = slot;
    opt.textContent = slot;
    select.appendChild(opt);
  });
}

function setupCheckout() {
  const btn = document.getElementById("checkout-btn");
  const overlay = document.getElementById("confirmation-overlay");
  const closeBtn = document.getElementById("close-overlay");

  btn.addEventListener("click", () => overlay.classList.remove("hidden"));
  closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));
}

renderProducts();
renderBasket();
populateTimeSlots();
setupCheckout();

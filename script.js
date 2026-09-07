// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "winchester-coaching";
const SLOT_MINUTES = 30; // length of each bookable slot shown in the picker

// Winchester Coaching Academy has two different diaries depending on
// what's being booked:
//   - coaching: 1-to-1 and group sessions, Monday-Friday 3pm-9pm
//   - party: birthday party packages, Saturday & Sunday 12pm-6pm
// Day numbers: 0 = Sunday, 1 = Monday, ... 6 = Saturday
const SCHEDULES = {
  coaching: { days: [1, 2, 3, 4, 5], startHour: 15, endHour: 21 },
  party: { days: [0, 6], startHour: 12, endHour: 18 },
};

// ---- Demo data ----
// Winchester Coaching Academy's real sessions/packages — this is the
// only part of the app that changes from business to business; everything
// else (basket, diary, booking) stays exactly the same.
const PRODUCTS = [
  { id: 1, name: "1-to-1 Coaching Session", desc: "Personalised one-on-one football coaching session.", price: 30.00, emoji: "⚽", category: "coaching" },
  { id: 2, name: "Group Session", desc: "Small-group coaching session for developing skills together.", price: 15.00, emoji: "👥", category: "coaching" },
  { id: 3, name: "Bronze Birthday Party Package", desc: "A fun football-themed party session for the birthday group.", price: 75.00, emoji: "🥉", category: "party" },
  { id: 4, name: "Silver Birthday Party Package", desc: "Extended party package with more games and activities.", price: 120.00, emoji: "🥈", category: "party" },
  { id: 5, name: "Gold Birthday Party Package", desc: "Our full birthday experience — games, prizes and a party host.", price: 180.00, emoji: "🥇", category: "party" },
];

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let basket = []; // { id, name, price, qty, category }

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

  // Coaching sessions and birthday parties run on different diaries, so
  // keep one category per booking to avoid an ambiguous date/time picker.
  if (basket.length > 0 && basket[0].category !== product.category) {
    alert("Please book coaching sessions and birthday parties separately — they run on different diaries.");
    return;
  }

  const existing = basket.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    basket.push({ id: product.id, name: product.name, price: product.price, qty: 1, category: product.category });
  }
  renderBasket();
  refreshSlotsForCurrentDate();
}

function removeFromBasket(productId) {
  basket = basket.filter(item => item.id !== productId);
  renderBasket();
  refreshSlotsForCurrentDate();
}

function renderBasket() {
  const container = document.getElementById("basket-items");
  const totalEl = document.getElementById("basket-total");

  if (basket.length === 0) {
    container.innerHTML = `<p class="empty-basket">Nothing added yet</p>`;
    totalEl.textContent = formatPrice(0);
    updateCheckoutAvailability();
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
  updateCheckoutAvailability();
}

function getScheduleForBasket() {
  if (basket.length === 0) return null;
  return SCHEDULES[basket[0].category];
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTimeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

function buildAllSlotsForDay(schedule) {
  const slots = [];
  for (let mins = schedule.startHour * 60; mins < schedule.endHour * 60; mins += SLOT_MINUTES) {
    slots.push(`${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`);
  }
  return slots;
}

async function refreshSlotsForCurrentDate() {
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("time-slot");
  const message = document.getElementById("slot-message");
  const schedule = getScheduleForBasket();

  if (!schedule) {
    timeSelect.innerHTML = "";
    message.textContent = "Add something to your booking first.";
    updateCheckoutAvailability();
    return;
  }

  if (!dateInput.value) {
    timeSelect.innerHTML = "";
    message.textContent = "";
    updateCheckoutAvailability();
    return;
  }

  const selectedDate = new Date(dateInput.value + "T00:00:00");
  const dayOfWeek = selectedDate.getDay();

  if (!schedule.days.includes(dayOfWeek)) {
    timeSelect.innerHTML = "";
    message.textContent = basket[0].category === "coaching"
      ? "Coaching sessions run Monday–Friday only — please pick a weekday."
      : "Birthday parties run Saturday & Sunday only — please pick a weekend date.";
    updateCheckoutAvailability();
    return;
  }

  message.textContent = "Checking availability…";
  timeSelect.innerHTML = "";

  const allSlots = buildAllSlotsForDay(schedule);

  const { data, error } = await supabaseClient
    .from("bookings")
    .select("booking_time")
    .eq("business_id", BUSINESS_ID)
    .eq("booking_date", dateInput.value);

  const takenTimes = error ? [] : data.map(row => row.booking_time.slice(0, 5));
  const availableSlots = allSlots.filter(t => !takenTimes.includes(t));

  if (availableSlots.length === 0) {
    message.textContent = "No times left on that day — please try another date.";
  } else {
    message.textContent = "";
    availableSlots.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = formatTimeLabel(t);
      timeSelect.appendChild(opt);
    });
  }

  updateCheckoutAvailability();
}

function updateCheckoutAvailability() {
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("time-slot");
  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn.disabled = basket.length === 0 || !dateInput.value || !timeSelect.value;
}

async function confirmBooking() {
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("time-slot");
  const date = dateInput.value;
  const time = timeSelect.value;

  if (basket.length === 0 || !date || !time) return;

  const serviceNames = basket.map(i => `${i.qty} x ${i.name}`).join(", ");
  const total = basket.reduce((sum, i) => sum + i.price * i.qty, 0);

  const { error } = await supabaseClient.from("bookings").insert({
    business_id: BUSINESS_ID,
    booking_date: date,
    booking_time: time,
    service_names: serviceNames,
    total_price: total,
  });

  if (error) {
    if (error.code === "23505") {
      alert("Sorry, someone just booked that exact slot. Please pick a different time.");
      refreshSlotsForCurrentDate();
    } else {
      alert("Something went wrong saving the booking — please try again.");
      console.error(error);
    }
    return;
  }

  document.getElementById("confirmation-overlay").classList.remove("hidden");
  basket = [];
  renderBasket();
  document.getElementById("time-slot").innerHTML = "";
  document.getElementById("slot-message").textContent = "";
}

function setupCheckout() {
  const overlay = document.getElementById("confirmation-overlay");
  const closeBtn = document.getElementById("close-overlay");
  document.getElementById("checkout-btn").addEventListener("click", confirmBooking);
  closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));
}

function setupDatePicker() {
  const dateInput = document.getElementById("booking-date");
  const today = new Date();
  dateInput.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  dateInput.addEventListener("change", refreshSlotsForCurrentDate);
}

document.getElementById("time-slot").addEventListener("change", updateCheckoutAvailability);

renderProducts();
renderBasket();
setupDatePicker();
setupCheckout();

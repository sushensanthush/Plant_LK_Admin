import { auth, db, storage } from './firebase-config.js';
import { signOut, onAuthStateChanged }from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {collection, getDocs, addDoc, updateDoc, deleteDoc,doc, query, orderBy, limit, getCountFromServer, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL }from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const savedTheme = localStorage.getItem('plk-theme') || 'light';
if (savedTheme === 'dark') applyDark();

window.toggleTheme = function () {
  if (document.body.classList.contains('dark')) {
    document.body.classList.remove('dark');
    localStorage.setItem('plk-theme', 'light');
    g('theme-btn').innerHTML = '<i class="bi bi-moon-fill"></i> <span>Dark</span>';
  } else {
    applyDark();
  }
};

function applyDark() {
  document.body.classList.add('dark');
  localStorage.setItem('plk-theme', 'dark');
  const btn = g('theme-btn');
  if (btn) btn.innerHTML = '<i class="bi bi-sun-fill"></i> <span>Light</span>';
}


onAuthStateChanged(auth, user => {
  if (!user) { location.href = 'login.html'; return; }
  g('adm-email').textContent = user.email;
  g('adm-av').textContent = user.email[0].toUpperCase();
  loadOverview();
});


let allProducts = [], allCategories = [], allNurseries = [];
let allOrders = [], allMessages = [], allUsers = [];
let curPage = 'overview';
const loaded = {};
let currentMsgEmail = '', currentMsgName = '', currentMsgSubject = '';


window.go = function (page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  g('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  const titles = {
    overview: 'Dashboard|Overview',
    products: 'Products|Manage shop inventory',
    categories: 'Categories|Manage app categories',
    nurseries: 'Nurseries|Manage nursery locations',
    orders: 'Orders|Manage customer orders',
    messages: 'Messages|Contact form messages',
    users: 'Users|Manage registered users',
  };
  const [t, s] = titles[page].split('|');
  g('tb-title').childNodes[0].textContent = t + ' ';
  g('tb-sub').textContent = s;

  const addPages = ['products', 'categories', 'nurseries'];
  g('tb-add').style.display = addPages.includes(page) ? 'flex' : 'none';

  curPage = page;
  if (!loaded[page]) { loaded[page] = true; load(page); }
};

window.refresh = () => { delete loaded[curPage]; load(curPage); };

function load(p) {
  if (p === 'overview') loadOverview();
  if (p === 'products') loadProducts();
  if (p === 'categories') loadCategories();
  if (p === 'nurseries') loadNurseries();
  if (p === 'orders') loadOrders();
  if (p === 'messages') loadMessages();
  if (p === 'users') loadUsers();
}

function reload(p) {
  delete loaded[p]; load(p);
  if (p !== 'overview') { delete loaded['overview']; loadOverview(); }
}


async function loadOverview() {
  try {
    const cols = ['products', 'categories', 'nurseries', 'orders', 'users', 'messages'];
    const counts = await Promise.all(cols.map(c => getCountFromServer(collection(db, c))));
    const [prc, cc, nc, oc, uc, mc] = counts.map(c => c.data().count);
    anim('s-pr', prc); anim('s-c', cc); anim('s-n', nc);
    anim('s-o', oc); anim('s-u', uc);

    g('bdg-products').textContent = prc;
    g('bdg-categories').textContent = cc;
    g('bdg-nurseries').textContent = nc;
    g('bdg-orders').textContent = oc;
    g('bdg-messages').textContent = mc;
    g('bdg-users').textContent = uc;

 
    let oSnap;
    try { oSnap = await getDocs(query(collection(db, 'orders'), orderBy('orderDate', 'desc'), limit(6))); }
    catch { oSnap = await getDocs(collection(db, 'orders')); }
    const ro = g('rec-orders'); ro.innerHTML = '';
    if (oSnap.empty) {
      ro.innerHTML = '<div class="te"><i class="bi bi-bag-x"></i> No orders yet</div>';
    } else {
      oSnap.forEach(d => {
        const o = d.data(), sid = (o.orderId || d.id).slice(-8);
        const sc = o.status === 'DELIVERED' ? 'bop' : o.status === 'CANCELLED' ? 'bcl' : o.status === 'SHIPPED' ? 'bac' : 'bpen';
        ro.innerHTML += `<div class="ri" onclick="go('orders')">
          <div class="rd" style="background:var(--purple)"></div>
          <div class="rin"><strong>#${sid}</strong>
          <span>LKR ${Number(o.totalAmount || 0).toLocaleString()} · ${(o.orderItems || []).length} item(s)</span></div>
          <span class="${sc}">${o.status || 'PENDING'}</span></div>`;
      });
    }

  
    let mSnap;
    try { mSnap = await getDocs(query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(6))); }
    catch { mSnap = await getDocs(collection(db, 'messages')); }
    const rm = g('rec-messages'); rm.innerHTML = '';
    if (mSnap.empty) {
      rm.innerHTML = '<div class="te"><i class="bi bi-envelope-x"></i> No messages yet</div>';
    } else {
      mSnap.forEach(d => {
        const m = d.data();
        rm.innerHTML += `<div class="ri" onclick="go('messages')">
          <div class="rd" style="background:var(--blue)"></div>
          <div class="rin"><strong>${m.name || '—'}</strong><span>${m.subject || ''}</span></div>
          <span style="font-size:11px;color:var(--tu)">${m.email || ''}</span></div>`;
      });
    }
  } catch (e) { toast('Overview error: ' + e.message, 1); }
}


async function loadProducts() {
  setLoading('tb-products', 7);
  try {
    const s = await getDocs(collection(db, 'products'));
    allProducts = [];
    s.forEach(d => allProducts.push({ id: d.id, ...d.data() }));

    
    allProducts.sort((a, b) => {
     
      const getNum = (str) => {
        if (!str) return 0;
     
        return parseInt(str.toString().replace(/\D/g, '')) || 0;
      };

      const numA = getNum(a.productId);
      const numB = getNum(b.productId);

     
      return numB - numA;
    });

    renderProducts(allProducts);
    g('bdg-products').textContent = allProducts.length;
  } catch (e) {
    setErr('tb-products', 7, e.message);
  }
}
function renderProducts(list) {
  const tb = g('tb-products');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="7"><div class="te"><i class="bi bi-box-seam"></i> No products yet.</div></td></tr>`; return; }
  tb.innerHTML = list.map(p => {
    const img = Array.isArray(p.images) && p.images.length ? p.images[0] : '';
    const statusActive = p.status === true || p.status === 'true' || p.status === 'available';
    return `<tr>
      <td><div class="uc">
        <div class="img-thumb">${img ? `<img src="${img}">` : `<i class="bi bi-box-seam"></i>`}</div>
        <div><strong>${p.title || '—'}</strong><div style="font-size:11px;color:var(--tu)">${p.productId || p.id}</div></div>
      </div></td>
      <td>${p.categoryId || p.category || '—'}</td>
      <td><strong>Rs. ${Number(p.price || 0).toLocaleString()}</strong></td>
      <td>${p.stockCount != null ? p.stockCount : '—'}</td>
      <td><i class="bi bi-star-fill" style="color:#f59e0b;font-size:11px"></i> ${p.rating || 0}</td>
      <td><span class="${statusActive ? 'bop' : 'bcl'}">${statusActive ? 'Active' : 'Inactive'}</span></td>
      <td><div class="acts">
        <button class="btn btn-o btn-sm" onclick="editProduct('${p.id}')"><i class="bi bi-pencil"></i> Edit</button>
        <button class="btn btn-d btn-sm" onclick="del('products','${p.id}','${esc(p.title || p.name)}')"><i class="bi bi-trash3"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

window.openAdd = function () {
  if (curPage === 'products') {
    v('m-product-title', 'Add Product'); v('pr-id', '');
    ['pr-title', 'pr-pid', 'pr-price', 'pr-stock', 'pr-rating', 'pr-desc'].forEach(id => v(id, ''));
    g('pr-cat-sel').value = '';
    g('pr-preview').src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAD5UlEQVR4AezWS0gVURwG8D9RVLawQEuFUMNIqZDQooJAFEpIgl62COlBBC4qalELl+GiCCIKhAhSwkB7QRRFUAhFSSVhDyy0VEITFdRFt6Kg7neGe/HZuJj5lPqEOXfumTPnz/mdz6Mz6lrLf+sK32CG6YciIGgKs5mgBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJWZ0kST1jgtygiatA2CFjRJgFRGiRY0SYBURokWNEmAVEaJFjRJgFRGiRZ0yALk6ZVoErigBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJVRogVNEiCVGZloUtH/sYygSbsuaEGTBEhllGhBkwRIZZTofxm6o6XfDhfV2q6lVVZ98kl8qc2PP7s+9N+/8jbeP9mb8d7/HvlpZw89cPNW7LhpQ/3fJjtdoOPoicbC79W8sWMXNllda7lbDIAA8Ki+xS4+22s1zQes/V2fYUPcgEk0E73fcOOD5axJc7VKj6y2W1VNk5gt+CF06B+RXzZ33ixLSU90q1lVkG6vGjptoO+rpS2Zb4lJc21OwizLXJ48In1Ar9x3x/UBFffoc5NEm/Hef/+yJzo+Ytn5KdERZhk5Se4Tm+1uiA0dGmvr+jRoPZ1DuLUvHd6n+zKqGf4MSLuPr3WJvHqm0XCPvuGvtL3ujcJ6R0NPx+DwR/H7gd6IYbPjHaQbOjQSW7I/105suebOzaaH7ZaSMd/Mxq44NcNLfewJYFOiY5F23Mf68YnveYUZdnBdtZu36+OAjX4f4xYsTLDZCTNxS73o0Pi1fXq3zU7d3unOzbyiTAeyIHmedUeTjmMBY3BGY1OGa+AsR1KH+iNjzu+h6B+5lufd7ozH2Z+Vu8gdQ4lJCYYjBPPEjhocTfjOvOjQWOT6zVnxRGOxuRsWO5TC0hyXyD25l9wZjZTiOS4g1597YVvL86y4bKXVnm4cgY1NwR+9WKKz81MN7xdsX2bYAPwnE3sf87EvOjQWCFikDldx2Qp0uWuifjzEs8rr29yGALXicomDxLPYhbkwJy6MRz829uj5je63J/Y++tnXlECzFzkd6gmatAuCFjRJgFRGiRY0SYBURokWNEnAKxN6q0SHTuwVELTnEHor6NCJvQKC9hxCbwUdOrFXQNCeQ+itoEMn9goI2nMIvRV06MReAUF7DqG3gg6d2CvwN2hvhNpABAQdCKP/JIL2NwpkhKADYfSfRND+RoGMEHQgjP6TCNrfKJARgg6E0X8SQfsbBTJC0IEw+k8iaH+jQEZMW+hAVjeNJhE0aTMELWiSAKmMEi1okgCpjBItaJIAqYwSLWiSAKmMEk2C/gMAAP//pon9wAAAAAZJREFUAwDbqA/LG3Je2QAAAABJRU5ErkJggg==';
    const fi = g('pr-file'); if (fi) fi.value = '';
    g('attrs-list').innerHTML = '';
    om('m-product');
  }
  if (curPage === 'categories') {
    v('m-cat-title', 'Add Category'); v('c-id', '');
    ['c-name', 'c-cid', 'c-slug', 'c-desc', 'c-order'].forEach(id => v(id, ''));
    g('c-preview').src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAD5UlEQVR4AezWS0gVURwG8D9RVLawQEuFUMNIqZDQooJAFEpIgl62COlBBC4qalELl+GiCCIKhAhSwkB7QRRFUAhFSSVhDyy0VEITFdRFt6Kg7neGe/HZuJj5lPqEOXfumTPnz/mdz6Mz6lrLf+sK32CG6YciIGgKs5mgBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJWZ0kST1jgtygiatA2CFjRJgFRGiRY0SYBURokWNEmAVEaJFjRJgFRGiRZ0yALk6ZVoErigBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJVRogVNEiCVGZloUtH/sYygSbsuaEGTBEhllGhBkwRIZZTofxm6o6XfDhfV2q6lVVZ98kl8qc2PP7s+9N+/8jbeP9mb8d7/HvlpZw89cPNW7LhpQ/3fJjtdoOPoicbC79W8sWMXNllda7lbDIAA8Ki+xS4+22s1zQes/V2fYUPcgEk0E73fcOOD5axJc7VKj6y2W1VNk5gt+CF06B+RXzZ33ixLSU90q1lVkG6vGjptoO+rpS2Zb4lJc21OwizLXJ48In1Ar9x3x/UBFffoc5NEm/Hef/+yJzo+Ytn5KdERZhk5Se4Tm+1uiA0dGmvr+jRoPZ1DuLUvHd6n+zKqGf4MSLuPr3WJvHqm0XCPvuGvtL3ujcJ6R0NPx+DwR/H7gd6IYbPjHaQbOjQSW7I/105suebOzaaH7ZaSMd/Mxq44NcNLfewJYFOiY5F23Mf68YnveYUZdnBdtZu36+OAjX4f4xYsTLDZCTNxS73o0Pi1fXq3zU7d3unOzbyiTAeyIHmedUeTjmMBY3BGY1OGa+AsR1KH+iNjzu+h6B+5lufd7ozH2Z+Vu8gdQ4lJCYYjBPPEjhocTfjOvOjQWOT6zVnxRGOxuRsWO5TC0hyXyD25l9wZjZTiOS4g1597YVvL86y4bKXVnm4cgY1NwR+9WKKz81MN7xdsX2bYAPwnE3sf87EvOjQWCFikDldx2Qp0uWuifjzEs8rr29yGALXicomDxLPYhbkwJy6MRz829uj5je63J/Y++tnXlECzFzkd6gmatAuCFjRJgFRGiRY0SYBURokWNEnAKxN6q0SHTuwVELTnEHor6NCJvQKC9hxCbwUdOrFXQNCeQ+itoEMn9goI2nMIvRV06MReAUF7DqG3gg6d2CvwN2hvhNpABAQdCKP/JIL2NwpkhKADYfSfRND+RoGMEHQgjP6TCNrfKJARgg6E0X8SQfsbBTJC0IEw+k8iaH+jQEZMW+hAVjeNJhE0aTMELWiSAKmMEi1okgCpjBItaJIAqYwSLWiSAKmMEk2C/gMAAP//pon9wAAAAAZJREFUAwDbqA/LG3Je2QAAAABJRU5ErkJggg==';
    const fi = g('c-file'); if (fi) fi.value = '';
    om('m-category');
  }
  if (curPage === 'nurseries') {
    v('m-nursery-title', 'Add Nursery'); v('n-id', '');
    ['n-name', 'n-addr', 'n-phone', 'n-hours', 'n-lat', 'n-lng'].forEach(id => v(id, ''));
    om('m-nursery');
  }
};


window.editProduct = id => {
  const p = allProducts.find(x => x.id === id); if (!p) return;
  v('m-product-title', 'Edit Product'); v('pr-id', id);
  v('pr-title', p.title || p.name || ''); v('pr-pid', p.productId || '');
  v('pr-price', p.price || ''); v('pr-stock', p.stockCount != null ? p.stockCount : '');
  v('pr-rating', p.rating || ''); v('pr-desc', p.description || '');

 
  const sel = g('pr-cat-sel');
  if (sel) sel.value = p.categoryId || p.category || '';


  const img = Array.isArray(p.images) && p.images.length ? p.images[0] : '';
  g('pr-preview').src = img || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAD5UlEQVR4AezWS0gVURwG8D9RVLawQEuFUMNIqZDQooJAFEpIgl62COlBBC4qalELl+GiCCIKhAhSwkB7QRRFUAhFSSVhDyy0VEITFdRFt6Kg7neGe/HZuJj5lPqEOXfumTPnz/mdz6Mz6lrLf+sK32CG6YciIGgKs5mgBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJWZ0kST1jgtygiatA2CFjRJgFRGiRY0SYBURokWNEmAVEaJFjRJgFRGiRZ0yALk6ZVoErigBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJVRogVNEiCVGZloUtH/sYygSbsuaEGTBEhllGhBkwRIZZTofxm6o6XfDhfV2q6lVVZ98kl8qc2PP7s+9N+/8jbeP9mb8d7/HvlpZw89cPNW7LhpQ/3fJjtdoOPoicbC79W8sWMXNllda7lbDIAA8Ki+xS4+22s1zQes/V2fYUPcgEk0E73fcOOD5axJc7VKj6y2W1VNk5gt+CF06B+RXzZ33ixLSU90q1lVkG6vGjptoO+rpS2Zb4lJc21OwizLXJ48In1Ar9x3x/UBFffoc5NEm/Hef/+yJzo+Ytn5KdERZhk5Se4Tm+1uiA0dGmvr+jRoPZ1DuLUvHd6n+zKqGf4MSLuPr3WJvHqm0XCPvuGvtL3ujcJ6R0NPx+DwR/H7gd6IYbPjHaQbOjQSW7I/105suebOzaaH7ZaSMd/Mxq44NcNLfewJYFOiY5F23Mf68YnveYUZdnBdtZu36+OAjX4f4xYsTLDZCTNxS73o0Pi1fXq3zU7d3unOzbyiTAeyIHmedUeTjmMBY3BGY1OGa+AsR1KH+iNjzu+h6B+5lufd7ozH2Z+Vu8gdQ4lJCYYjBPPEjhocTfjOvOjQWOT6zVnxRGOxuRsWO5TC0hyXyD25l9wZjZTiOS4g1597YVvL86y4bKXVnm4cgY1NwR+9WKKz81MN7xdsX2bYAPwnE3sf87EvOjQWCFikDldx2Qp0uWuifjzEs8rr29yGALXicomDxLPYhbkwJy6MRz829uj5je63J/Y++tnXlECzFzkd6gmatAuCFjRJgFRGiRY0SYBURokWNEnAKxN6q0SHTuwVELTnEHor6NCJvQKC9hxCbwUdOrFXQNCeQ+itoEMn9goI2nMIvRV06MReAUF7DqG3gg6d2CvwN2hvhNpABAQdCKP/JIL2NwpkhKADYfSfRND+RoGMEHQgjP6TCNrfKJARgg6E0X8SQfsbBTJC0IEw+k8iaH+jQEZMW+hAVjeNJhE0aTMELWiSAKmMEi1okgCpjBItaJIAqYwSLWiSAKmMEk2C/gMAAP//pon9wAAAAAZJREFUAwDbqA/LG3Je2QAAAABJRU5ErkJggg==';
  const fi = g('pr-file'); if (fi) fi.value = '';

 
  g('attrs-list').innerHTML = '';
  if (Array.isArray(p.attributes)) {
    p.attributes.forEach(a => addAttrRow(a));
  }
  om('m-product');
};



window.addAttr = () => addAttrRow(null);

function addAttrRow(existing) {
  const idx = Date.now();
  const row = document.createElement('div');
  row.className = 'attr-row'; row.dataset.idx = idx;
  row.innerHTML = `
    <div class="attr-fields">
      <input placeholder="Attribute name (e.g. Size)" class="attr-name" value="${existing?.name || ''}">
      <select class="attr-type">
        <option value="text" ${existing?.type === 'text' ? 'selected' : ''}>Text</option>
        <option value="color" ${existing?.type === 'color' ? 'selected' : ''}>Color</option>
      </select>
      <input class="attr-vals full" placeholder="Values comma-separated (e.g. S,M,L or #ff0000,#00ff00)"
        value="${existing?.values ? existing.values.join(',') : ''}">
    </div>
    <button class="btn-rm-attr" onclick="this.parentElement.remove()"><i class="bi bi-x-circle-fill"></i></button>`;
  g('attrs-list').appendChild(row);
}

function buildAttributes() {
  const rows = g('attrs-list').querySelectorAll('.attr-row');
  const attrs = [];
  rows.forEach(row => {
    const name = row.querySelector('.attr-name').value.trim();
    const type = row.querySelector('.attr-type').value;
    const raw = row.querySelector('.attr-vals').value.trim();
    if (!name || !raw) return;
    attrs.push({ name, type, values: raw.split(',').map(v => v.trim()).filter(Boolean) });
  });
  return attrs;
}

window.saveProduct = async function () {
  const fileInput = document.getElementById('pr-file');
  const files = fileInput.files;
  let imageUrls = [];

  const id = gv('pr-id');
  const title = gv('pr-title').trim();
  const pid = gv('pr-pid').trim();
  const price = parseFloat(gv('pr-price'));

  if (!title) { toast('Product title is required.', 1); return; }
  if (!pid) { toast('Product ID is required.', 1); return; }
  if (isNaN(price)) { toast('Valid price is required.', 1); return; }

  const btn = g('btn-sv-product'); btn.disabled = true; btn.textContent = 'Saving...';

  try {
   
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const sRef = ref(storage, `product-images/${pid}/${Date.now()}_${file.name}`);
        await uploadBytes(sRef, file);
        const url = await getDownloadURL(sRef);
        imageUrls.push(url);
      }
    } else {
      const existingProduct = allProducts.find(x => x.id === id);
      imageUrls = (existingProduct && Array.isArray(existingProduct.images)) ? existingProduct.images : [];
    }

    const catSel = g('pr-cat-sel');
    const catId = catSel ? catSel.value : '';

    const data = {
      title,
      productId: pid,
      categoryId: catId,
      category: catId,
      price,
      stockCount: parseInt(gv('pr-stock')) || 0,
      rating: parseFloat(gv('pr-rating')) || 0,
      description: gv('pr-desc').trim(),
      images: imageUrls, 
      attributes: buildAttributes(),
      status: true,
      updatedAt: serverTimestamp(),
    };

    if (id) {
      await updateDoc(doc(db, 'products', id), data);
      toast('Product updated');
    } else {
      await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
      toast('Product added');
    }

    cm('m-product');
    reload('products');
  } catch (e) {
    toast('Error: ' + e.message, 1);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Product';
  }
};


async function loadCategories() {
  setLoading('tb-categories', 6);


  const fi = g('c-file');
  if (fi && !fi.dataset.hooked) {
    fi.dataset.hooked = '1';
    fi.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => g('c-preview').src = r.result;
      r.readAsDataURL(file);
    });
  }
  
  const pfi = g('pr-file');
  if (pfi && !pfi.dataset.hooked) {
    pfi.dataset.hooked = '1';
    pfi.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => g('pr-preview').src = r.result;
      r.readAsDataURL(file);
    });
  }

  const ufi = g('u-file');
  if (ufi && !ufi.dataset.hooked) {
    ufi.dataset.hooked = '1';
    ufi.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => g('u-preview').src = r.result;
      r.readAsDataURL(file);
    });
  }

  try {
    const s = await getDocs(collection(db, 'categories'));
    allCategories = [];
    s.forEach(d => allCategories.push({ id: d.id, ...d.data() }));
    allCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    renderCategories(allCategories);
    g('bdg-categories').textContent = allCategories.length;

   
    const sel = g('pr-cat-sel');
    if (sel) {
      sel.innerHTML = '<option value="">-- Select Category --</option>'
        + allCategories.map(c => `<option value="${c.categoryId || c.name}">${c.name} (${c.categoryId || ''})</option>`).join('');
    }
  } catch (e) { setErr('tb-categories', 6, e.message); }
}

function renderCategories(list) {
  const tb = g('tb-categories');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="6"><div class="te"><i class="bi bi-tags"></i> No categories yet.</div></td></tr>`; return; }
  tb.innerHTML = list.map(c => `
    <tr>
      <td><div class="img-thumb">${c.imageUrl && c.imageUrl.startsWith('http')
      ? `<img src="${c.imageUrl}">` : `<i class="bi bi-image"></i>`}</div></td>
      <td><strong>${c.name || '—'}</strong></td>
      <td style="font-family:monospace;font-size:12px;color:var(--tu)">${c.categoryId || '—'}</td>
      <td style="font-family:monospace;font-size:12px;color:var(--tu)">${c.slug || '—'}</td>
      <td>${c.sortOrder || 0}</td>
      <td><div class="acts">
        <button class="btn btn-o btn-sm" onclick="editCat('${c.id}')"><i class="bi bi-pencil"></i> Edit</button>
        <button class="btn btn-d btn-sm" onclick="del('categories','${c.id}','${esc(c.name)}')"><i class="bi bi-trash3"></i></button>
      </div></td>
    </tr>`).join('');
}


g('c-name')?.addEventListener('input', e => {
  if (!gv('c-id'))
    v('c-slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
});

window.editCat = id => {
  const c = allCategories.find(x => x.id === id); if (!c) return;
  v('m-cat-title', 'Edit Category'); v('c-id', id);
  v('c-name', c.name || ''); v('c-cid', c.categoryId || '');
  v('c-slug', c.slug || ''); v('c-desc', c.description || '');
  v('c-order', c.sortOrder || 0);
  g('c-preview').src = c.imageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAD5UlEQVR4AezWS0gVURwG8D9RVLawQEuFUMNIqZDQooJAFEpIgl62COlBBC4qalELl+GiCCIKhAhSwkB7QRRFUAhFSSVhDyy0VEITFdRFt6Kg7neGe/HZuJj5lPqEOXfumTPnz/mdz6Mz6lrLf+sK32CG6YciIGgKs5mgBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJWZ0kST1jgtygiatA2CFjRJgFRGiRY0SYBURokWNEmAVEaJFjRJgFRGiRZ0yALk6ZVoErigBU0SIJVRogVNEiCVUaIFTRIglVGiBU0SIJVRogVNEiCVGZloUtH/sYygSbsuaEGTBEhllGhBkwRIZZTofxm6o6XfDhfV2q6lVVZ98kl8qc2PP7s+9N+/8jbeP9mb8d7/HvlpZw89cPNW7LhpQ/3fJjtdoOPoicbC79W8sWMXNllda7lbDIAA8Ki+xS4+22s1zQes/V2fYUPcgEk0E73fcOOD5axJc7VKj6y2W1VNk5gt+CF06B+RXzZ33ixLSU90q1lVkG6vGjptoO+rpS2Zb4lJc21OwizLXJ48In1Ar9x3x/UBFffoc5NEm/Hef/+yJzo+Ytn5KdERZhk5Se4Tm+1uiA0dGmvr+jRoPZ1DuLUvHd6n+zKqGf4MSLuPr3WJvHqm0XCPvuGvtL3ujcJ6R0NPx+DwR/H7gd6IYbPjHaQbOjQSW7I/105suebOzaaH7ZaSMd/Mxq44NcNLfewJYFOiY5F23Mf68YnveYUZdnBdtZu36+OAjX4f4xYsTLDZCTNxS73o0Pi1fXq3zU7d3unOzbyiTAeyIHmedUeTjmMBY3BGY1OGa+AsR1KH+iNjzu+h6B+5lufd7ozH2Z+Vu8gdQ4lJCYYjBPPEjhocTfjOvOjQWOT6zVnxRGOxuRsWO5TC0hyXyD25l9wZjZTiOS4g1597YVvL86y4bKXVnm4cgY1NwR+9WKKz81MN7xdsX2bYAPwnE3sf87EvOjQWCFikDldx2Qp0uWuifjzEs8rr29yGALXicomDxLPYhbkwJy6MRz829uj5je63J/Y++tnXlECzFzkd6gmatAuCFjRJgFRGiRY0SYBURokWNEnAKxN6q0SHTuwVELTnEHor6NCJvQKC9hxCbwUdOrFXQNCeQ+itoEMn9goI2nMIvRV06MReAUF7DqG3gg6d2CvwN2hvhNpABAQdCKP/JIL2NwpkhKADYfSfRND+RoGMEHQgjP6TCNrfKJARgg6E0X8SQfsbBTJC0IEw+k8iaH+jQEZMW+hAVjeNJhE0aTMELWiSAKmMEi1okgCpjBItaJIAqYwSLWiSAKmMEk2C/gMAAP//pon9wAAAAAZJREFUAwDbqA/LG3Je2QAAAABJRU5ErkJggg==';
  const fi = g('c-file'); if (fi) fi.value = '';
  om('m-category');
};

window.saveCat = async function () {
  const id = gv('c-id'), name = gv('c-name').trim();
  if (!name) { toast('Category name is required.', 1); return; }
  const cid = gv('c-cid').trim() || name.toLowerCase().replace(/\s+/g, '_');

  const btn = g('btn-sv-cat'); btn.disabled = true; btn.textContent = 'Saving...';
  const fi = g('c-file');
  let imageUrl = allCategories.find(x => x.id === id)?.imageUrl || '';

  try {
    if (fi?.files?.length) {
      const file = fi.files[0];
      const path = `category-images/${cid}/${Date.now()}_${file.name}`;
      const sRef = ref(storage, path);
      await uploadBytes(sRef, file);
      imageUrl = await getDownloadURL(sRef);
    }

    const data = {
      name, categoryId: cid,
      slug: gv('c-slug').trim() || name.toLowerCase().replace(/\s+/g, '-'),
      description: gv('c-desc').trim(),
      imageUrl: imageUrl || '',
      sortOrder: parseInt(gv('c-order')) || 0,
      updatedAt: serverTimestamp(),
    };

    if (id) {
      await updateDoc(doc(db, 'categories', id), data);
      toast('Category updated');
    } else {
      const docRef = await addDoc(collection(db, 'categories'), { ...data, createdAt: serverTimestamp() });
      if (imageUrl) await updateDoc(doc(db, 'categories', docRef.id), { imageUrl });
      toast('Category added');
    }
    if (fi) fi.value = '';
    cm('m-category'); reload('categories');
  } catch (e) { toast('Error: ' + e.message, 1); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Category'; }
};


async function loadNurseries() {
  setLoading('tb-nurseries', 6);
  try {
    const s = await getDocs(collection(db, 'nurseries'));
    allNurseries = []; s.forEach(d => allNurseries.push({ id: d.id, ...d.data() }));
    renderNurseries(allNurseries);
    g('bdg-nurseries').textContent = allNurseries.length;
  } catch (e) { setErr('tb-nurseries', 6, e.message); }
}

function renderNurseries(list) {
  const tb = g('tb-nurseries');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="6"><div class="te"><i class="bi bi-geo-alt"></i> No nurseries yet.</div></td></tr>`; return; }
  tb.innerHTML = list.map(n => `
    <tr>
      <td><strong>${n.name || '—'}</strong></td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.address || '—'}</td>
      <td>${n.phone || '—'}</td>
      <td><span class="${(n.hours || '').toLowerCase().startsWith('open') ? 'bop' : 'bcl'}">${n.hours || '—'}</span></td>
      <td style="font-size:12px;color:var(--tu)">
        <a href="https://maps.google.com/?q=${n.latitude || 0},${n.longitude || 0}" target="_blank" style="color:var(--blue);text-decoration:none">
          <i class="bi bi-map"></i> ${(n.latitude || 0).toFixed(4)}, ${(n.longitude || 0).toFixed(4)}
        </a>
      </td>
      <td><div class="acts">
        <button class="btn btn-o btn-sm" onclick="editNursery('${n.id}')"><i class="bi bi-pencil"></i> Edit</button>
        <button class="btn btn-d btn-sm" onclick="del('nurseries','${n.id}','${esc(n.name)}')"><i class="bi bi-trash3"></i></button>
      </div></td>
    </tr>`).join('');
}

window.editNursery = id => {
  const n = allNurseries.find(x => x.id === id); if (!n) return;
  v('m-nursery-title', 'Edit Nursery'); v('n-id', id);
  v('n-name', n.name || ''); v('n-addr', n.address || '');
  v('n-phone', n.phone || ''); v('n-hours', n.hours || '');
  v('n-lat', n.latitude || ''); v('n-lng', n.longitude || '');
  om('m-nursery');
};

window.saveNursery = async function () {
  const id = gv('n-id'), name = gv('n-name').trim(), addr = gv('n-addr').trim();
  const lat = parseFloat(gv('n-lat')), lng = parseFloat(gv('n-lng'));
  if (!name || !addr || isNaN(lat) || isNaN(lng)) { toast('Name, address and coordinates are required.', 1); return; }
  const btn = g('btn-sv-nursery'); btn.disabled = true; btn.textContent = 'Saving...';
  const data = {
    name, address: addr, phone: gv('n-phone').trim(), hours: gv('n-hours').trim(),
    latitude: lat, longitude: lng, updatedAt: serverTimestamp()
  };
  try {
    if (id) { await updateDoc(doc(db, 'nurseries', id), data); toast('Nursery updated'); }
    else { await addDoc(collection(db, 'nurseries'), { ...data, createdAt: serverTimestamp() }); toast('Nursery added'); }
    cm('m-nursery'); reload('nurseries');
  } catch (e) { toast('Error: ' + e.message, 1); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Nursery'; }
};


async function loadOrders() {
  setLoading('tb-orders', 7);
  try {
    const s = await getDocs(collection(db, 'orders'));
    allOrders = []; s.forEach(d => { const data = d.data(); if (!data.orderId) data.orderId = d.id; allOrders.push({ id: d.id, ...data }); });
    allOrders.sort((a, b) => { const ta = a.orderDate?.toDate?.() ?? new Date(0); const tb2 = b.orderDate?.toDate?.() ?? new Date(0); return tb2 - ta; });
    renderOrders(allOrders);
    g('bdg-orders').textContent = allOrders.length;
  } catch (e) { setErr('tb-orders', 7, e.message); }
}

function orderBadge(s) {
  const m = { DELIVERED: 'bop', CANCELLED: 'bcl', SHIPPED: 'bac', CONFIRMED: 'bpu', PROCESSING: 'bam', PENDING: 'bpen' };
  return `<span class="${m[s] || 'bgy'}">${s || 'PENDING'}</span>`;
}

function renderOrders(list) {
  const tb = g('tb-orders');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="7"><div class="te"><i class="bi bi-bag-x"></i> No orders yet.</div></td></tr>`; return; }
  tb.innerHTML = list.map(o => {
    const sid = (o.orderId || o.id).slice(-8);
    const date = o.orderDate?.toDate ? o.orderDate.toDate().toLocaleDateString('en-GB') : '—';
    const items = (o.orderItems || []).length;
    return `<tr>
      <td><strong style="font-family:monospace">#${sid}</strong></td>
      <td style="font-size:12px;color:var(--tu);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.userId || '—'}</td>
      <td style="white-space:nowrap">${date}</td>
      <td>${items} item${items === 1 ? '' : 's'}</td>
      <td><strong>Rs. ${Number(o.totalAmount || 0).toLocaleString()}</strong></td>
      <td>${orderBadge(o.status)}</td>
      <td><div class="acts">
        <button class="btn btn-am btn-sm" onclick="editOrder('${o.id}')"><i class="bi bi-pencil"></i> Status</button>
        <button class="btn btn-d btn-sm" onclick="del('orders','${o.id}','order #${sid}')"><i class="bi bi-trash3"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

window.editOrder = id => {
  const o = allOrders.find(x => x.id === id); if (!o) return;
  v('o-id', id);
  v('o-display-id', '#' + (o.orderId || o.id).slice(-8));
  v('o-uid', o.userId || '—');
  v('o-total', 'Rs. ' + Number(o.totalAmount || 0).toLocaleString());
  g('o-status').value = o.status || 'PENDING';
  om('m-order');
};

window.saveOrder = async function () {
  const id = gv('o-id'); if (!id) return;
  const btn = g('btn-sv-order'); btn.disabled = true; btn.textContent = 'Updating...';
  try {
    await updateDoc(doc(db, 'orders', id), { status: gv('o-status'), updatedAt: serverTimestamp() });
    toast('Order status updated'); cm('m-order'); reload('orders');
  } catch (e) { toast('Error: ' + e.message, 1); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Update Status'; }
};


async function loadMessages() {
  setLoading('tb-messages', 6);
  try {
    const s = await getDocs(collection(db, 'messages'));
    allMessages = []; s.forEach(d => allMessages.push({ id: d.id, ...d.data() }));
    allMessages.sort((a, b) => { const ta = a.timestamp?.toDate?.() ?? new Date(0); const tb2 = b.timestamp?.toDate?.() ?? new Date(0); return tb2 - ta; });
    renderMessages(allMessages);
    g('bdg-messages').textContent = allMessages.length;
  } catch (e) { setErr('tb-messages', 6, e.message); }
}

function renderMessages(list) {
  const tb = g('tb-messages');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="6"><div class="te"><i class="bi bi-envelope"></i> No messages yet.</div></td></tr>`; return; }
  tb.innerHTML = list.map(m => {
    const date = m.timestamp?.toDate ? m.timestamp.toDate().toLocaleDateString('en-GB') : '—';
    const snip = (m.message || '').substring(0, 50) + ((m.message || '').length > 50 ? '…' : '');
    return `<tr>
      <td><strong>${m.name || '—'}</strong></td>
      <td style="font-size:12px;color:var(--tu)">${m.email || '—'}</td>
      <td><strong>${m.subject || '—'}</strong></td>
      <td style="max-width:180px;color:var(--tm)">${snip}</td>
      <td style="font-size:12px;color:var(--tu);white-space:nowrap">${date}</td>
      <td><div class="acts">
        <button class="btn btn-blue btn-sm" onclick="viewMessage('${m.id}')"><i class="bi bi-eye"></i> View</button>
        <button class="btn btn-d btn-sm" onclick="del('messages','${m.id}','message from ${esc(m.name)}')"><i class="bi bi-trash3"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

window.viewMessage = id => {
  const m = allMessages.find(x => x.id === id); if (!m) return;
  v('msg-name', m.name || '');
  v('msg-email', m.email || '');
  v('msg-subject', m.subject || '');
  v('msg-date', m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString('en-GB') : '—');
  g('msg-body').textContent = m.message || '';
  currentMsgEmail = m.email || '';
  currentMsgName = m.name || '';
  currentMsgSubject = m.subject || '';
  om('m-message');
};

window.replyEmail = function () {
  if (!currentMsgEmail) { toast('No email address to reply to.', 1); return; }
  const subject = encodeURIComponent('Re: ' + currentMsgSubject);
  const body = encodeURIComponent(`Hi ${currentMsgName},\n\nThank you for contacting Plant.LK\n\n`);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${currentMsgEmail}&su=${subject}&body=${body}`;
  window.open(gmailUrl, '_blank');
};


async function loadUsers() {
  setLoading('tb-users', 6);
  try {
    const s = await getDocs(collection(db, 'users'));
    allUsers = []; s.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
    renderUsers(allUsers);
    g('bdg-users').textContent = allUsers.length;
  } catch (e) { setErr('tb-users', 6, e.message); }
}

function renderUsers(list) {
  const tb = g('tb-users');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="6"><div class="te"><i class="bi bi-people"></i> No users found.</div></td></tr>`; return; }
  tb.innerHTML = list.map(u => {
    const displayName = u.name || u.displayName || 'User';
    const init = displayName[0].toUpperCase();
const joined = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('en-GB')
      : (u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') 
      : (u.updatedAt?.toDate ? u.updatedAt.toDate().toLocaleDateString('en-GB') : '—'));
    const roleBadge = u.role === 'admin' ? '<span class="bpu">Admin</span>'
      : u.role === 'moderator' ? '<span class="bam">Moderator</span>' : '<span class="bac">User</span>';
    const stBadge = u.status === 'suspended' ? '<span class="bcl">Suspended</span>' : '<span class="bop">Active</span>';
    return `<tr>
      <td><div class="uc">
        ${u.profilePicUrl
        ? `<img src="${u.profilePicUrl}" class="uav">`
        : `<div class="ua">${init}</div>`}
        <div><strong>${displayName}</strong>
        <div style="font-size:11px;color:var(--tu)">${u.uid || u.id}</div></div>
      </div></td>
      <td>${u.email || '—'}</td>
      <td>${roleBadge}</td>
      <td>${joined}</td>
      <td>${stBadge}</td>
      <td><div class="acts">
        <button class="btn btn-am btn-sm" onclick="editUser('${u.id}')"><i class="bi bi-pencil"></i> Edit</button>
        <button class="btn btn-d btn-sm" onclick="del('users','${u.id}','${esc(u.email || u.id)}')"><i class="bi bi-trash3"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

window.editUser = id => {
  const u = allUsers.find(x => x.id === id); if (!u) return;
  v('u-id', id);
  v('u-name', u.name || u.displayName || '');
  v('u-email', u.email || '');
  g('u-role').value = u.role || 'user';
  g('u-status').value = u.status || 'active';
  g('u-preview').src = u.profilePicUrl || 'https://placehold.net/avatar-5.svg';
  const fi = g('u-file'); if (fi) fi.value = '';
  om('m-user');
};

window.saveUser = async function () {
  const id = gv('u-id'); if (!id) return;
  const btn = g('btn-sv-user'); btn.disabled = true; btn.textContent = 'Saving...';
  try {
    let profilePicUrl = allUsers.find(x => x.id === id)?.profilePicUrl || '';
    const fi = g('u-file');
    if (fi?.files?.length) {
      const file = fi.files[0];
      const sRef = ref(storage, `profile-images/${id}/${Date.now()}_${file.name}`);
      await uploadBytes(sRef, file);
      profilePicUrl = await getDownloadURL(sRef);
    }
    const data = {
      name: gv('u-name').trim(), displayName: gv('u-name').trim(),
      role: gv('u-role'), status: gv('u-status'),
      profilePicUrl, updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'users', id), data);
    toast('User updated'); cm('m-user'); reload('users');
  } catch (e) { toast('Error: ' + e.message, 1); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Changes'; }
};


window.ft = function (type, query) {
  const q = query.toLowerCase().trim();
  const flt = (arr, keys) => arr.filter(x => keys.some(k => (String(x[k] || '')).toLowerCase().includes(q)));
  if (type === 'products') renderProducts(q ? flt(allProducts, ['title', 'name', 'productId', 'categoryId']) : allProducts);
  if (type === 'categories') renderCategories(q ? flt(allCategories, ['name', 'categoryId', 'slug']) : allCategories);
  if (type === 'nurseries') renderNurseries(q ? flt(allNurseries, ['name', 'address', 'phone']) : allNurseries);
  if (type === 'orders') renderOrders(q ? flt(allOrders, ['orderId', 'userId', 'status']) : allOrders);
  if (type === 'messages') renderMessages(q ? flt(allMessages, ['name', 'email', 'subject', 'message']) : allMessages);
  if (type === 'users') renderUsers(q ? flt(allUsers, ['name', 'displayName', 'email', 'role']) : allUsers);
};


window.del = function (colName, id, name) {
  g('del-msg').textContent = `Delete "${name}"? This cannot be undone.`;
  const btn = g('btn-del');
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Deleting...';
    try {
      await deleteDoc(doc(db, colName, id));
      toast('Deleted successfully', 'ok'); cm('m-delete'); reload(colName);
    } catch (e) { toast('Delete failed: ' + e.message, 1); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-trash3"></i> Yes, Delete'; }
  };
  om('m-delete');
};


window.doLogout = async () => { await signOut(auth); location.href = 'login.html'; };


function om(id) { g(id).classList.add('show'); }
window.cm = id => g(id).classList.remove('show');
document.querySelectorAll('.mo').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); }));


function g(id) { return document.getElementById(id); }
function gv(id) { return (g(id) || {}).value || ''; }
function v(id, val) { const el = g(id); if (el) el.value = val; }
function esc(s) { return (s || '').replace(/'/g, "\\'"); }

function setLoading(id, cols) {
  g(id).innerHTML = `<tr class="lr"><td colspan="${cols}"><div class="dl"><span></span><span></span><span></span></div></td></tr>`;
}
function setErr(id, cols, msg) {
  g(id).innerHTML = `<tr><td colspan="${cols}" class="te"><i class="bi bi-exclamation-triangle"></i> ${msg}</td></tr>`;
}
function anim(id, target) {
  const el = g(id); if (!el) return;
  let cur = 0; const step = Math.max(1, Math.floor(target / 30));
  const t = setInterval(() => { cur = Math.min(cur + step, target); el.textContent = cur; if (cur >= target) clearInterval(t); }, 40);
}
function toast(msg, type = 0) {
  const t = document.createElement('div');
  const icon = type === 1 ? 'bi-exclamation-circle' : 'bi-check-circle-fill';
  t.className = 'toast' + (type === 1 ? ' err' : ' ok');
  t.innerHTML = `<i class="bi ${icon}"></i> ${msg}`;
  g('tc').appendChild(t);
  setTimeout(() => t.remove(), 3400);
}


(async () => {
  try {
    const s = await getDocs(collection(db, 'categories'));
    allCategories = [];
    s.forEach(d => allCategories.push({ id: d.id, ...d.data() }));
    allCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const sel = g('pr-cat-sel');
    if (sel) {
      sel.innerHTML = '<option value="">-- Select Category --</option>'
        + allCategories.map(c => `<option value="${c.categoryId || c.name}">${c.name} (${c.categoryId || ''})</option>`).join('');
    }
  } catch (e) { /* silent */ }
})();